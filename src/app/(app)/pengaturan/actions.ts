'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { adalahUuid } from '@/lib/validasi';

const TIDAK_DITEMUKAN = 'Data tidak ditemukan atau tidak bisa diubah.';
const PANJANG_MAKS = 60;

type Tabel = 'pihak' | 'kategori_vendor';

const PESAN: Record<Tabel, { benda: string; gagalHapus: string; ganda: string; dipakai: string }> = {
  pihak: {
    benda: 'pihak',
    gagalHapus: 'Pihak belum terhapus. Coba lagi.',
    ganda: 'Pihak dengan nama itu sudah ada.',
    dipakai: 'Pihak ini sudah dipakai di pembayaran atau oleh Editor, jadi tidak bisa dihapus. Arsipkan saja.',
  },
  kategori_vendor: {
    benda: 'kategori',
    gagalHapus: 'Kategori belum terhapus. Coba lagi.',
    ganda: 'Kategori dengan nama itu sudah ada.',
    dipakai: 'Kategori ini sudah dipakai vendor atau komponen, jadi tidak bisa dihapus. Arsipkan saja.',
  },
};

export type HasilSimpanPengaturan = { ok?: boolean; error?: string; nama?: string };

function teks(formData: FormData, kunci: string): string {
  const nilai = formData.get(kunci);
  return typeof nilai === 'string' ? nilai.trim() : '';
}

// Pihak dan Kategori Vendor tampil di banyak form dan halaman, jadi seluruh layout disegarkan.
function segarkan() {
  revalidatePath('/', 'layout');
}

async function klien(tabel: Tabel) {
  const supabase = await createClient();
  // Kedua tabel punya kolom yang sama (id, nama, urutan, arsip, audit), jadi tipe pihak dipakai untuk keduanya.
  return { supabase, dari: () => supabase.from(tabel as 'pihak') };
}

async function simpan(tabel: Tabel, formData: FormData): Promise<HasilSimpanPengaturan> {
  const pesan = PESAN[tabel];
  const id = teks(formData, 'id');
  const nama = teks(formData, 'nama').replace(/\s+/g, ' ');
  const gagal = (error: string): HasilSimpanPengaturan => ({ error, nama });

  if (id && !adalahUuid(id)) return gagal(TIDAK_DITEMUKAN);
  if (!nama) return gagal(`Nama ${pesan.benda} wajib diisi.`);
  if (nama.length > PANJANG_MAKS) return gagal(`Nama ${pesan.benda} paling panjang ${PANJANG_MAKS} karakter.`);

  const { dari } = await klien(tabel);

  // Unik di DB peka huruf besar kecil. Di sini "om budi" dan "Om Budi" dianggap sama.
  const { data: semua, error: eSemua } = await dari().select('id, nama, urutan');
  if (eSemua) {
    console.error(`simpan ${tabel}:`, eSemua.message);
    return gagal('Perubahan belum tersimpan. Coba lagi.');
  }
  const kecil = nama.toLowerCase();
  if (semua.some((r) => r.id !== id && r.nama.toLowerCase() === kecil)) return gagal(pesan.ganda);

  if (id) {
    const { data, error } = await dari().update({ nama }).eq('id', id).select('id');
    if (error) return gagal(pesanGalat(tabel, error));
    if (!data || data.length === 0) return gagal(TIDAK_DITEMUKAN);
  } else {
    const urutan = Math.max(0, ...semua.map((r) => r.urutan)) + 1;
    const { error } = await dari().insert({ nama, urutan });
    if (error) return gagal(pesanGalat(tabel, error));
  }

  segarkan();
  return { ok: true };
}

function pesanGalat(tabel: Tabel, error: { code?: string; message: string }): string {
  console.error(`simpan ${tabel}:`, error.message);
  if (error.code === '23505') return PESAN[tabel].ganda;
  return 'Perubahan belum tersimpan. Coba lagi.';
}

async function ubahArsip(tabel: Tabel, id: string, arsip: boolean): Promise<{ error?: string }> {
  if (!adalahUuid(id)) return { error: TIDAK_DITEMUKAN };
  const { dari } = await klien(tabel);
  const { data, error } = await dari().update({ arsip }).eq('id', id).select('id');
  if (error) {
    console.error(`arsip ${tabel}:`, error.message);
    return { error: 'Perubahan belum tersimpan. Coba lagi.' };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };
  segarkan();
  return {};
}

async function hapus(tabel: Tabel, id: string): Promise<{ error?: string }> {
  if (!adalahUuid(id)) return { error: TIDAK_DITEMUKAN };
  const { supabase, dari } = await klien(tabel);

  if (tabel === 'kategori_vendor') {
    // komponen.kategori_vendor_id memakai on delete cascade, jadi dicek di sini supaya Komponen tidak ikut hilang.
    const { count, error } = await supabase
      .from('komponen')
      .select('id', { count: 'exact', head: true })
      .eq('kategori_vendor_id', id);
    if (error) {
      console.error('hapus kategori_vendor:', error.message);
      return { error: PESAN[tabel].gagalHapus };
    }
    if ((count ?? 0) > 0) return { error: PESAN[tabel].dipakai };
  }

  // Vendor, Pembayaran, dan Editor yang memakai baris ini menolak hapus lewat foreign key (23503).
  const { data, error } = await dari().delete().eq('id', id).select('id');
  if (error) {
    console.error(`hapus ${tabel}:`, error.message);
    if (error.code === '23503') return { error: PESAN[tabel].dipakai };
    return { error: PESAN[tabel].gagalHapus };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };
  segarkan();
  return {};
}

export async function simpanPihak(formData: FormData): Promise<HasilSimpanPengaturan> {
  return simpan('pihak', formData);
}

export async function arsipkanPihak(id: string): Promise<{ error?: string }> {
  return ubahArsip('pihak', id, true);
}

export async function aktifkanPihak(id: string): Promise<{ error?: string }> {
  return ubahArsip('pihak', id, false);
}

export async function hapusPihak(id: string): Promise<{ error?: string }> {
  return hapus('pihak', id);
}

export async function simpanKategori(formData: FormData): Promise<HasilSimpanPengaturan> {
  return simpan('kategori_vendor', formData);
}

export async function arsipkanKategori(id: string): Promise<{ error?: string }> {
  return ubahArsip('kategori_vendor', id, true);
}

export async function aktifkanKategori(id: string): Promise<{ error?: string }> {
  return ubahArsip('kategori_vendor', id, false);
}

export async function hapusKategori(id: string): Promise<{ error?: string }> {
  return hapus('kategori_vendor', id);
}
