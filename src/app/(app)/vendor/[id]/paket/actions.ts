'use server';

import { revalidatePath } from 'next/cache';
import { validasiNilai, type TipeKomponen } from '@/lib/komponen';
import { parseRupiah } from '@/lib/rupiah';
import { createClient } from '@/lib/supabase/server';
import { adalahUuid } from '@/lib/validasi';

const TIDAK_DITEMUKAN = 'Data tidak ditemukan atau tidak bisa diubah.';
const PESAN_HARGA = 'Tulis nominal dengan angka, contoh 1.500.000';

export type NilaiPaket = {
  id: string;
  vendor_id: string;
  nama: string;
  harga: string;
  syarat_dp: string;
  lain_lain: string;
  catatan: string;
  // komponen_id -> nilai yang diketik
  nilai: Record<string, string>;
};

export type HasilSimpanPaket = { id?: string; error?: string; nilai?: NilaiPaket };

function teks(formData: FormData, kunci: string): string {
  const nilai = formData.get(kunci);
  return typeof nilai === 'string' ? nilai.trim() : '';
}

export async function simpanPaket(formData: FormData): Promise<HasilSimpanPaket> {
  const id = teks(formData, 'id');
  const vendorId = teks(formData, 'vendor_id');
  const dikirim: NilaiPaket = {
    id,
    vendor_id: vendorId,
    nama: teks(formData, 'nama'),
    harga: teks(formData, 'harga'),
    syarat_dp: teks(formData, 'syarat_dp'),
    lain_lain: teks(formData, 'lain_lain'),
    catatan: teks(formData, 'catatan'),
    nilai: {},
  };
  for (const [kunci] of formData.entries()) {
    if (kunci.startsWith('nilai_')) dikirim.nilai[kunci.slice(6)] = teks(formData, kunci);
  }
  const gagal = (error: string): HasilSimpanPaket => ({ error, nilai: dikirim });

  if (!adalahUuid(vendorId)) return gagal(TIDAK_DITEMUKAN);
  if (id && !adalahUuid(id)) return gagal(TIDAK_DITEMUKAN);
  if (!dikirim.nama) return gagal('Nama paket wajib diisi.');
  if (!dikirim.harga) return gagal('Harga wajib diisi.');
  const harga = parseRupiah(dikirim.harga);
  if (harga === null) return gagal(PESAN_HARGA);

  const supabase = await createClient();
  const { data: vendor, error: eVendor } = await supabase
    .from('vendor')
    .select('kategori_vendor_id')
    .eq('id', vendorId)
    .maybeSingle();
  if (eVendor) {
    console.error('simpanPaket:', eVendor.message);
    return gagal('Paket belum tersimpan. Coba lagi.');
  }
  if (!vendor) return gagal(TIDAK_DITEMUKAN);

  // Komponen diambil dari kategori vendor, bukan dari isi form.
  const { data: komponen, error: eKomponen } = await supabase
    .from('komponen')
    .select('id, nama, tipe')
    .eq('kategori_vendor_id', vendor.kategori_vendor_id);
  if (eKomponen) {
    console.error('simpanPaket:', eKomponen.message);
    return gagal('Paket belum tersimpan. Coba lagi.');
  }

  const nilai: Record<string, string> = {};
  for (const k of komponen) {
    const isi = dikirim.nilai[k.id] ?? '';
    if (isi !== '' && !validasiNilai(k.tipe as TipeKomponen, isi)) {
      return gagal(
        k.tipe === 'angka'
          ? `Isi ${k.nama} dengan angka, contoh 8 atau 1,5.`
          : `Pilih Ya atau Tidak untuk ${k.nama}.`,
      );
    }
    nilai[k.id] = isi;
  }

  const { data: paketId, error } = await supabase.rpc('simpan_paket', {
    // null berarti paket baru; tipe hasil generate tidak mengizinkan null.
    p_id: (id || null) as string,
    p_vendor_id: vendorId,
    p_data: {
      nama: dikirim.nama,
      harga,
      syarat_dp: dikirim.syarat_dp || null,
      lain_lain: dikirim.lain_lain || null,
      catatan: dikirim.catatan || null,
    },
    p_nilai: nilai,
  });
  if (error) {
    console.error('simpanPaket:', error.message);
    if (error.message.includes('paket_tidak_ditemukan')) return gagal(TIDAK_DITEMUKAN);
    if (error.message.includes('komponen_beda_kategori')) {
      return gagal('Komponen tidak cocok dengan kategori vendor ini.');
    }
    if (error.code === '23503') return gagal(TIDAK_DITEMUKAN);
    return gagal('Paket belum tersimpan. Coba lagi.');
  }

  revalidatePath(`/vendor/${vendorId}`);
  return { id: paketId };
}
