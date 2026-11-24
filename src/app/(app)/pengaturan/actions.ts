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

// Satu helper untuk dua tabel aman karena kolom pihak dan kategori_vendor sama persis (id, nama, urutan, arsip,
// kolom audit). createClient() tidak memakai tipe Database, jadi kueri ini memang tidak dicek per tabel oleh TypeScript.
async function klien(tabel: Tabel) {
  const supabase = await createClient();
  return { dari: () => supabase.from(tabel) };
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

  // Dicek di sini supaya pesannya jelas. Index unik lower(nama) di DB tetap menjaga kalau dua simpan terjadi bersamaan (23505).
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
  const { dari } = await klien(tabel);

  // Vendor, Komponen, Pembayaran, dan Editor yang memakai baris ini menolak hapus lewat foreign key (23503).
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
