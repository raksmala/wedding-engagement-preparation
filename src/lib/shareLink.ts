import type { Database } from '@/lib/database.types';

type StatusVendor = Database['public']['Enums']['status_vendor'];
type StatusTugas = Database['public']['Enums']['status_tugas'];

// Urutan di sini adalah urutan tampil di form, daftar Share Link, dan halaman Pembaca.
export const LABEL_BAGIAN = {
  acara: 'Acara',
  vendor: 'Vendor',
  tugas: 'Tugas',
  keuangan: 'Keuangan',
} as const;

export type Bagian = keyof typeof LABEL_BAGIAN;

export const BAGIAN = Object.keys(LABEL_BAGIAN) as Bagian[];

// Keuangan tidak dicentang secara default (PRD).
export const BAGIAN_DEFAULT: Bagian[] = ['acara', 'vendor', 'tugas'];

export function adalahBagian(s: string): s is Bagian {
  return Object.hasOwn(LABEL_BAGIAN, s);
}

// Bagian unik, sah, dan diurutkan sesuai BAGIAN. Null kalau kosong atau ada nilai yang tidak dikenal.
export function rapikanBagian(masukan: readonly string[]): Bagian[] | null {
  if (masukan.length === 0 || !masukan.every(adalahBagian)) return null;
  return BAGIAN.filter((b) => masukan.includes(b));
}

// "Acara, Vendor, Tugas". Nilai yang tidak dikenal dilewati.
export function namaBagian(bagian: readonly string[]): string {
  return BAGIAN.filter((b) => bagian.includes(b))
    .map((b) => LABEL_BAGIAN[b])
    .join(', ');
}

export const PANJANG_LABEL_MAKS = 80;

// Bentuk hasil baca_share_link(). Kunci bagian hanya ada kalau bagian itu dipilih.
export type IsiShareLink = {
  label: string;
  acara?: { nama: string; tanggal: string | null; perkiraan: string | null; lokasi: string | null }[];
  vendor?: { nama: string; kategori: string; status: StatusVendor; acara: string[] }[];
  tugas?: { judul: string; pic: string; jatuh_tempo: string | null; status: StatusTugas }[];
  keuangan?: {
    vendor: { nama: string; status: StatusVendor; total: number; terbayar: number; sisa: number }[];
    kontribusi: { nama: string; total: number }[];
  };
};
