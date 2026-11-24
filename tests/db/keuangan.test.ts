import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, buatOrangLuar, klienAnon } from './helpers';

let editor: SupabaseClient;
const acara: Record<string, string> = {};
const pihak: Record<string, string> = {};
const kategori: Record<string, string> = {};

// Vendor dengan Pembayaran dibayar tidak bisa dihapus, jadi Pembayarannya dihapus dulu.
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
  editor = await buatEditorTest('keuangan-db@test.local');
  await bersihkan();
  const { data: a, error: ea } = await editor.from('acara').select('id, nama');
  if (ea) throw ea;
  for (const r of a ?? []) acara[r.nama] = r.id;
  const { data: p, error: ep } = await editor.from('pihak').select('id, nama');
  if (ep) throw ep;
  for (const r of p ?? []) pihak[r.nama] = r.id;
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

async function buatVendor(nama: string, kat: string, acaraNama: string[]): Promise<string> {
  const { data, error } = await editor
    .from('vendor')
    .insert({ nama: `Uji ${nama}`, kategori_vendor_id: kategori[kat] })
    .select('id')
    .single();
  if (error) throw error;
  if (acaraNama.length) {
    const { error: e2 } = await editor
      .from('vendor_acara')
      .insert(acaraNama.map((n) => ({ vendor_id: data.id, acara_id: acara[n] })));
    if (e2) throw e2;
  }
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

async function statusPaket(id: string): Promise<string> {
  const { data, error } = await editor.from('paket').select('status').eq('id', id).single();
  if (error) throw error;
  return data.status;
}

async function statusVendor(id: string): Promise<string> {
  const { data, error } = await editor.from('vendor').select('status').eq('id', id).single();
  if (error) throw error;
  return data.status;
}

async function ringkasan(vendorId: string) {
  const { data, error } = await editor
    .from('ringkasan_kontrak')
    .select('*')
    .eq('vendor_id', vendorId)
    .single();
  if (error) throw error;
  return data;
}

async function kontrakId(vendorId: string): Promise<string> {
  const { data, error } = await editor.from('kontrak').select('id').eq('vendor_id', vendorId).single();
  if (error) throw error;
  return data.id;
}

async function totalKontribusi(): Promise<Record<string, number>> {
  const { data, error } = await editor.from('kontribusi_pihak').select('nama, total');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.nama, Number(r.total)]));
}

describe('pilih_paket', () => {
  test('vendor satu acara: alokasi otomatis senilai harga paket', async () => {
    const v = await buatVendor('Satu Acara', 'Venue', ['Resepsi']);
    const p = await buatPaket(v, 'Satu');
    const { data: kid, error } = await editor.rpc('pilih_paket', { p_paket_id: p });
    expect(error).toBeNull();
    expect(kid).toBe(await kontrakId(v));
    const r = await ringkasan(v);
    expect(Number(r.total)).toBe(8500000);
    expect(await statusVendor(v)).toBe('booked');
    expect(await statusPaket(p)).toBe('dipilih');
  });

  test('vendor dua acara tanpa alokasi ditolak', async () => {
    const v = await buatVendor('Dua Acara Tanpa', 'Venue', ['Lamaran', 'Resepsi']);
    const p = await buatPaket(v, 'Dua Tanpa');
    const { error } = await editor.rpc('pilih_paket', { p_paket_id: p });
    expect(error?.message).toContain('alokasi_wajib');
    expect(await statusPaket(p)).toBe('aktif');
    expect(await statusVendor(v)).toBe('kandidat');
  });

  test('vendor dua acara dengan alokasi: total = jumlah alokasi', async () => {
    const v = await buatVendor('Dua Acara Alokasi', 'Venue', ['Lamaran', 'Resepsi']);
    const p = await buatPaket(v, 'Dua Alokasi', 11000000);
    const { error } = await editor.rpc('pilih_paket', {
      p_paket_id: p,
      p_alokasi: [
        { acara_id: acara['Lamaran'], nominal: 3000000 },
        { acara_id: acara['Resepsi'], nominal: 8000000 },
      ],
    });
    expect(error).toBeNull();
    expect(Number((await ringkasan(v)).total)).toBe(11000000);
  });

  test('paket lain di kategori dan acara yang sama jadi tidak_dipilih', async () => {
    const a = await buatVendor('Foto A', 'Foto & Video', ['Lamaran']);
    const b = await buatVendor('Foto B', 'Foto & Video', ['Lamaran', 'Resepsi']);
    const pa2 = await buatPaket(a, 'A dua');
    const pa = await buatPaket(a, 'A satu');
    const pb = await buatPaket(b, 'B satu');
    const { error } = await editor.rpc('pilih_paket', { p_paket_id: pa });
    expect(error).toBeNull();
    expect(await statusPaket(pa)).toBe('dipilih');
    expect(await statusPaket(pa2)).toBe('tidak_dipilih');
    expect(await statusPaket(pb)).toBe('tidak_dipilih');
    expect(await statusVendor(b)).toBe('kandidat');
  });

  test('paket vendor sekategori untuk acara lain tetap aktif', async () => {
    const a = await buatVendor('Foto A2', 'Foto & Video', ['Lamaran']);
    const c = await buatVendor('Foto C', 'Foto & Video', ['Resepsi']);
    const pa = await buatPaket(a, 'A');
    const pc = await buatPaket(c, 'C');
    const { error } = await editor.rpc('pilih_paket', { p_paket_id: pa });
    expect(error).toBeNull();
    expect(await statusPaket(pc)).toBe('aktif');
  });

  test('paket vendor kategori lain di acara yang sama tidak tersentuh', async () => {
    const f = await buatVendor('Foto Kat', 'Foto & Video', ['Resepsi']);
    const k = await buatVendor('Katering Kat', 'Katering', ['Resepsi']);
    const pf = await buatPaket(f, 'F');
    const pk = await buatPaket(k, 'K');
    await editor.rpc('pilih_paket', { p_paket_id: pf });
    expect(await statusPaket(pk)).toBe('aktif');
  });

  test('paket yang sudah dipilih vendor lain tidak diubah', async () => {
    const x = await buatVendor('Dekor X', 'Dekorasi', ['Akad']);
    const y = await buatVendor('Dekor Y', 'Dekorasi', ['Akad']);
    const px = await buatPaket(x, 'X');
    const py = await buatPaket(y, 'Y');
    // py ditandai dipilih lewat admin untuk meniru data yang sudah ada.
    const { error: eAdm } = await admin.from('paket').update({ status: 'dipilih' }).eq('id', py);
    expect(eAdm).toBeNull();
    expect((await editor.rpc('pilih_paket', { p_paket_id: px })).error).toBeNull();
    expect(await statusPaket(py)).toBe('dipilih');
    expect(await statusPaket(px)).toBe('dipilih');
  });

  test('alokasi ke acara di luar vendor_acara ditolak', async () => {
    const v = await buatVendor('Luar Acara', 'Venue', ['Lamaran']);
    const p = await buatPaket(v, 'Luar');
    const { error } = await editor.rpc('pilih_paket', {
      p_paket_id: p,
      p_alokasi: [{ acara_id: acara['Resepsi'], nominal: 1000000 }],
    });
    expect(error?.message).toContain('acara_bukan_milik_vendor');
    expect(await statusPaket(p)).toBe('aktif');
  });

  test('trigger alokasi_acara menolak insert langsung di luar vendor_acara', async () => {
    const v = await buatVendor('Trigger Luar', 'Venue', ['Lamaran']);
    const p = await buatPaket(v, 'Trigger');
    await editor.rpc('pilih_paket', { p_paket_id: p });
    const { error } = await editor
      .from('alokasi_acara')
      .insert({ kontrak_id: await kontrakId(v), acara_id: acara['Resepsi'], nominal: 1 });
    expect(error?.message).toContain('acara_bukan_milik_vendor');
  });

  test('alokasi tidak valid ditolak', async () => {
    const v = await buatVendor('Alokasi Salah', 'Venue', ['Lamaran', 'Resepsi']);
    const p = await buatPaket(v, 'Salah');
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
      [{ acara_id: L }],
      [{ nominal: 5 }],
      [{ acara_id: 'bukan-uuid', nominal: 5 }],
      { acara_id: L, nominal: 1 },
    ];
    for (const k of kasus) {
      const { error } = await editor.rpc('pilih_paket', { p_paket_id: p, p_alokasi: k });
      expect(error?.message, JSON.stringify(k)).toMatch(/alokasi_tidak_valid|alokasi_wajib/);
    }
    expect(await statusPaket(p)).toBe('aktif');
  });

  test('subset acara vendor diizinkan, nominal 0 diizinkan', async () => {
    const v = await buatVendor('Subset', 'Venue', ['Lamaran', 'Resepsi']);
    const p = await buatPaket(v, 'Subset');
    const { error } = await editor.rpc('pilih_paket', {
      p_paket_id: p,
      p_alokasi: [{ acara_id: acara['Lamaran'], nominal: 0 }],
    });
    expect(error).toBeNull();
    expect(Number((await ringkasan(v)).total)).toBe(0);
  });

  test('paket tidak ada ditolak', async () => {
    const { error } = await editor.rpc('pilih_paket', {
      p_paket_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(error?.message).toContain('paket_tidak_ditemukan');
  });

  test('pilih ulang paket lain: ganti paket_id dan alokasi, pembayaran tetap', async () => {
    const v = await buatVendor('Pilih Ulang', 'Venue', ['Resepsi']);
    const p1 = await buatPaket(v, 'Ulang 1', 5000000);
    const p2 = await buatPaket(v, 'Ulang 2', 7000000);
    await editor.rpc('pilih_paket', { p_paket_id: p1 });
    const kid = await kontrakId(v);
    const { error: eb } = await editor.from('pembayaran').insert({
      kontrak_id: kid,
      jenis: 'dp',
      nominal: 1000000,
      status: 'dibayar',
      tanggal_bayar: '2026-06-01',
      pihak_id: pihak['Rendy'],
    });
    expect(eb).toBeNull();
    const { data: kid2, error } = await editor.rpc('pilih_paket', { p_paket_id: p2 });
    expect(error).toBeNull();
    expect(kid2).toBe(kid);
    expect(await statusPaket(p1)).toBe('tidak_dipilih');
    expect(await statusPaket(p2)).toBe('dipilih');
    const { data: k } = await editor.from('kontrak').select('paket_id').eq('id', kid).single();
    expect(k?.paket_id).toBe(p2);
    const r = await ringkasan(v);
    expect(Number(r.total)).toBe(7000000);
    expect(Number(r.terbayar)).toBe(1000000);
    const { count } = await editor
      .from('alokasi_acara')
      .select('id', { count: 'exact', head: true })
      .eq('kontrak_id', kid);
    expect(count).toBe(1);
  });

  test('anon dan orang luar tidak bisa memanggil', async () => {
    const v = await buatVendor('Akses', 'Venue', ['Resepsi']);
    const p = await buatPaket(v, 'Akses');
    const { error: eAnon } = await klienAnon.rpc('pilih_paket', { p_paket_id: p });
    expect(eAnon).not.toBeNull();
    const luar = await buatOrangLuar('keuangan-luar@test.local');
    const { error: eLuar } = await luar.rpc('pilih_paket', { p_paket_id: p });
    expect(eLuar).not.toBeNull();
    expect(await statusPaket(p)).toBe('aktif');
  });
});

describe('pembayaran dan ringkasan', () => {
  async function siapKontrak(nama: string, harga = 8500000) {
    const v = await buatVendor(nama, 'Venue', ['Resepsi']);
    const p = await buatPaket(v, nama, harga);
    await editor.rpc('pilih_paket', { p_paket_id: p });
    return { v, kid: await kontrakId(v) };
  }

  test('pembayaran dibayar tanpa pihak atau tanggal ditolak', async () => {
    const { kid } = await siapKontrak('Bayar Tanpa Pihak');
    const { error } = await editor
      .from('pembayaran')
      .insert({ kontrak_id: kid, jenis: 'dp', nominal: 100, status: 'dibayar', tanggal_bayar: '2026-06-01' });
    expect(error).not.toBeNull();
    const { error: e2 } = await editor
      .from('pembayaran')
      .insert({ kontrak_id: kid, jenis: 'dp', nominal: 100, status: 'dibayar', pihak_id: pihak['Rendy'] });
    expect(e2).not.toBeNull();
  });

  test('pembayaran terjadwal tanpa jatuh_tempo ditolak', async () => {
    const { kid } = await siapKontrak('Jadwal Tanpa Tempo');
    const { error } = await editor
      .from('pembayaran')
      .insert({ kontrak_id: kid, jenis: 'termin', nominal: 100, status: 'terjadwal' });
    expect(error).not.toBeNull();
  });

  test('nominal pembayaran harus lebih dari 0', async () => {
    const { kid } = await siapKontrak('Nominal Nol');
    const { error } = await editor.from('pembayaran').insert({
      kontrak_id: kid,
      jenis: 'termin',
      nominal: 0,
      status: 'terjadwal',
      jatuh_tempo: '2026-07-01',
    });
    expect(error).not.toBeNull();
  });

  test('kelebihan bayar: lunas true, sisa negatif', async () => {
    const { v, kid } = await siapKontrak('Lebih Bayar');
    const { error } = await editor.from('pembayaran').insert({
      kontrak_id: kid,
      jenis: 'pelunasan',
      nominal: 9000000,
      status: 'dibayar',
      tanggal_bayar: '2026-06-01',
      pihak_id: pihak['Rendy'],
    });
    expect(error).toBeNull();
    const r = await ringkasan(v);
    expect(Number(r.total)).toBe(8500000);
    expect(Number(r.sisa)).toBe(-500000);
    expect(r.lunas).toBe(true);
  });

  test('belum dibayar: sisa penuh, lunas false', async () => {
    const { v } = await siapKontrak('Belum Bayar');
    const r = await ringkasan(v);
    expect(Number(r.terbayar)).toBe(0);
    expect(Number(r.sisa)).toBe(8500000);
    expect(r.lunas).toBe(false);
  });

  test('kontribusi per pihak', async () => {
    const { v, kid } = await siapKontrak('Kontribusi');
    const awal = await totalKontribusi();
    const ins = (jenis: string, nominal: number, extra: Record<string, unknown>) =>
      editor.from('pembayaran').insert({ kontrak_id: kid, jenis, nominal, ...extra });
    expect(
      (await ins('dp', 2550000, { status: 'dibayar', tanggal_bayar: '2026-06-01', pihak_id: pihak['Rendy'] }))
        .error,
    ).toBeNull();
    expect(
      (
        await ins('pelunasan', 5950000, {
          status: 'dibayar',
          tanggal_bayar: '2026-06-02',
          pihak_id: pihak['Keluarga Wanita'],
        })
      ).error,
    ).toBeNull();
    expect(
      (await ins('termin', 1000000, { status: 'terjadwal', jatuh_tempo: '2026-09-01' })).error,
    ).toBeNull();

    const sesudah = await totalKontribusi();
    expect(sesudah['Rendy'] - (awal['Rendy'] ?? 0)).toBe(2550000);
    expect(sesudah['Keluarga Wanita'] - (awal['Keluarga Wanita'] ?? 0)).toBe(5950000);
    expect(sesudah['Dinar'] - (awal['Dinar'] ?? 0)).toBe(0);
    expect(sesudah['Dinar']).toBeDefined();

    const { data, error } = await editor
      .from('kontribusi_pihak_vendor')
      .select('pihak_id, total')
      .eq('vendor_id', v);
    expect(error).toBeNull();
    const peta = Object.fromEntries((data ?? []).map((r) => [r.pihak_id, Number(r.total)]));
    expect(peta[pihak['Rendy']]).toBe(2550000);
    expect(peta[pihak['Keluarga Wanita']]).toBe(5950000);
  });

  test('pihak arsip tanpa pembayaran tidak muncul, yang punya pembayaran tetap muncul', async () => {
    const { kid } = await siapKontrak('Pihak Arsip');
    const { data: baru, error } = await editor
      .from('pihak')
      .insert({ nama: 'Uji Pihak Arsip', urutan: 99 })
      .select('id')
      .single();
    if (error) throw error;
    try {
      await editor.from('pihak').update({ arsip: true }).eq('id', baru.id);
      expect(Object.keys(await totalKontribusi())).not.toContain('Uji Pihak Arsip');
      await editor.from('pihak').update({ arsip: false }).eq('id', baru.id);
      await editor.from('pembayaran').insert({
        kontrak_id: kid,
        jenis: 'dp',
        nominal: 500,
        status: 'dibayar',
        tanggal_bayar: '2026-06-01',
        pihak_id: baru.id,
      });
      await editor.from('pihak').update({ arsip: true }).eq('id', baru.id);
      expect((await totalKontribusi())['Uji Pihak Arsip']).toBe(500);
    } finally {
      await admin.from('pembayaran').delete().eq('pihak_id', baru.id);
      await admin.from('pihak').delete().eq('id', baru.id);
    }
  });

  test('pihak yang punya pembayaran tidak bisa dihapus', async () => {
    const { kid } = await siapKontrak('Pihak Restrict');
    const { data: baru, error: eBaru } = await editor
      .from('pihak')
      .insert({ nama: 'Uji Pihak Restrict', urutan: 98 })
      .select('id')
      .single();
    if (eBaru) throw eBaru;
    try {
      await editor.from('pembayaran').insert({
        kontrak_id: kid,
        jenis: 'dp',
        nominal: 500,
        status: 'dibayar',
        tanggal_bayar: '2026-06-01',
        pihak_id: baru.id,
      });
      const { error } = await editor.from('pihak').delete().eq('id', baru.id);
      expect(error).not.toBeNull();
    } finally {
      await admin.from('pembayaran').delete().eq('pihak_id', baru.id);
      await admin.from('pihak').delete().eq('id', baru.id);
    }
  });
});

describe('penjaga hapus', () => {
  test('hapus vendor dengan pembayaran dibayar ditolak, tanpa itu boleh', async () => {
    const v = await buatVendor('Hapus Dibayar', 'Venue', ['Resepsi']);
    const p = await buatPaket(v, 'Hapus');
    await editor.rpc('pilih_paket', { p_paket_id: p });
    const kid = await kontrakId(v);
    await editor.from('pembayaran').insert({
      kontrak_id: kid,
      jenis: 'dp',
      nominal: 1000,
      status: 'dibayar',
      tanggal_bayar: '2026-06-01',
      pihak_id: pihak['Rendy'],
    });
    const { error } = await editor.from('vendor').delete().eq('id', v);
    expect(error?.message).toContain('vendor_punya_pembayaran');

    const v2 = await buatVendor('Hapus Terjadwal', 'Venue', ['Resepsi']);
    const p2 = await buatPaket(v2, 'Hapus2');
    await editor.rpc('pilih_paket', { p_paket_id: p2 });
    await editor.from('pembayaran').insert({
      kontrak_id: await kontrakId(v2),
      jenis: 'dp',
      nominal: 1000,
      status: 'terjadwal',
      jatuh_tempo: '2026-09-01',
    });
    const { error: e2 } = await editor.from('vendor').delete().eq('id', v2);
    expect(e2).toBeNull();
    const { count } = await editor
      .from('kontrak')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', v2);
    expect(count).toBe(0);
  });

  test('melepas acara yang punya alokasi ditolak, termasuk lewat simpan_vendor', async () => {
    const v = await buatVendor('Lepas Acara', 'Venue', ['Lamaran', 'Resepsi']);
    const p = await buatPaket(v, 'Lepas');
    await editor.rpc('pilih_paket', {
      p_paket_id: p,
      p_alokasi: [{ acara_id: acara['Lamaran'], nominal: 100 }],
    });
    const { error } = await editor
      .from('vendor_acara')
      .delete()
      .eq('vendor_id', v)
      .eq('acara_id', acara['Lamaran']);
    expect(error?.message).toContain('acara_punya_alokasi');

    const { error: eRpc } = await editor.rpc('simpan_vendor', {
      p_id: v,
      p_data: { nama: 'Uji Lepas Acara', kategori_vendor_id: kategori['Venue'] },
      p_acara_ids: [acara['Resepsi']],
    });
    expect(eRpc?.message).toContain('acara_punya_alokasi');

    // Acara tanpa alokasi boleh dilepas.
    const { error: eOk } = await editor
      .from('vendor_acara')
      .delete()
      .eq('vendor_id', v)
      .eq('acara_id', acara['Resepsi']);
    expect(eOk).toBeNull();
  });

  test('acara yang punya alokasi tidak bisa dihapus', async () => {
    const v = await buatVendor('Acara Restrict', 'Venue', ['Resepsi']);
    const p = await buatPaket(v, 'Restrict');
    await editor.rpc('pilih_paket', { p_paket_id: p });
    const { error } = await editor.from('acara').delete().eq('id', acara['Resepsi']);
    expect(error).not.toBeNull();
  });
});

describe('akses', () => {
  test('orang luar dan anon tidak bisa membaca tabel dan view keuangan', async () => {
    const luar = await buatOrangLuar('keuangan-akses@test.local');
    const daftar = [
      'kontrak',
      'alokasi_acara',
      'pembayaran',
      'ringkasan_kontrak',
      'kontribusi_pihak',
      'kontribusi_pihak_vendor',
    ];
    for (const tabel of daftar) {
      const { data } = await luar.from(tabel).select('*').limit(1);
      expect(data ?? []).toHaveLength(0);
      const { error: eAnon } = await klienAnon.from(tabel).select('*').limit(1);
      expect(eAnon).not.toBeNull();
    }
  });
});
