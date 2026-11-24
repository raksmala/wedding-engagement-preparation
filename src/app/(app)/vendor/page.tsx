import Link from 'next/link';
import { JudulHalaman } from '@/components/JudulHalaman';
import { Kosong } from '@/components/Kosong';
import { LABEL_STATUS_VENDOR, StatusLabel, type StatusVendor } from '@/components/StatusLabel';
import { embedSatu } from '@/lib/embed';
import { createClient } from '@/lib/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function satu(nilai: string | string[] | undefined): string | undefined {
  return Array.isArray(nilai) ? nilai[0] : nilai;
}

export default async function VendorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const kategoriParam = satu(sp.kategori);
  const statusParam = satu(sp.status);
  const acaraParam = satu(sp.acara);

  const kategoriId = kategoriParam && UUID.test(kategoriParam) ? kategoriParam : '';
  const status = statusParam && statusParam in LABEL_STATUS_VENDOR ? (statusParam as StatusVendor) : '';
  const acaraId = acaraParam && UUID.test(acaraParam) ? acaraParam : '';
  const adaFilter = !!(kategoriId || status || acaraId);

  const supabase = await createClient();

  let idDiAcara: string[] | null = null;
  if (acaraId) {
    const { data, error } = await supabase.from('vendor_acara').select('vendor_id').eq('acara_id', acaraId);
    if (error) throw new Error('Gagal memuat vendor');
    idDiAcara = data.map((r) => r.vendor_id);
  }

  let kueri = supabase
    .from('vendor')
    .select('id, nama, status, kategori_vendor(nama), vendor_acara(acara(nama))')
    .order('nama');
  if (kategoriId) kueri = kueri.eq('kategori_vendor_id', kategoriId);
  if (status) kueri = kueri.eq('status', status);
  if (idDiAcara) kueri = kueri.in('id', idDiAcara);

  const [vendor, kategori, acara] = await Promise.all([
    kueri,
    supabase.from('kategori_vendor').select('id, nama').order('urutan'),
    supabase.from('acara').select('id, nama').order('tanggal', { nullsFirst: false }).order('nama'),
  ]);
  if (vendor.error || kategori.error || acara.error) throw new Error('Gagal memuat vendor');

  return (
    <>
      <JudulHalaman judul="Vendor" />
      <p>
        <Link href="/vendor/baru" className="tombol-utama">
          Tambah vendor
        </Link>
      </p>

      <form method="get" action="/vendor" className="filter">
        <label>
          Kategori
          <select name="kategori" defaultValue={kategoriId}>
            <option value="">Semua kategori</option>
            {kategori.data.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">Semua status</option>
            {(Object.keys(LABEL_STATUS_VENDOR) as StatusVendor[]).map((s) => (
              <option key={s} value={s}>
                {LABEL_STATUS_VENDOR[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Acara
          <select name="acara" defaultValue={acaraId}>
            <option value="">Semua acara</option>
            {acara.data.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nama}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="tombol-utama">
          Terapkan
        </button>
      </form>

      {vendor.data.length === 0 ? (
        adaFilter ? (
          <Kosong
            pesan="Tidak ada vendor yang cocok dengan filter ini."
            aksi={{ label: 'Lihat semua vendor', href: '/vendor' }}
          />
        ) : (
          <Kosong pesan="Belum ada vendor." aksi={{ label: 'Tambah vendor', href: '/vendor/baru' }} />
        )
      ) : (
        <ul className="daftar-kartu">
          {vendor.data.map((v) => {
            const namaAcara = v.vendor_acara.map((r) => embedSatu(r.acara)?.nama).filter(Boolean);
            return (
              <li key={v.id} className="kartu">
                <h2>{v.nama}</h2>
                <p className="teks-lembut">{embedSatu(v.kategori_vendor)?.nama ?? '-'}</p>
                <p>
                  <StatusLabel status={v.status} />
                </p>
                {namaAcara.length > 0 && <p>{namaAcara.join(', ')}</p>}
                <Link href={`/vendor/${v.id}`} className="tautan-aksi" aria-label={`Lihat ${v.nama}`}>
                  Lihat
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
