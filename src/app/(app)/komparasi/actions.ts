'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { adalahUuid } from '@/lib/validasi';

const TIDAK_DITEMUKAN = 'Data tidak ditemukan atau tidak bisa diubah.';
const ALOKASI_SALAH = 'Alokasi per acara tidak valid. Isi nominal dengan angka bulat.';

export type AlokasiInput = { acara_id: string; nominal: number };
export type HasilPilihPaket = { kontrakId?: string; error?: string };

function alokasiValid(a: unknown): a is AlokasiInput[] {
  return (
    Array.isArray(a) &&
    a.length > 0 &&
    a.every(
      (r) =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as AlokasiInput).acara_id === 'string' &&
        adalahUuid((r as AlokasiInput).acara_id) &&
        Number.isSafeInteger((r as AlokasiInput).nominal) &&
        (r as AlokasiInput).nominal >= 0,
    )
  );
}

export async function pilihPaket(paketId: string, alokasi: AlokasiInput[] | null): Promise<HasilPilihPaket> {
  if (!adalahUuid(paketId)) return { error: TIDAK_DITEMUKAN };
  if (alokasi !== null && !alokasiValid(alokasi)) return { error: ALOKASI_SALAH };

  const supabase = await createClient();
  const { data: paket, error: ePaket } = await supabase
    .from('paket')
    .select('vendor_id')
    .eq('id', paketId)
    .maybeSingle();
  if (ePaket) {
    console.error('pilihPaket:', ePaket.message);
    return { error: 'Paket belum bisa dipilih. Coba lagi.' };
  }
  if (!paket) return { error: TIDAK_DITEMUKAN };

  const { data, error } = await supabase.rpc('pilih_paket', {
    p_paket_id: paketId,
    // null berarti vendor satu acara; tipe hasil generate tidak mengizinkan null.
    p_alokasi: alokasi as never,
  });
  if (error) {
    console.error('pilihPaket:', error.message);
    const m = error.message;
    if (m.includes('alokasi_wajib')) {
      return { error: 'Vendor ini melayani lebih dari satu acara. Isi nominal untuk tiap acara.' };
    }
    if (m.includes('alokasi_tidak_valid')) return { error: ALOKASI_SALAH };
    if (m.includes('acara_bukan_milik_vendor')) return { error: 'Ada acara yang tidak terhubung ke vendor ini.' };
    if (m.includes('paket_tidak_ditemukan')) return { error: TIDAK_DITEMUKAN };
    return { error: 'Paket belum bisa dipilih. Coba lagi.' };
  }

  revalidatePath('/komparasi', 'layout');
  revalidatePath(`/vendor/${paket.vendor_id}`);
  return { kontrakId: data };
}
