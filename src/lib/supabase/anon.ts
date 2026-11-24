import { createClient as buatKlien } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// Klien tanpa sesi untuk halaman Pembaca. Tidak membaca cookie, jadi Editor yang kebetulan
// sedang login pun dibaca sebagai anon dan hanya mendapat hasil baca_share_link().
export function createAnonClient() {
  return buatKlien<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
