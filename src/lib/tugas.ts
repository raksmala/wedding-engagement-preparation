import type { Database } from '@/lib/database.types';

export type Saluran = Database['public']['Enums']['saluran_kontak'];
export type StatusTugas = Database['public']['Enums']['status_tugas'];

export const LABEL_SALURAN: Record<Saluran, string> = {
  whatsapp: 'WhatsApp',
  telepon: 'Telepon',
  bertemu: 'Bertemu',
  email: 'Email',
  lainnya: 'Lainnya',
};

export const SALURAN = Object.keys(LABEL_SALURAN) as Saluran[];

export function adalahSaluran(s: string): s is Saluran {
  return Object.hasOwn(LABEL_SALURAN, s);
}

// Tugas belum selesai yang Jatuh Temponya sudah lewat. Tanggal berformat YYYY-MM-DD.
export function tugasTerlambat(t: { status: StatusTugas; jatuh_tempo: string | null }, hariIni: string): boolean {
  return t.status === 'belum' && t.jatuh_tempo !== null && t.jatuh_tempo < hariIni;
}
