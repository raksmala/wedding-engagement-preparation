'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const JENIS = ['lamaran', 'akad', 'resepsi', 'ngunduh_mantu', 'lainnya'] as const;
type Jenis = (typeof JENIS)[number];

function teks(formData: FormData, kunci: string): string | null {
  const nilai = formData.get(kunci);
  if (typeof nilai !== 'string') return null;
  const rapi = nilai.trim();
  return rapi === '' ? null : rapi;
}

export async function simpanAcara(formData: FormData): Promise<{ error?: string }> {
  const id = teks(formData, 'id');
  const nama = teks(formData, 'nama');
  const jenis = teks(formData, 'jenis');
  const tanggal = teks(formData, 'tanggal');

  if (!nama) return { error: 'Nama acara wajib diisi.' };
  if (!jenis || !JENIS.includes(jenis as Jenis)) return { error: 'Jenis acara tidak dikenali.' };
  if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: 'Format tanggal tidak valid.' };

  const baris = {
    nama,
    jenis: jenis as Jenis,
    tanggal,
    perkiraan: teks(formData, 'perkiraan'),
    lokasi: teks(formData, 'lokasi'),
    catatan: teks(formData, 'catatan'),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from('acara').update(baris).eq('id', id)
    : await supabase.from('acara').insert(baris);
  if (error) return { error: 'Acara belum tersimpan. Coba lagi.' };

  revalidatePath('/acara');
  redirect('/acara');
}

export async function hapusAcara(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('acara').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') return { error: 'Acara ini masih dipakai vendor. Lepas vendornya dulu.' };
    return { error: 'Acara belum terhapus. Coba lagi.' };
  }
  revalidatePath('/acara');
  return {};
}
