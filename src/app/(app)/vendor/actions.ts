'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const STATUS = ['kandidat', 'survei_nego', 'booked', 'selesai', 'batal'] as const;
type Status = (typeof STATUS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIDAK_DITEMUKAN = 'Data tidak ditemukan atau tidak bisa diubah.';

export type NilaiVendor = {
  id: string;
  nama: string;
  kategori_vendor_id: string;
  nama_kontak: string;
  whatsapp: string;
  instagram: string;
  link: string;
  catatan: string;
  acara_id: string[];
};

export type HasilSimpanVendor = { id?: string; error?: string; nilai?: NilaiVendor };

function teks(formData: FormData, kunci: string): string | null {
  const nilai = formData.get(kunci);
  if (typeof nilai !== 'string') return null;
  const rapi = nilai.trim();
  return rapi === '' ? null : rapi;
}

export async function simpanVendor(formData: FormData): Promise<HasilSimpanVendor> {
  const id = teks(formData, 'id');
  const nilai: NilaiVendor = {
    id: id ?? '',
    nama: teks(formData, 'nama') ?? '',
    kategori_vendor_id: teks(formData, 'kategori_vendor_id') ?? '',
    nama_kontak: teks(formData, 'nama_kontak') ?? '',
    whatsapp: teks(formData, 'whatsapp') ?? '',
    instagram: teks(formData, 'instagram') ?? '',
    link: teks(formData, 'link') ?? '',
    catatan: teks(formData, 'catatan') ?? '',
    acara_id: formData
      .getAll('acara_id')
      .filter((v): v is string => typeof v === 'string' && v !== ''),
  };
  const gagal = (error: string): HasilSimpanVendor => ({ error, nilai });

  if (id && !UUID.test(id)) return gagal(TIDAK_DITEMUKAN);
  if (!nilai.nama) return gagal('Nama vendor wajib diisi.');
  if (!UUID.test(nilai.kategori_vendor_id)) return gagal('Pilih kategori vendor.');
  if (nilai.acara_id.some((a) => !UUID.test(a))) return gagal('Acara tidak dikenali.');
  if (nilai.link && !/^https?:\/\/\S+$/i.test(nilai.link)) {
    return gagal('Link harus diawali http:// atau https://.');
  }
  const acaraId = [...new Set(nilai.acara_id)];

  const supabase = await createClient();
  const { data: vendorId, error } = await supabase.rpc('simpan_vendor', {
    // null berarti vendor baru; tipe hasil generate tidak mengizinkan null.
    p_id: id as string,
    p_data: {
      nama: nilai.nama,
      kategori_vendor_id: nilai.kategori_vendor_id,
      nama_kontak: nilai.nama_kontak || null,
      whatsapp: nilai.whatsapp || null,
      instagram: nilai.instagram || null,
      link: nilai.link || null,
      catatan: nilai.catatan || null,
    },
    p_acara_ids: acaraId,
  });
  if (error) {
    console.error('simpanVendor:', error.message);
    if (error.message.includes('vendor_tidak_ditemukan')) return gagal(TIDAK_DITEMUKAN);
    if (error.code === '23503') return gagal('Kategori atau acara yang dipilih tidak ditemukan.');
    return gagal('Vendor belum tersimpan. Coba lagi.');
  }

  revalidatePath('/vendor');
  revalidatePath(`/vendor/${vendorId}`);
  return { id: vendorId };
}

export async function ubahStatusVendor(id: string, status: Status): Promise<{ error?: string }> {
  if (!UUID.test(id)) return { error: TIDAK_DITEMUKAN };
  if (!STATUS.includes(status)) return { error: 'Status tidak dikenali.' };

  const supabase = await createClient();
  const { data, error } = await supabase.from('vendor').update({ status }).eq('id', id).select('id');
  if (error) {
    console.error('ubahStatusVendor:', error.message);
    return { error: 'Status belum tersimpan. Coba lagi.' };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };

  revalidatePath('/vendor');
  revalidatePath(`/vendor/${id}`);
  return {};
}
