import { adalahUuid } from './validasi';

// Task 9 menambah 'kontrak' dan 'pembayaran'.
export const TABEL_LAMPIRAN = ['paket'] as const;
export type TabelLampiran = (typeof TABEL_LAMPIRAN)[number];

export const BUCKET_LAMPIRAN = 'lampiran';
export const BATAS_BYTE = 10 * 1024 * 1024;
export const TIPE_LAMPIRAN = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const PESAN_FILE_SALAH = 'File maksimal 10 MB, berupa JPG, PNG, WEBP, atau PDF.';
export const DURASI_SIGNED_URL = 3600;

export function tabelLampiranSah(tabel: string): tabel is TabelLampiran {
  return (TABEL_LAMPIRAN as readonly string[]).includes(tabel);
}

export function validasiFileLampiran(file: { type: string; size: number }): string | null {
  if (!TIPE_LAMPIRAN.includes(file.type) || file.size > BATAS_BYTE) return PESAN_FILE_SALAH;
  return null;
}

// Nama aman untuk key Storage: huruf kecil ASCII, tanpa spasi, diawali timestamp supaya unik.
export function namaFileAman(nama: string, sekarang: number = Date.now()): string {
  const dasar = nama.split(/[\/]/).pop() ?? '';
  const titik = dasar.lastIndexOf('.');
  const mentahBadan = titik > 0 ? dasar.slice(0, titik) : dasar;
  const mentahEkstensi = titik > 0 ? dasar.slice(titik + 1) : '';
  const badan = mentahBadan
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const ekstensi = mentahEkstensi.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  return `${sekarang}-${badan || 'file'}${ekstensi ? `.${ekstensi}` : ''}`;
}

export function namaTampil(path: string): string {
  const nama = path.split('/').pop() ?? path;
  return nama.replace(/^\d+-/, '');
}

export function pathLampiranSah(tabel: string, id: string, path: string): boolean {
  if (!tabelLampiranSah(tabel) || !adalahUuid(id)) return false;
  const awalan = `${tabel}/${id}/`;
  if (!path.startsWith(awalan)) return false;
  const sisa = path.slice(awalan.length);
  return /^[a-z0-9][a-z0-9._-]{0,99}$/.test(sisa) && !sisa.includes('..');
}
