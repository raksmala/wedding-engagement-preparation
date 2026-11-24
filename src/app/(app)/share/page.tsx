import { headers } from 'next/headers';
import { JudulHalaman } from '@/components/JudulHalaman';
import { createClient } from '@/lib/supabase/server';
import { DaftarShareLink, type BarisShareLink } from './DaftarShareLink';

// Origin dari request, supaya link yang disalin sama dengan alamat yang sedang dibuka Editor.
async function originRequest(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host')?.split(',')[0]?.trim() || h.get('host') || 'localhost:3000';
  const proto =
    h.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export default async function SharePage() {
  const supabase = await createClient();
  const [{ data, error }, origin] = await Promise.all([
    supabase
      .from('share_link')
      .select('id, token, label, bagian, dicabut_pada, dibuat_pada')
      // Link aktif dulu, lalu yang terbaru.
      .order('dicabut_pada', { ascending: false, nullsFirst: true })
      .order('dibuat_pada', { ascending: false }),
    originRequest(),
  ]);
  if (error) throw new Error('Gagal memuat Share Link');

  const baris: BarisShareLink[] = (data ?? []).map(
    (s: { id: string; token: string; label: string; bagian: string[]; dicabut_pada: string | null }) => ({
      id: s.id,
      label: s.label,
      bagian: s.bagian,
      dicabut_pada: s.dicabut_pada,
      // Link yang sudah dicabut tidak perlu ditampilkan lagi alamatnya.
      url: s.dicabut_pada ? null : `${origin}/s/${s.token}`,
    }),
  );

  return (
    <>
      <JudulHalaman judul="Share Link" />
      <p>
        Share Link membuat keluarga bisa melihat bagian yang dipilih tanpa login. Pembaca hanya bisa melihat,
        tidak bisa mengubah data.
      </p>
      <DaftarShareLink baris={baris} />
    </>
  );
}
