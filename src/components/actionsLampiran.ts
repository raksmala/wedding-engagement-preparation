'use server';

import { revalidatePath } from 'next/cache';
import { BUCKET_LAMPIRAN, pathLampiranSah } from '@/lib/lampiran';
import { createClient } from '@/lib/supabase/server';

const TIDAK_DITEMUKAN = 'Data tidak ditemukan atau tidak bisa diubah.';

function segarkan(tabel: string, id: string) {
  // Task 9 menambah halaman Kontrak dan Pembayaran di sini.
  if (tabel === 'paket') revalidatePath('/vendor/[id]', 'page');
  void id;
}

export async function tambahLampiran(tabel: string, id: string, path: string): Promise<{ error?: string }> {
  if (!pathLampiranSah(tabel, id, path)) return { error: TIDAK_DITEMUKAN };

  const supabase = await createClient();
  const { data: ada, error: eAda } = await supabase.storage.from(BUCKET_LAMPIRAN).exists(path);
  if (eAda || !ada) {
    console.error('tambahLampiran: objek tidak ada', eAda?.message);
    return { error: 'File belum terunggah. Coba lagi.' };
  }

  const { data: baris, error } = await supabase.from('paket').select('lampiran').eq('id', id).maybeSingle();
  if (error) {
    console.error('tambahLampiran:', error.message);
    return { error: 'Lampiran belum tersimpan. Coba lagi.' };
  }
  if (!baris) return { error: TIDAK_DITEMUKAN };
  if (baris.lampiran.includes(path)) return {};

  const { data, error: eUbah } = await supabase
    .from('paket')
    .update({ lampiran: [...baris.lampiran, path] })
    .eq('id', id)
    .select('id');
  if (eUbah) {
    console.error('tambahLampiran:', eUbah.message);
    return { error: 'Lampiran belum tersimpan. Coba lagi.' };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };

  segarkan(tabel, id);
  return {};
}

export async function hapusLampiran(tabel: string, id: string, path: string): Promise<{ error?: string }> {
  if (!pathLampiranSah(tabel, id, path)) return { error: TIDAK_DITEMUKAN };

  const supabase = await createClient();
  const { data: baris, error } = await supabase.from('paket').select('lampiran').eq('id', id).maybeSingle();
  if (error) {
    console.error('hapusLampiran:', error.message);
    return { error: 'Lampiran belum terhapus. Coba lagi.' };
  }
  if (!baris || !baris.lampiran.includes(path)) return { error: TIDAK_DITEMUKAN };

  const { data, error: eUbah } = await supabase
    .from('paket')
    .update({ lampiran: baris.lampiran.filter((p: string) => p !== path) })
    .eq('id', id)
    .select('id');
  if (eUbah) {
    console.error('hapusLampiran:', eUbah.message);
    return { error: 'Lampiran belum terhapus. Coba lagi.' };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };

  // Entri sudah lepas dari baris. Objek yang gagal terhapus hanya menyisakan file yatim.
  const { error: eObjek } = await supabase.storage.from(BUCKET_LAMPIRAN).remove([path]);
  if (eObjek) console.error('hapusLampiran: objek tidak terhapus', eObjek.message);

  segarkan(tabel, id);
  return {};
}
