import type { SupabaseClient } from '@supabase/supabase-js';
import { BUCKET_LAMPIRAN, DURASI_SIGNED_URL } from './lampiran';

// Signed URL berlaku 1 jam. Path yang gagal diberi URL null supaya halaman tetap tampil.
export async function urlLampiran(
  supabase: SupabaseClient,
  paths: string[],
): Promise<Map<string, string | null>> {
  const hasil = new Map<string, string | null>(paths.map((p) => [p, null]));
  if (paths.length === 0) return hasil;
  const { data, error } = await supabase.storage.from(BUCKET_LAMPIRAN).createSignedUrls(paths, DURASI_SIGNED_URL);
  if (error) {
    console.error('urlLampiran:', error.message);
    return hasil;
  }
  for (const d of data) if (d.path && d.signedUrl) hasil.set(d.path, d.signedUrl);
  return hasil;
}
