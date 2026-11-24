import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JudulHalaman } from '@/components/JudulHalaman';
import type { TipeKomponen } from '@/lib/komponen';
import { createClient } from '@/lib/supabase/server';
import { adalahUuid } from '@/lib/validasi';
import { FormPaket } from '../FormPaket';

export default async function PaketBaruPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!adalahUuid(id)) notFound();

  const supabase = await createClient();
  const { data: vendor, error } = await supabase
    .from('vendor')
    .select('id, nama, kategori_vendor_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Gagal memuat vendor');
  if (!vendor) notFound();

  const { data: komponen, error: eKomponen } = await supabase
    .from('komponen')
    .select('id, nama, tipe, satuan')
    .eq('kategori_vendor_id', vendor.kategori_vendor_id)
    .order('urutan')
    .order('nama');
  if (eKomponen) throw new Error('Gagal memuat komponen');

  return (
    <>
      <JudulHalaman judul={`Tambah paket ${vendor.nama}`} />
      <FormPaket
        vendorId={vendor.id}
        kategoriId={vendor.kategori_vendor_id}
        komponen={komponen.map((k) => ({ ...k, tipe: k.tipe as TipeKomponen }))}
      />
      <p>
        <Link href={`/vendor/${vendor.id}`} className="tautan-aksi">
          Kembali ke detail vendor
        </Link>
      </p>
    </>
  );
}
