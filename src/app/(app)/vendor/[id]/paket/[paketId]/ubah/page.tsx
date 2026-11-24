import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JudulHalaman } from '@/components/JudulHalaman';
import type { TipeKomponen } from '@/lib/komponen';
import { formatRupiah } from '@/lib/rupiah';
import { createClient } from '@/lib/supabase/server';
import { adalahUuid } from '@/lib/validasi';
import { FormPaket } from '../../FormPaket';

export default async function UbahPaketPage({ params }: { params: Promise<{ id: string; paketId: string }> }) {
  const { id, paketId } = await params;
  if (!adalahUuid(id) || !adalahUuid(paketId)) notFound();

  const supabase = await createClient();
  const [paket, vendor] = await Promise.all([
    supabase
      .from('paket')
      .select('id, vendor_id, nama, harga, syarat_dp, lain_lain, catatan, nilai_komponen(komponen_id, nilai)')
      .eq('id', paketId)
      .eq('vendor_id', id)
      .maybeSingle(),
    supabase.from('vendor').select('id, kategori_vendor_id').eq('id', id).maybeSingle(),
  ]);
  if (paket.error || vendor.error) throw new Error('Gagal memuat paket');
  if (!paket.data || !vendor.data) notFound();
  const p = paket.data;

  const { data: komponen, error } = await supabase
    .from('komponen')
    .select('id, nama, tipe, satuan')
    .eq('kategori_vendor_id', vendor.data.kategori_vendor_id)
    .order('urutan')
    .order('nama');
  if (error) throw new Error('Gagal memuat komponen');

  return (
    <>
      <JudulHalaman judul={`Ubah paket ${p.nama}`} />
      <FormPaket
        vendorId={id}
        kategoriId={vendor.data.kategori_vendor_id}
        komponen={komponen.map((k) => ({ ...k, tipe: k.tipe as TipeKomponen }))}
        awal={{
          id: p.id,
          vendor_id: p.vendor_id,
          nama: p.nama,
          harga: formatRupiah(p.harga).replace('Rp ', ''),
          syarat_dp: p.syarat_dp ?? '',
          lain_lain: p.lain_lain ?? '',
          catatan: p.catatan ?? '',
          nilai: Object.fromEntries(p.nilai_komponen.map((n) => [n.komponen_id, n.nilai])),
        }}
      />
      <p>
        <Link href={`/vendor/${id}`} className="tautan-aksi">
          Kembali ke detail vendor
        </Link>
      </p>
    </>
  );
}
