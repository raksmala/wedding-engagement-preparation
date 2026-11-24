'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { tanggalValid } from '@/lib/tanggal';
import { adalahSaluran, type Saluran } from '@/lib/tugas';
import { adalahUuid } from '@/lib/validasi';

const TIDAK_DITEMUKAN = 'Data tidak ditemukan atau tidak bisa diubah.';

function segarkan() {
  revalidatePath('/vendor/[id]', 'page');
  revalidatePath('/tugas');
  // Dashboard (Task 11) menampilkan Tugas yang punya Jatuh Tempo.
  revalidatePath('/');
}

function teks(formData: FormData, kunci: string): string {
  const nilai = formData.get(kunci);
  return typeof nilai === 'string' ? nilai.trim() : '';
}

export type NilaiLog = { vendor_id: string; tanggal: string; saluran: string; isi: string };
export type HasilLog = { ok?: boolean; error?: string; nilai?: NilaiLog };

export async function simpanLogKontak(formData: FormData): Promise<HasilLog> {
  const nilai: NilaiLog = {
    vendor_id: teks(formData, 'vendor_id'),
    tanggal: teks(formData, 'tanggal'),
    saluran: teks(formData, 'saluran'),
    isi: teks(formData, 'isi'),
  };
  const gagal = (error: string): HasilLog => ({ error, nilai });

  if (!adalahUuid(nilai.vendor_id)) return gagal(TIDAK_DITEMUKAN);
  if (!tanggalValid(nilai.tanggal)) return gagal('Isi tanggal dengan tanggal yang benar.');
  if (!adalahSaluran(nilai.saluran)) return gagal('Pilih saluran kontak.');
  if (!nilai.isi) return gagal('Tulis isi kesepakatan atau obrolannya.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('log_kontak')
    .insert({ vendor_id: nilai.vendor_id, tanggal: nilai.tanggal, saluran: nilai.saluran as Saluran, isi: nilai.isi });
  if (error) {
    console.error('simpanLogKontak:', error.message);
    if (error.code === '23503') return gagal(TIDAK_DITEMUKAN);
    return gagal('Log kontak belum tersimpan. Coba lagi.');
  }

  segarkan();
  return { ok: true };
}

export async function hapusLogKontak(id: string): Promise<{ error?: string }> {
  if (!adalahUuid(id)) return { error: TIDAK_DITEMUKAN };

  const supabase = await createClient();
  // Tugas follow-up tetap ada. Kaitannya ke log ini dikosongkan oleh foreign key.
  const { data, error } = await supabase.from('log_kontak').delete().eq('id', id).select('id');
  if (error) {
    console.error('hapusLogKontak:', error.message);
    return { error: 'Log kontak belum terhapus. Coba lagi.' };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };

  segarkan();
  return {};
}

// Tugas follow-up dari satu Log Kontak. Vendor Tugas selalu Vendor pemilik log.
export async function buatTugasDariLog(
  logKontakId: string,
  judul: string,
  jatuhTempo: string,
  picId: string,
): Promise<{ error?: string }> {
  const judulBersih = typeof judul === 'string' ? judul.trim() : '';
  const tempo = typeof jatuhTempo === 'string' ? jatuhTempo.trim() : '';
  if (!adalahUuid(logKontakId)) return { error: TIDAK_DITEMUKAN };
  if (!judulBersih) return { error: 'Judul tugas wajib diisi.' };
  if (typeof picId !== 'string' || !adalahUuid(picId)) return { error: 'Pilih PIC.' };
  if (tempo && !tanggalValid(tempo)) return { error: 'Jatuh tempo tidak valid.' };

  const supabase = await createClient();
  const { data: log, error: eLog } = await supabase
    .from('log_kontak')
    .select('id, vendor_id')
    .eq('id', logKontakId)
    .maybeSingle();
  if (eLog) {
    console.error('buatTugasDariLog:', eLog.message);
    return { error: 'Tugas belum tersimpan. Coba lagi.' };
  }
  if (!log) return { error: TIDAK_DITEMUKAN };

  const { error } = await supabase.from('tugas').insert({
    judul: judulBersih,
    pic_id: picId,
    jatuh_tempo: tempo || null,
    vendor_id: log.vendor_id,
    log_kontak_id: log.id,
  });
  if (error) {
    console.error('buatTugasDariLog:', error.message);
    if (error.code === '23503') return { error: 'PIC tidak ditemukan. Pilih PIC lagi.' };
    return { error: 'Tugas belum tersimpan. Coba lagi.' };
  }

  segarkan();
  return {};
}
