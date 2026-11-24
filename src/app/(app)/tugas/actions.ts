'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { tanggalValid } from '@/lib/tanggal';
import { adalahUuid } from '@/lib/validasi';

const TIDAK_DITEMUKAN = 'Data tidak ditemukan atau tidak bisa diubah.';

function segarkan() {
  revalidatePath('/tugas');
  revalidatePath('/vendor/[id]', 'page');
  // Dashboard (Task 11) menampilkan Tugas yang punya Jatuh Tempo.
  revalidatePath('/');
}

function teks(formData: FormData, kunci: string): string {
  const nilai = formData.get(kunci);
  return typeof nilai === 'string' ? nilai.trim() : '';
}

export type NilaiTugas = {
  id: string;
  judul: string;
  catatan: string;
  pic_id: string;
  jatuh_tempo: string;
  vendor_id: string;
  acara_id: string;
};
export type HasilTugas = { ok?: boolean; error?: string; nilai?: NilaiTugas };

export async function simpanTugas(formData: FormData): Promise<HasilTugas> {
  const nilai: NilaiTugas = {
    id: teks(formData, 'id'),
    judul: teks(formData, 'judul'),
    catatan: teks(formData, 'catatan'),
    pic_id: teks(formData, 'pic_id'),
    jatuh_tempo: teks(formData, 'jatuh_tempo'),
    vendor_id: teks(formData, 'vendor_id'),
    acara_id: teks(formData, 'acara_id'),
  };
  const gagal = (error: string): HasilTugas => ({ error, nilai });

  if (nilai.id && !adalahUuid(nilai.id)) return gagal(TIDAK_DITEMUKAN);
  if (!nilai.judul) return gagal('Judul tugas wajib diisi.');
  if (!adalahUuid(nilai.pic_id)) return gagal('Pilih PIC.');
  if (nilai.jatuh_tempo && !tanggalValid(nilai.jatuh_tempo)) return gagal('Jatuh tempo tidak valid.');
  if (nilai.vendor_id && !adalahUuid(nilai.vendor_id)) return gagal(TIDAK_DITEMUKAN);
  if (nilai.acara_id && !adalahUuid(nilai.acara_id)) return gagal(TIDAK_DITEMUKAN);

  const baris = {
    judul: nilai.judul,
    catatan: nilai.catatan || null,
    pic_id: nilai.pic_id,
    jatuh_tempo: nilai.jatuh_tempo || null,
    acara_id: nilai.acara_id || null,
  };

  const supabase = await createClient();
  let error: { code: string; message: string } | null = null;
  if (nilai.id) {
    const { data: lama, error: eLama } = await supabase
      .from('tugas')
      .select('id, log_kontak_id')
      .eq('id', nilai.id)
      .maybeSingle();
    if (eLama) {
      console.error('simpanTugas:', eLama.message);
      return gagal('Tugas belum tersimpan. Coba lagi.');
    }
    if (!lama) return gagal(TIDAK_DITEMUKAN);
    // Vendor Tugas follow-up mengikuti Log Kontak asalnya, jadi tidak ikut diubah dari form.
    const ubahan = lama.log_kontak_id ? baris : { ...baris, vendor_id: nilai.vendor_id || null };
    const hasil = await supabase.from('tugas').update(ubahan).eq('id', nilai.id).select('id');
    error = hasil.error;
    if (!error && (!hasil.data || hasil.data.length === 0)) return gagal(TIDAK_DITEMUKAN);
  } else {
    const hasil = await supabase.from('tugas').insert({ ...baris, vendor_id: nilai.vendor_id || null });
    error = hasil.error;
  }
  if (error) {
    console.error('simpanTugas:', error.message);
    if (error.code === '23503') return gagal('PIC, vendor, atau acara tidak ditemukan. Pilih lagi.');
    return gagal('Tugas belum tersimpan. Coba lagi.');
  }

  segarkan();
  return { ok: true };
}

async function ubahStatus(id: string, status: 'belum' | 'selesai'): Promise<{ error?: string }> {
  if (!adalahUuid(id)) return { error: TIDAK_DITEMUKAN };

  const supabase = await createClient();
  // selesai_pada diisi trigger di database.
  const { data, error } = await supabase.from('tugas').update({ status }).eq('id', id).select('id');
  if (error) {
    console.error('ubahStatusTugas:', error.message);
    return { error: 'Status tugas belum tersimpan. Coba lagi.' };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };

  segarkan();
  return {};
}

// Dipakai juga oleh dashboard (Task 11).
export async function selesaikanTugas(id: string): Promise<{ error?: string }> {
  return ubahStatus(id, 'selesai');
}

export async function bukaLagiTugas(id: string): Promise<{ error?: string }> {
  return ubahStatus(id, 'belum');
}

export async function hapusTugas(id: string): Promise<{ error?: string }> {
  if (!adalahUuid(id)) return { error: TIDAK_DITEMUKAN };

  const supabase = await createClient();
  const { data, error } = await supabase.from('tugas').delete().eq('id', id).select('id');
  if (error) {
    console.error('hapusTugas:', error.message);
    return { error: 'Tugas belum terhapus. Coba lagi.' };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };

  segarkan();
  return {};
}
