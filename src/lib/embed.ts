// Hasil embed to-one dari Supabase bisa bertipe objek atau array tergantung inferensi tipe.
export function embedSatu<T>(nilai: T | T[] | null | undefined): T | null {
  if (Array.isArray(nilai)) return nilai[0] ?? null;
  return nilai ?? null;
}
