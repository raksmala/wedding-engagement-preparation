import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JudulHalaman } from '@/components/JudulHalaman';
import { StatusLabel } from '@/components/StatusLabel';
import { embedSatu } from '@/lib/embed';
import { createClient } from '@/lib/supabase/server';
import { formatTanggalJamWib } from '@/lib/tanggal';
import { linkWhatsApp } from '@/lib/whatsapp';
import { urlLampiran } from '@/lib/urlLampiran';
import { adalahUuid } from '@/lib/validasi';
import type { TipeKomponen } from '@/lib/komponen';
import { DaftarPaket } from './DaftarPaket';
import { SeksiKontrak } from './kontrak/SeksiKontrak';
import { SeksiLogKontak } from './log/SeksiLogKontak';
import { UbahStatus } from './UbahStatus';

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!adalahUuid(id)) notFound();

  const supabase = await createClient();
  const { data: v, error } = await supabase
    .from('vendor')
    .select(
      'id, nama, status, kategori_vendor_id, nama_kontak, whatsapp, instagram, link, catatan, diubah_pada, diubah_oleh, kategori_vendor(nama), vendor_acara(acara(id, nama))',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Gagal memuat vendor');
  if (!v) notFound();

  let pengubah: string | null = null;
  if (v.diubah_oleh) {
    const { data: editor } = await supabase.from('editor').select('nama').eq('id', v.diubah_oleh).maybeSingle();
    pengubah = editor?.nama ?? null;
  }

  const [paket, komponen] = await Promise.all([
    supabase
      .from('paket')
      .select(
        'id, nama, harga, syarat_dp, lain_lain, catatan, status, lampiran, nilai_komponen(komponen_id, nilai)',
      )
      .eq('vendor_id', v.id)
      .order('dibuat_pada'),
    supabase
      .from('komponen')
      .select('id, nama, tipe, satuan')
      .eq('kategori_vendor_id', v.kategori_vendor_id)
      .order('urutan')
      .order('nama'),
  ]);
  if (paket.error || komponen.error) throw new Error('Gagal memuat paket');
  const urlBerkas = await urlLampiran(
    supabase,
    paket.data.flatMap((p) => p.lampiran),
  );

  const linkWa = v.whatsapp ? linkWhatsApp(v.whatsapp) : null;
  const linkAman = v.link && /^https?:\/\//i.test(v.link) ? v.link : null;
  const namaAcara = v.vendor_acara.map((r) => embedSatu(r.acara)?.nama).filter((n): n is string => !!n);

  return (
    <>
      <JudulHalaman judul={v.nama} />
      <p>
        <span data-testid="status-vendor">
          <StatusLabel status={v.status} />
        </span>
      </p>
      <UbahStatus id={v.id} status={v.status} />

      <dl className="rincian">
        <div>
          <dt>Kategori</dt>
          <dd>{embedSatu(v.kategori_vendor)?.nama ?? '-'}</dd>
        </div>
        <div>
          <dt>Acara</dt>
          <dd>{namaAcara.length > 0 ? namaAcara.join(', ') : 'Belum terhubung ke acara'}</dd>
        </div>
        {v.nama_kontak && (
          <div>
            <dt>Nama kontak</dt>
            <dd>{v.nama_kontak}</dd>
          </div>
        )}
        {v.whatsapp && (
          <div>
            <dt>WhatsApp</dt>
            <dd>{v.whatsapp}</dd>
          </div>
        )}
        {v.instagram && (
          <div>
            <dt>Instagram</dt>
            <dd>{v.instagram}</dd>
          </div>
        )}
        {v.link && (
          <div>
            <dt>Link</dt>
            <dd>{linkAman ? <a href={linkAman} target="_blank" rel="noopener noreferrer">{v.link}</a> : v.link}</dd>
          </div>
        )}
        {v.catatan && (
          <div>
            <dt>Catatan</dt>
            <dd>{v.catatan}</dd>
          </div>
        )}
      </dl>

      <div className="baris-tombol">
        {linkWa && (
          <a href={linkWa} target="_blank" rel="noopener noreferrer" className="tombol-utama">
            Chat WhatsApp
          </a>
        )}
        <Link href={`/vendor/${v.id}/ubah`} className="tombol-sekunder">
          Ubah vendor
        </Link>
      </div>

      <p>
        <Link href={`/komparasi/${v.kategori_vendor_id}`} className="tautan-aksi">
          Bandingkan paket di kategori ini
        </Link>
      </p>

      <DaftarPaket
        vendorId={v.id}
        paket={paket.data}
        komponen={komponen.data.map((k) => ({ ...k, tipe: k.tipe as TipeKomponen }))}
        url={urlBerkas}
      />
      <SeksiKontrak vendorId={v.id} status={v.status} />
      <SeksiLogKontak vendorId={v.id} />

      <p className="jejak-audit">
        Terakhir diubah oleh {pengubah ?? 'Editor tidak dikenal'}, {formatTanggalJamWib(v.diubah_pada)}
      </p>
      <p>
        <Link href="/vendor" className="tautan-aksi">
          Kembali ke daftar vendor
        </Link>
      </p>
    </>
  );
}
