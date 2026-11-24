'use server';

import { revalidatePath } from 'next/cache';
import { PANJANG_LABEL_MAKS, rapikanBagian } from '@/lib/shareLink';
import { createClient } from '@/lib/supabase/server';
import { adalahUuid } from '@/lib/validasi';

const TIDAK_DITEMUKAN = 'Share Link tidak ditemukan atau tidak bisa diubah.';

export type NilaiShareLink = { label: string; bagian: string[] };
export type HasilShareLink = { ok?: boolean; error?: string; nilai?: NilaiShareLink };

// Token dibuat database. Kolom token tidak bisa diisi Editor.
export async function buatShareLink(label: string, bagian: string[]): Promise<HasilShareLink> {
  const labelBersih = typeof label === 'string' ? label.trim() : '';
  const masukan = Array.isArray(bagian) ? bagian.filter((b): b is string => typeof b === 'string') : [];
  const nilai: NilaiShareLink = { label: labelBersih, bagian: masukan };
  const gagal = (error: string): HasilShareLink => ({ error, nilai });

  if (!labelBersih) return gagal('Nama link wajib diisi.');
  if (labelBersih.length > PANJANG_LABEL_MAKS) {
    return gagal(`Nama link maksimal ${PANJANG_LABEL_MAKS} karakter.`);
  }
  if (masukan.length === 0) return gagal('Pilih minimal satu bagian.');
  const bagianBersih = rapikanBagian(masukan);
  if (!bagianBersih) return gagal('Bagian yang dipilih tidak dikenal. Muat ulang halaman lalu coba lagi.');

  const supabase = await createClient();
  const { error } = await supabase.from('share_link').insert({ label: labelBersih, bagian: bagianBersih });
  if (error) {
    console.error('buatShareLink:', error.message);
    return gagal('Share Link belum tersimpan. Coba lagi.');
  }

  revalidatePath('/share');
  return { ok: true };
}

// Waktu cabut diisi database (trigger jaga_dicabut_pada), jadi nilai yang dikirim di sini hanya penanda.
export async function cabutShareLink(id: string): Promise<{ error?: string }> {
  if (typeof id !== 'string' || !adalahUuid(id)) return { error: TIDAK_DITEMUKAN };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('share_link')
    .update({ dicabut_pada: new Date().toISOString() })
    .eq('id', id)
    .is('dicabut_pada', null)
    .select('id');
  if (error) {
    console.error('cabutShareLink:', error.message);
    return { error: 'Share Link belum dicabut. Coba lagi.' };
  }

  if (!data || data.length === 0) {
    // Bisa jadi sudah dicabut lebih dulu, misalnya dari HP Editor lain. Itu bukan kegagalan.
    const { data: ada, error: eAda } = await supabase
      .from('share_link')
      .select('id')
      .eq('id', id)
      .not('dicabut_pada', 'is', null)
      .maybeSingle();
    if (eAda) {
      console.error('cabutShareLink:', eAda.message);
      return { error: 'Share Link belum dicabut. Coba lagi.' };
    }
    if (!ada) return { error: TIDAK_DITEMUKAN };
  }

  revalidatePath('/share');
  return {};
}
