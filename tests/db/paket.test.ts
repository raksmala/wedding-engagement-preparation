import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, buatOrangLuar, klienAnon } from './helpers';

let editor: SupabaseClient;
let fotoId: string;
let venueId: string;
let vendorId: string;
let komFoto: string;
let komVenue: string;
let komAlbum: string;

async function idKategori(nama: string): Promise<string> {
  const { data, error } = await editor.from('kategori_vendor').select('id').eq('nama', nama).single();
  if (error) throw error;
  return data.id;
}

async function bersihkan() {
  await editor.from('vendor').delete().like('nama', 'Uji %');
  await editor.from('komponen').delete().like('nama', 'Uji %');
}

beforeAll(async () => {
  editor = await buatEditorTest('paket-db@test.local');
  await bersihkan();
  fotoId = await idKategori('Foto & Video');
  venueId = await idKategori('Venue');
  const { data: v, error } = await editor
    .from('vendor')
    .insert({ nama: 'Uji Foto DB', kategori_vendor_id: fotoId })
    .select('id')
    .single();
  if (error) throw error;
  vendorId = v.id;
  const buat = async (kategori: string, nama: string, tipe: 'teks' | 'angka' | 'ya_tidak', urutan: number) => {
    const { data, error: e } = await editor
      .from('komponen')
      .insert({ kategori_vendor_id: kategori, nama, tipe, satuan: tipe === 'angka' ? 'jam' : null, urutan })
      .select('id')
      .single();
    if (e) throw e;
    return data.id as string;
  };
  komFoto = await buat(fotoId, 'Uji Durasi', 'angka', 1);
  komAlbum = await buat(fotoId, 'Uji Album', 'ya_tidak', 2);
  komVenue = await buat(venueId, 'Uji Kapasitas', 'angka', 1);
});

afterAll(async () => {
  try {
    await bersihkan();
  } finally {
    await bersihkanTest();
  }
});

async function buatPaket(nama: string): Promise<string> {
  const { data, error } = await editor
    .from('paket')
    .insert({ vendor_id: vendorId, nama, harga: 8500000 })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

describe('komponen_beda_kategori dan kategori_terkunci', () => {
  test('nilai Komponen dari kategori lain ditolak', async () => {
    const paket = await buatPaket('Uji Beda Kategori');
    const { error } = await editor
      .from('nilai_komponen')
      .insert({ paket_id: paket, komponen_id: komVenue, nilai: '100' });
    expect(error?.message).toContain('komponen_beda_kategori');
    const { error: eSama } = await editor
      .from('nilai_komponen')
      .insert({ paket_id: paket, komponen_id: komFoto, nilai: '8' });
    expect(eSama).toBeNull();
    const { error: eGanti } = await editor
      .from('nilai_komponen')
      .update({ komponen_id: komVenue })
      .eq('paket_id', paket);
    expect(eGanti?.message).toContain('komponen_beda_kategori');
  });

  test('kategori Vendor terkunci selama Paketnya punya nilai Komponen', async () => {
    const { data: v } = await editor
      .from('vendor')
      .insert({ nama: 'Uji Kunci', kategori_vendor_id: fotoId })
      .select('id')
      .single();
    const { data: p } = await editor
      .from('paket')
      .insert({ vendor_id: v!.id, nama: 'Uji Paket Kunci', harga: 1000 })
      .select('id')
      .single();

    // Tanpa nilai, kategori boleh diganti.
    const { error: eBebas } = await editor.from('vendor').update({ kategori_vendor_id: venueId }).eq('id', v!.id);
    expect(eBebas).toBeNull();
    await editor.from('vendor').update({ kategori_vendor_id: fotoId }).eq('id', v!.id);

    await editor.from('nilai_komponen').insert({ paket_id: p!.id, komponen_id: komFoto, nilai: '8' });
    const { error } = await editor.from('vendor').update({ kategori_vendor_id: venueId }).eq('id', v!.id);
    expect(error?.message).toContain('kategori_terkunci');

    // Mengubah kolom lain sambil mengisi kategori yang sama tetap boleh.
    const { error: eLain } = await editor
      .from('vendor')
      .update({ nama: 'Uji Kunci 2', kategori_vendor_id: fotoId })
      .eq('id', v!.id);
    expect(eLain).toBeNull();
  });
});

describe('simpan_paket', () => {
  const data = (nama: string) => ({
    nama,
    harga: 8500000,
    syarat_dp: 'DP 30%',
    lain_lain: 'Gratis prewedding',
    catatan: null,
  });

  test('menyimpan Paket dan nilai Komponen, nilai kosong menghapus barisnya', async () => {
    const { data: id, error } = await editor.rpc('simpan_paket', {
      p_id: null as unknown as string,
      p_vendor_id: vendorId,
      p_data: data('Uji Gold'),
      p_nilai: { [komFoto]: '8', [komAlbum]: 'ya' },
    });
    expect(error).toBeNull();
    const { data: nilai } = await editor.from('nilai_komponen').select('komponen_id, nilai').eq('paket_id', id!);
    expect(nilai).toHaveLength(2);

    const { error: e2 } = await editor.rpc('simpan_paket', {
      p_id: id!,
      p_vendor_id: vendorId,
      p_data: data('Uji Gold 2'),
      p_nilai: { [komFoto]: '  ', [komAlbum]: 'tidak' },
    });
    expect(e2).toBeNull();
    const { data: sesudah } = await editor.from('nilai_komponen').select('komponen_id, nilai').eq('paket_id', id!);
    expect(sesudah).toEqual([{ komponen_id: komAlbum, nilai: 'tidak' }]);
    const { data: p } = await editor.from('paket').select('nama, harga, status, lampiran').eq('id', id!).single();
    expect(p).toEqual({ nama: 'Uji Gold 2', harga: 8500000, status: 'aktif', lampiran: [] });
  });

  test('atomik: Komponen dari kategori lain membatalkan Paket baru', async () => {
    const { error } = await editor.rpc('simpan_paket', {
      p_id: null as unknown as string,
      p_vendor_id: vendorId,
      p_data: data('Uji Gagal Atomik'),
      p_nilai: { [komFoto]: '8', [komVenue]: '100' },
    });
    expect(error?.message).toContain('komponen_beda_kategori');
    const { data: ada } = await editor.from('paket').select('id').eq('nama', 'Uji Gagal Atomik');
    expect(ada).toEqual([]);
  });

  test('update ke id yang tidak ada atau tersembunyi raise error', async () => {
    const { error } = await editor.rpc('simpan_paket', {
      p_id: '00000000-0000-0000-0000-000000000000',
      p_vendor_id: vendorId,
      p_data: data('Uji Hantu'),
      p_nilai: {},
    });
    expect(error?.message).toContain('paket_tidak_ditemukan');
  });

  test('orang luar dan anon tidak bisa memanggil atau membaca', async () => {
    const luar = await buatOrangLuar('paket-luar@test.local');
    const { data: p } = await luar.from('paket').select('id');
    expect(p).toEqual([]);
    const { error } = await luar.rpc('simpan_paket', {
      p_id: null as unknown as string,
      p_vendor_id: vendorId,
      p_data: data('Uji Luar'),
      p_nilai: {},
    });
    expect(error).not.toBeNull();

    const { error: eAnon } = await klienAnon.rpc('simpan_paket', {
      p_id: null as unknown as string,
      p_vendor_id: vendorId,
      p_data: data('Uji Anon'),
      p_nilai: {},
    });
    expect(eAnon).not.toBeNull();
    for (const tabel of ['komponen', 'paket', 'nilai_komponen'] as const) {
      const { data: d, error: e } = await klienAnon.from(tabel).select('*');
      expect(e !== null || (d ?? []).length === 0).toBe(true);
    }
  });
});

describe('komponen', () => {
  test('menghapus Komponen ikut menghapus nilainya', async () => {
    const paket = await buatPaket('Uji Cascade');
    await editor.from('nilai_komponen').insert({ paket_id: paket, komponen_id: komAlbum, nilai: 'ya' });
    const { data: tmp } = await editor
      .from('komponen')
      .insert({ kategori_vendor_id: fotoId, nama: 'Uji Sementara', tipe: 'teks', urutan: 9 })
      .select('id')
      .single();
    await editor.from('nilai_komponen').insert({ paket_id: paket, komponen_id: tmp!.id, nilai: 'x' });
    const { error } = await editor.from('komponen').delete().eq('id', tmp!.id);
    expect(error).toBeNull();
    const { data } = await editor.from('nilai_komponen').select('komponen_id').eq('paket_id', paket);
    expect(data).toEqual([{ komponen_id: komAlbum }]);
  });

  test('nama Komponen unik per kategori', async () => {
    const { error } = await editor
      .from('komponen')
      .insert({ kategori_vendor_id: fotoId, nama: 'Uji Durasi', tipe: 'teks', urutan: 5 });
    expect(error?.code).toBe('23505');
  });

  test('urutkan_komponen mengatur ulang urutan dalam satu pernyataan', async () => {
    const { error } = await editor.rpc('urutkan_komponen', {
      p_kategori_id: fotoId,
      p_urutan: [komAlbum, komFoto],
    });
    expect(error).toBeNull();
    const { data } = await editor.from('komponen').select('id, urutan').in('id', [komFoto, komAlbum]).order('urutan');
    expect(data?.map((k) => k.id)).toEqual([komAlbum, komFoto]);

    const { error: eSalah } = await editor.rpc('urutkan_komponen', {
      p_kategori_id: fotoId,
      p_urutan: [komAlbum, komVenue],
    });
    expect(eSalah?.message).toContain('komponen_tidak_ditemukan');
    const { data: tetap } = await editor.from('komponen').select('urutan').eq('id', komAlbum).single();
    expect(tetap?.urutan).toBe(1);
  });
});

describe('kolom kunci tidak bisa dipindah', () => {
  test('Paket tidak bisa pindah Vendor', async () => {
    const paket = await buatPaket('Uji Pindah Vendor');
    const { data: lain } = await editor
      .from('vendor')
      .insert({ nama: 'Uji Vendor Lain', kategori_vendor_id: venueId })
      .select('id')
      .single();
    const { error } = await editor.from('paket').update({ vendor_id: lain!.id }).eq('id', paket);
    expect(error?.message).toContain('paket_pindah_vendor');
    const { data } = await admin.from('paket').select('vendor_id').eq('id', paket).single();
    expect(data?.vendor_id).toBe(vendorId);
    // Kolom lain tetap bisa diubah.
    const { error: eNama } = await editor.from('paket').update({ nama: 'Uji Pindah Vendor 2', vendor_id: vendorId }).eq('id', paket);
    expect(eNama).toBeNull();
  });

  test('Komponen tidak bisa pindah kategori', async () => {
    const { error } = await editor.from('komponen').update({ kategori_vendor_id: venueId }).eq('id', komFoto);
    expect(error?.message).toContain('komponen_pindah_kategori');
    const { data } = await admin.from('komponen').select('kategori_vendor_id').eq('id', komFoto).single();
    expect(data?.kategori_vendor_id).toBe(fotoId);
    const { error: eNama } = await editor.from('komponen').update({ satuan: 'jam', kategori_vendor_id: fotoId }).eq('id', komFoto);
    expect(eNama).toBeNull();
  });
});
