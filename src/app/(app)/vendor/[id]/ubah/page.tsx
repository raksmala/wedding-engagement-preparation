import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JudulHalaman } from '@/components/JudulHalaman';
import { createClient } from '@/lib/supabase/server';
import { FormVendor } from '../../FormVendor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UbahVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [vendor, kategori, acara] = await Promise.all([
    supabase
      .from('vendor')
      .select('id, nama, kategori_vendor_id, nama_kontak, whatsapp, instagram, link, catatan, vendor_acara(acara_id)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('kategori_vendor').select('id, nama, arsip').order('urutan'),
    supabase.from('acara').select('id, nama').order('tanggal', { nullsFirst: false }).order('nama'),
  ]);
  if (vendor.error || kategori.error || acara.error) throw new Error('Gagal memuat vendor');
  if (!vendor.data) notFound();
  const v = vendor.data;

  return (
    <>
      <JudulHalaman judul={`Ubah ${v.nama}`} />
      <FormVendor
        awal={{
          id: v.id,
          nama: v.nama,
          kategori_vendor_id: v.kategori_vendor_id,
          nama_kontak: v.nama_kontak ?? '',
          whatsapp: v.whatsapp ?? '',
          instagram: v.instagram ?? '',
          link: v.link ?? '',
          catatan: v.catatan ?? '',
          acara_id: v.vendor_acara.map((r) => r.acara_id),
        }}
        kategori={kategori.data.filter((k) => !k.arsip || k.id === v.kategori_vendor_id)}
        acara={acara.data}
      />
      <p>
        <Link href={`/vendor/${v.id}`} className="tautan-aksi">
          Kembali ke detail vendor
        </Link>
      </p>
    </>
  );
}
