'use server';

import { revalidatePath } from 'next/cache';
import type { TipeKomponen } from '@/lib/komponen';
import { createClient } from '@/lib/supabase/server';
import { adalahUuid } from '@/lib/validasi';

const TIDAK_DITEMUKAN = 'Data tidak ditemukan atau tidak bisa diubah.';
const TIPE: TipeKomponen[] = ['teks', 'angka', 'ya_tidak'];

export type NilaiKomponen = {
  id: string;
  kategori_vendor_id: string;
  nama: string;
  tipe: string;
  satuan: string;
};

export type HasilSimpanKomponen = { ok?: boolean; error?: string; nilai?: NilaiKomponen };

function teks(formData: FormData, kunci: string): string {
  const nilai = formData.get(kunci);
  return typeof nilai === 'string' ? nilai.trim() : '';
}

function segarkan() {
  revalidatePath('/pengaturan/komponen');
  // Form Paket dan detail Vendor memakai daftar Komponen.
  revalidatePath('/vendor/[id]', 'layout');
}

export async function simpanKomponen(formData: FormData): Promise<HasilSimpanKomponen> {
  const nilai: NilaiKomponen = {
    id: teks(formData, 'id'),
    kategori_vendor_id: teks(formData, 'kategori_vendor_id'),
    nama: teks(formData, 'nama'),
    tipe: teks(formData, 'tipe'),
    satuan: teks(formData, 'satuan'),
  };
  const gagal = (error: string): HasilSimpanKomponen => ({ error, nilai });

  if (!adalahUuid(nilai.kategori_vendor_id)) return gagal('Pilih kategori vendor dulu.');
  if (nilai.id && !adalahUuid(nilai.id)) return gagal(TIDAK_DITEMUKAN);
  if (!nilai.nama) return gagal('Nama komponen wajib diisi.');
  if (!TIPE.includes(nilai.tipe as TipeKomponen)) return gagal('Pilih tipe komponen.');
  const tipe = nilai.tipe as TipeKomponen;
  const satuan = nilai.satuan || null;

  const supabase = await createClient();

  if (nilai.id) {
    const { data: lama, error: eLama } = await supabase
      .from('komponen')
      .select('tipe, kategori_vendor_id, nilai_komponen(count)')
      .eq('id', nilai.id)
      .maybeSingle();
    if (eLama) {
      console.error('simpanKomponen:', eLama.message);
      return gagal('Komponen belum tersimpan. Coba lagi.');
    }
    if (!lama || lama.kategori_vendor_id !== nilai.kategori_vendor_id) return gagal(TIDAK_DITEMUKAN);
    const terisi = lama.nilai_komponen[0]?.count ?? 0;
    if (lama.tipe !== tipe && terisi > 0) {
      return gagal('Tipe tidak bisa diubah karena komponen ini sudah diisi di paket.');
    }

    const { data, error } = await supabase
      .from('komponen')
      .update({ nama: nilai.nama, tipe, satuan })
      .eq('id', nilai.id)
      .select('id');
    if (error) return gagal(pesanGalat('simpanKomponen', error));
    if (!data || data.length === 0) return gagal(TIDAK_DITEMUKAN);
  } else {
    const { data: terakhir, error: eUrut } = await supabase
      .from('komponen')
      .select('urutan')
      .eq('kategori_vendor_id', nilai.kategori_vendor_id)
      .order('urutan', { ascending: false })
      .limit(1);
    if (eUrut) {
      console.error('simpanKomponen:', eUrut.message);
      return gagal('Komponen belum tersimpan. Coba lagi.');
    }
    const { error } = await supabase.from('komponen').insert({
      kategori_vendor_id: nilai.kategori_vendor_id,
      nama: nilai.nama,
      tipe,
      satuan,
      urutan: (terakhir[0]?.urutan ?? 0) + 1,
    });
    if (error) return gagal(pesanGalat('simpanKomponen', error));
  }

  segarkan();
  return { ok: true };
}

function pesanGalat(konteks: string, error: { code?: string; message: string }): string {
  console.error(`${konteks}:`, error.message);
  if (error.code === '23505') return 'Komponen dengan nama itu sudah ada di kategori ini.';
  if (error.code === '23503') return 'Kategori yang dipilih tidak ditemukan.';
  return 'Komponen belum tersimpan. Coba lagi.';
}

export async function urutkanKomponen(kategoriId: string, urutan: string[]): Promise<{ error?: string }> {
  if (!adalahUuid(kategoriId) || urutan.length === 0 || !urutan.every(adalahUuid)) {
    return { error: TIDAK_DITEMUKAN };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('urutkan_komponen', { p_kategori_id: kategoriId, p_urutan: urutan });
  if (error) {
    console.error('urutkanKomponen:', error.message);
    if (error.message.includes('komponen_tidak_ditemukan')) return { error: TIDAK_DITEMUKAN };
    return { error: 'Urutan belum tersimpan. Coba lagi.' };
  }
  segarkan();
  return {};
}

export async function hapusKomponen(id: string): Promise<{ error?: string }> {
  if (!adalahUuid(id)) return { error: TIDAK_DITEMUKAN };
  const supabase = await createClient();
  // Nilai Komponen di semua Paket ikut terhapus lewat on delete cascade.
  const { data, error } = await supabase.from('komponen').delete().eq('id', id).select('id');
  if (error) {
    console.error('hapusKomponen:', error.message);
    return { error: 'Komponen belum terhapus. Coba lagi.' };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };
  segarkan();
  return {};
}
