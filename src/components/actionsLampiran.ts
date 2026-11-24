'use server';

import { revalidatePath } from 'next/cache';
import { BUCKET_LAMPIRAN, pathLampiranSah } from '@/lib/lampiran';
import { createClient } from '@/lib/supabase/server';

const TIDAK_DITEMUKAN = 'Data tidak ditemukan atau tidak bisa diubah.';

function segarkan() {
  // Paket, Kontrak, dan Pembayaran semuanya tampil di detail Vendor.
  revalidatePath('/vendor/[id]', 'page');
}

function dataTidakAda(pesan: string): boolean {
  return pesan.includes('lampiran_baris_tidak_ditemukan') || pesan.includes('lampiran_tidak_ditemukan');
}

export async function tambahLampiran(tabel: string, id: string, path: string): Promise<{ error?: string }> {
  if (!pathLampiranSah(tabel, id, path)) return { error: TIDAK_DITEMUKAN };

  const supabase = await createClient();
  const { data: ada, error: eAda } = await supabase.storage.from(BUCKET_LAMPIRAN).exists(path);
  if (eAda || !ada) {
    console.error('tambahLampiran: objek tidak ada', eAda?.message);
    return { error: 'File belum terunggah. Coba lagi.' };
  }

  const { error } = await supabase.rpc('tambah_lampiran', { p_tabel: tabel, p_id: id, p_path: path });
  if (error) {
    console.error('tambahLampiran:', error.message);
    if (dataTidakAda(error.message)) return { error: TIDAK_DITEMUKAN };
    return { error: 'Lampiran belum tersimpan. Coba lagi.' };
  }

  segarkan();
  return {};
}

export async function hapusLampiran(tabel: string, id: string, path: string): Promise<{ error?: string }> {
  if (!pathLampiranSah(tabel, id, path)) return { error: TIDAK_DITEMUKAN };

  const supabase = await createClient();
  const { error } = await supabase.rpc('hapus_lampiran', { p_tabel: tabel, p_id: id, p_path: path });
  if (error) {
    console.error('hapusLampiran:', error.message);
    if (dataTidakAda(error.message)) return { error: TIDAK_DITEMUKAN };
    return { error: 'Lampiran belum terhapus. Coba lagi.' };
  }

  // Entri sudah lepas dari baris. Objek yang gagal terhapus hanya menyisakan file yatim.
  const { error: eObjek } = await supabase.storage.from(BUCKET_LAMPIRAN).remove([path]);
  if (eObjek) console.error('hapusLampiran: objek tidak terhapus', eObjek.message);

  segarkan();
  return {};
}
