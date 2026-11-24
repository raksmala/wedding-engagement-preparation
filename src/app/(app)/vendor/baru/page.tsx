import Link from 'next/link';
import { JudulHalaman } from '@/components/JudulHalaman';
import { createClient } from '@/lib/supabase/server';
import { FormVendor } from '../FormVendor';

export default async function VendorBaruPage() {
  const supabase = await createClient();
  const [kategori, acara] = await Promise.all([
    supabase.from('kategori_vendor').select('id, nama').eq('arsip', false).order('urutan'),
    supabase.from('acara').select('id, nama').order('tanggal', { nullsFirst: false }).order('nama'),
  ]);
  if (kategori.error || acara.error) throw new Error('Gagal memuat pilihan');

  return (
    <>
      <JudulHalaman judul="Tambah vendor" />
      <FormVendor kategori={kategori.data} acara={acara.data} />
      <p>
        <Link href="/vendor" className="tautan-aksi">
          Kembali ke daftar vendor
        </Link>
      </p>
    </>
  );
}
