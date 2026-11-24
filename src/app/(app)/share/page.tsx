import { JudulHalaman } from '@/components/JudulHalaman';
import { createClient } from '@/lib/supabase/server';
import { DaftarShareLink, type BarisShareLink } from './DaftarShareLink';

export default async function SharePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('share_link')
    .select('id, token, label, bagian, dicabut_pada')
    // Link aktif dulu, lalu yang terbaru.
    .order('dicabut_pada', { ascending: false, nullsFirst: true })
    .order('dibuat_pada', { ascending: false });
  if (error) throw new Error('Gagal memuat Share Link');

  const baris: BarisShareLink[] = (data ?? []).map(
    (s: { id: string; token: string; label: string; bagian: string[]; dicabut_pada: string | null }) => ({
      id: s.id,
      label: s.label,
      bagian: s.bagian,
      dicabut_pada: s.dicabut_pada,
      // Link yang sudah dicabut tidak perlu ditampilkan lagi alamatnya. Origin ditambahkan di browser.
      path: s.dicabut_pada ? null : `/s/${s.token}`,
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
