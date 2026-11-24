import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JudulHalaman } from '@/components/JudulHalaman';
import { createClient } from '@/lib/supabase/server';
import { FormAcara } from './FormAcara';
import { TombolHapus } from './TombolHapus';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UbahAcaraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (id === 'baru') {
    return (
      <>
        <JudulHalaman judul="Tambah acara" />
        <FormAcara />
        <p>
          <Link href="/acara">Kembali ke daftar acara</Link>
        </p>
      </>
    );
  }

  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('acara')
    .select('id, nama, jenis, tanggal, perkiraan, lokasi, catatan')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Gagal memuat acara');
  if (!data) notFound();

  return (
    <>
      <JudulHalaman judul={data.nama} />
      <FormAcara acara={data} />
      <TombolHapus id={data.id} nama={data.nama} />
      <p>
        <Link href="/acara">Kembali ke daftar acara</Link>
      </p>
    </>
  );
}
