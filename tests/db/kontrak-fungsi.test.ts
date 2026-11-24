import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, buatOrangLuar, klienAnon } from './helpers';

let editor: SupabaseClient;
const acara: Record<string, string> = {};
const kategori: Record<string, string> = {};
const ID_HILANG = '00000000-0000-0000-0000-000000000000';

async function bersihkan() {
  const { data: vendor } = await admin.from('vendor').select('id').like('nama', 'Uji %');
  const ids = (vendor ?? []).map((v) => v.id);
  if (ids.length) {
    const { data: kontrak } = await admin.from('kontrak').select('id').in('vendor_id', ids);
    const kids = (kontrak ?? []).map((k) => k.id);
    if (kids.length) await admin.from('pembayaran').delete().in('kontrak_id', kids);
  }
  const { error } = await admin.from('vendor').delete().like('nama', 'Uji %');
  if (error) throw error;
}

beforeAll(async () => {
  editor = await buatEditorTest('kontrak-fungsi-db@test.local');
  await bersihkan();
  const { data: a, error: ea } = await editor.from('acara').select('id, nama');
  if (ea) throw ea;
  for (const r of a ?? []) acara[r.nama] = r.id;
  const { data: k, error: ek } = await editor.from('kategori_vendor').select('id, nama');
  if (ek) throw ek;
  for (const r of k ?? []) kategori[r.nama] = r.id;
});

afterAll(async () => {
  try {
    await bersihkan();
  } finally {
    await bersihkanTest();
  }
});

async function buatVendor(
  nama: string,
  acaraNama: string[],
  status: 'kandidat' | 'survei_nego' = 'survei_nego',
): Promise<string> {
  const { data, error } = await editor
    .from('vendor')
    .insert({ nama: `Uji ${nama}`, kategori_vendor_id: kategori['Venue'], status })
    .select('id')
    .single();
  if (error) throw error;
  const { error: e2 } = await editor
    .from('vendor_acara')
    .insert(acaraNama.map((n) => ({ vendor_id: data.id, acara_id: acara[n] })));
  if (e2) throw e2;
  return data.id;
}

async function buatPaket(vendorId: string, nama: string, harga = 8500000): Promise<string> {
  const { data, error } = await editor
    .from('paket')
    .insert({ vendor_id: vendorId, nama: `Uji ${nama}`, harga })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function kontrakId(vendorId: string): Promise<string> {
  const { data, error } = await editor.from('kontrak').select('id').eq('vendor_id', vendorId).single();
  if (error) throw error;
  return data.id;
}

async function total(vendorId: string): Promise<number> {
  const { data, error } = await editor.from('ringkasan_kontrak').select('total').eq('vendor_id', vendorId).single();
  if (error) throw error;
  return Number(data.total);
}

async function alokasiDari(kid: string): Promise<Record<string, number>> {
  const { data, error } = await editor.from('alokasi_acara').select('acara_id, nominal').eq('kontrak_id', kid);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.acara_id, Number(r.nominal)]));
}

async function jumlahKontrak(vendorId: string): Promise<number> {
  const { count, error } = await editor
    .from('kontrak')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendorId);
  if (error) throw error;
  return count ?? 0;
}

describe('simpan_kontrak', () => {
  test('membuat kontrak dan alokasi sekaligus', async () => {
    const v = await buatVendor('Manual Satu', ['Lamaran', 'Resepsi']);
    const { data: kid, error } = await editor.rpc('simpan_kontrak', {
      p_vendor_id: v,
      p_data: { tanggal_kesepakatan: '2026-12-01', catatan: 'Kesepakatan lisan' },
      p_alokasi: [
        { acara_id: acara['Lamaran'], nominal: 2000000 },
        { acara_id: acara['Resepsi'], nominal: 6000000 },
      ],
    });
    expect(error).toBeNull();
    expect(kid).toBe(await kontrakId(v));
    const { data: k } = await editor
      .from('kontrak')
      .select('paket_id, tanggal_kesepakatan, catatan')
      .eq('id', kid!)
      .single();
    expect(k).toEqual({ paket_id: null, tanggal_kesepakatan: '2026-12-01', catatan: 'Kesepakatan lisan' });
    expect(await total(v)).toBe(8000000);
  });

  test('vendor survei_nego jadi booked, kandidat ditolak', async () => {
    const v = await buatVendor('Status Manual', ['Resepsi']);
    const args = (id: string) => ({
      p_vendor_id: id,
      p_data: {},
      p_alokasi: [{ acara_id: acara['Resepsi'], nominal: 100 }],
    });
    expect((await editor.rpc('simpan_kontrak', args(v))).error).toBeNull();
    const { data } = await editor.from('vendor').select('status').eq('id', v).single();
    expect(data?.status).toBe('booked');

    const k = await buatVendor('Status Kandidat', ['Resepsi'], 'kandidat');
    const { error } = await editor.rpc('simpan_kontrak', args(k));
    expect(error?.message).toContain('status_vendor_tidak_sesuai');
    expect(await jumlahKontrak(k)).toBe(0);
    const { data: d2 } = await editor.from('vendor').select('status').eq('id', k).single();
    expect(d2?.status).toBe('kandidat');
  });

  test('tanggal dan catatan boleh kosong', async () => {
    const v = await buatVendor('Manual Kosong', ['Resepsi']);
    const { error } = await editor.rpc('simpan_kontrak', {
      p_vendor_id: v,
      p_data: {},
      p_alokasi: [{ acara_id: acara['Resepsi'], nominal: 100 }],
    });
    expect(error).toBeNull();
  });

  test('ditolak kalau vendor sudah punya kontrak, tanpa efek samping', async () => {
    const v = await buatVendor('Manual Ganda', ['Resepsi']);
    const p = await buatPaket(v, 'Ganda', 5000000);
    await editor.rpc('pilih_paket', { p_paket_id: p });
    const { error } = await editor.rpc('simpan_kontrak', {
      p_vendor_id: v,
      p_data: {},
      p_alokasi: [{ acara_id: acara['Resepsi'], nominal: 1 }],
    });
    expect(error?.message).toContain('kontrak_sudah_ada');
    expect(await total(v)).toBe(5000000);
  });

  test('vendor tidak ada ditolak', async () => {
    const { error } = await editor.rpc('simpan_kontrak', {
      p_vendor_id: ID_HILANG,
      p_data: {},
      p_alokasi: [{ acara_id: acara['Resepsi'], nominal: 1 }],
    });
    expect(error?.message).toContain('vendor_tidak_ditemukan');
  });

  test('alokasi tidak valid ditolak dan tidak membuat kontrak', async () => {
    const v = await buatVendor('Manual Salah', ['Lamaran']);
    const L = acara['Lamaran'];
    const kasus: unknown[] = [
      [],
      [
        { acara_id: L, nominal: 1 },
        { acara_id: L, nominal: 2 },
      ],
      [{ acara_id: L, nominal: -1 }],
      [{ acara_id: L, nominal: 1.5 }],
      [{ acara_id: L, nominal: '100' }],
      [{ nominal: 5 }],
      [{ acara_id: 'bukan-uuid', nominal: 5 }],
      { acara_id: L, nominal: 1 },
    ];
    for (const k of kasus) {
      const { error } = await editor.rpc('simpan_kontrak', { p_vendor_id: v, p_data: {}, p_alokasi: k });
      expect(error?.message, JSON.stringify(k)).toMatch(/alokasi_tidak_valid|alokasi_wajib/);
    }
    const { error: eLuar } = await editor.rpc('simpan_kontrak', {
      p_vendor_id: v,
      p_data: {},
      p_alokasi: [{ acara_id: acara['Resepsi'], nominal: 1 }],
    });
    expect(eLuar?.message).toContain('acara_bukan_milik_vendor');
    expect(await jumlahKontrak(v)).toBe(0);
  });

  test('anon dan orang luar tidak bisa memanggil', async () => {
    const v = await buatVendor('Akses Manual', ['Resepsi']);
    const args = {
      p_vendor_id: v,
      p_data: {},
      p_alokasi: [{ acara_id: acara['Resepsi'], nominal: 1 }],
    };
    expect((await klienAnon.rpc('simpan_kontrak', args)).error).not.toBeNull();
    const luar = await buatOrangLuar('kontrak-fungsi-luar@test.local');
    expect((await luar.rpc('simpan_kontrak', args)).error).not.toBeNull();
    expect(await jumlahKontrak(v)).toBe(0);
  });
});

describe('simpan_alokasi', () => {
  test('mengganti semua alokasi dalam satu transaksi', async () => {
    const v = await buatVendor('Ganti Alokasi', ['Lamaran', 'Resepsi']);
    const p = await buatPaket(v, 'Ganti', 9000000);
    await editor.rpc('pilih_paket', {
      p_paket_id: p,
      p_alokasi: [
        { acara_id: acara['Lamaran'], nominal: 3000000 },
        { acara_id: acara['Resepsi'], nominal: 6000000 },
      ],
    });
    const kid = await kontrakId(v);
    const { error } = await editor.rpc('simpan_alokasi', {
      p_kontrak_id: kid,
      p_alokasi: [{ acara_id: acara['Resepsi'], nominal: 7500000 }],
    });
    expect(error).toBeNull();
    expect(await alokasiDari(kid)).toEqual({ [acara['Resepsi']]: 7500000 });
    expect(await total(v)).toBe(7500000);
  });

  test('audit kontrak maju dan dicatat atas editor pemanggil', async () => {
    const v = await buatVendor('Audit Alokasi', ['Resepsi']);
    const p = await buatPaket(v, 'Audit', 100);
    await editor.rpc('pilih_paket', { p_paket_id: p });
    const kid = await kontrakId(v);
    const { error: e0 } = await admin
      .from('kontrak')
      .update({ diubah_pada: '2020-01-01T00:00:00Z', diubah_oleh: null })
      .eq('id', kid);
    expect(e0).toBeNull();
    const { error } = await editor.rpc('simpan_alokasi', {
      p_kontrak_id: kid,
      p_alokasi: [{ acara_id: acara['Resepsi'], nominal: 250 }],
    });
    expect(error).toBeNull();
    const { data } = await editor.from('kontrak').select('diubah_pada, diubah_oleh').eq('id', kid).single();
    expect(new Date(data!.diubah_pada).getTime()).toBeGreaterThan(Date.parse('2021-01-01'));
    const { data: ed } = await editor.from('editor').select('id').eq('email', 'kontrak-fungsi-db@test.local').single();
    expect(data!.diubah_oleh).toBe(ed!.id);
  });

  test('tidak valid atau kontrak tidak ada: tidak ada yang berubah', async () => {
    const v = await buatVendor('Alokasi Gagal', ['Lamaran']);
    const p = await buatPaket(v, 'Gagal', 4000000);
    await editor.rpc('pilih_paket', { p_paket_id: p });
    const kid = await kontrakId(v);
    const L = acara['Lamaran'];
    for (const k of [[], [{ acara_id: L, nominal: -5 }], [{ acara_id: acara['Resepsi'], nominal: 5 }]]) {
      const { error } = await editor.rpc('simpan_alokasi', { p_kontrak_id: kid, p_alokasi: k });
      expect(error, JSON.stringify(k)).not.toBeNull();
    }
    expect(await alokasiDari(kid)).toEqual({ [L]: 4000000 });
    const { error } = await editor.rpc('simpan_alokasi', {
      p_kontrak_id: ID_HILANG,
      p_alokasi: [{ acara_id: L, nominal: 1 }],
    });
    expect(error?.message).toContain('kontrak_tidak_ditemukan');
  });

  test('anon dan orang luar tidak bisa memanggil', async () => {
    const v = await buatVendor('Akses Alokasi', ['Resepsi']);
    const p = await buatPaket(v, 'Akses', 100);
    await editor.rpc('pilih_paket', { p_paket_id: p });
    const kid = await kontrakId(v);
    const args = { p_kontrak_id: kid, p_alokasi: [{ acara_id: acara['Resepsi'], nominal: 999 }] };
    expect((await klienAnon.rpc('simpan_alokasi', args)).error).not.toBeNull();
    const luar = await buatOrangLuar('kontrak-fungsi-luar@test.local');
    expect((await luar.rpc('simpan_alokasi', args)).error).not.toBeNull();
    expect(await alokasiDari(kid)).toEqual({ [acara['Resepsi']]: 100 });
  });
});

describe('tambah_lampiran dan hapus_lampiran', () => {
  async function siapKontrak(nama: string) {
    const v = await buatVendor(nama, ['Resepsi']);
    const p = await buatPaket(v, nama);
    await editor.rpc('pilih_paket', { p_paket_id: p });
    const kid = await kontrakId(v);
    const { data, error } = await editor
      .from('pembayaran')
      .insert({ kontrak_id: kid, jenis: 'dp', nominal: 1000, status: 'terjadwal', jatuh_tempo: '2026-12-01' })
      .select('id')
      .single();
    if (error) throw error;
    return { p, kid, bid: data.id };
  }

  async function baca(tabel: 'paket' | 'kontrak' | 'pembayaran', id: string): Promise<string[]> {
    const kolom = tabel === 'pembayaran' ? 'bukti' : 'lampiran';
    const { data, error } = await editor.from(tabel).select(kolom).eq('id', id).single();
    if (error) throw error;
    return (data as unknown as Record<string, string[]>)[kolom];
  }

  test('tiap tabel menulis ke kolomnya, tambah dua kali tidak menggandakan', async () => {
    const { p, kid, bid } = await siapKontrak('Lampiran Peta');
    const kasus = [
      ['paket', p],
      ['kontrak', kid],
      ['pembayaran', bid],
    ] as const;
    for (const [tabel, id] of kasus) {
      const path = `${tabel}/${id}/1-a.png`;
      expect((await editor.rpc('tambah_lampiran', { p_tabel: tabel, p_id: id, p_path: path })).error).toBeNull();
      expect((await editor.rpc('tambah_lampiran', { p_tabel: tabel, p_id: id, p_path: path })).error).toBeNull();
      expect(await baca(tabel, id)).toEqual([path]);
      expect((await editor.rpc('hapus_lampiran', { p_tabel: tabel, p_id: id, p_path: path })).error).toBeNull();
      expect(await baca(tabel, id)).toEqual([]);
    }
  });

  test('tambah paralel tidak saling menimpa', async () => {
    const { kid } = await siapKontrak('Lampiran Paralel');
    const paths = ['1-a.png', '2-b.png', '3-c.png'].map((n) => `kontrak/${kid}/${n}`);
    const hasil = await Promise.all(
      paths.map((p) => editor.rpc('tambah_lampiran', { p_tabel: 'kontrak', p_id: kid, p_path: p })),
    );
    for (const h of hasil) expect(h.error).toBeNull();
    expect((await baca('kontrak', kid)).sort()).toEqual(paths);
  });

  test('tabel di luar peta, baris tidak ada, dan path tidak ada ditolak', async () => {
    const { kid } = await siapKontrak('Lampiran Salah');
    for (const tabel of ['vendor', 'kontrak; drop table kontrak', '', 'Kontrak']) {
      const a = await editor.rpc('tambah_lampiran', { p_tabel: tabel, p_id: kid, p_path: 'x/1.png' });
      expect(a.error?.message, tabel).toContain('tabel_tidak_valid');
      const b = await editor.rpc('hapus_lampiran', { p_tabel: tabel, p_id: kid, p_path: 'x/1.png' });
      expect(b.error?.message, tabel).toContain('tabel_tidak_valid');
    }
    const path = `kontrak/${ID_HILANG}/1.png`;
    const c = await editor.rpc('tambah_lampiran', { p_tabel: 'kontrak', p_id: ID_HILANG, p_path: path });
    expect(c.error).not.toBeNull();
    const d = await editor.rpc('hapus_lampiran', { p_tabel: 'kontrak', p_id: ID_HILANG, p_path: path });
    expect(d.error).not.toBeNull();
    const e = await editor.rpc('hapus_lampiran', {
      p_tabel: 'kontrak',
      p_id: kid,
      p_path: `kontrak/${kid}/tidak-ada.png`,
    });
    expect(e.error).not.toBeNull();
  });

  test('orang luar dan anon ditolak', async () => {
    const { kid } = await siapKontrak('Lampiran Akses');
    const args = { p_tabel: 'kontrak', p_id: kid, p_path: `kontrak/${kid}/1-a.png` };
    expect((await klienAnon.rpc('tambah_lampiran', args)).error).not.toBeNull();
    const luar = await buatOrangLuar('kontrak-fungsi-luar@test.local');
    expect((await luar.rpc('tambah_lampiran', args)).error).not.toBeNull();
    expect(await baca('kontrak', kid)).toEqual([]);
  });
});
