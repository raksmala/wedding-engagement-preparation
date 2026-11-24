import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JudulHalaman } from '@/components/JudulHalaman';
import { Kosong } from '@/components/Kosong';
import { StatusLabel, StatusPaketLabel } from '@/components/StatusLabel';
import { embedSatu } from '@/lib/embed';
import { NILAI_KOSONG, tampilkanNilai, type TipeKomponen } from '@/lib/komponen';
import { formatRupiah } from '@/lib/rupiah';
import { createClient } from '@/lib/supabase/server';
import { adalahUuid } from '@/lib/validasi';
import { PilihPaket } from '../PilihPaket';

function satu(nilai: string | string[] | undefined): string | undefined {
  return Array.isArray(nilai) ? nilai[0] : nilai;
}

export default async function KomparasiKategoriPage({
  params,
  searchParams,
}: {
  params: Promise<{ kategoriId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { kategoriId } = await params;
  if (!adalahUuid(kategoriId)) notFound();
  const sp = await searchParams;
  const acaraParam = satu(sp.acara);
  const acaraId = acaraParam && adalahUuid(acaraParam) ? acaraParam : '';
  const tampilBatal = satu(sp.batal) === '1';

  const supabase = await createClient();
  const { data: kategori, error: eKategori } = await supabase
    .from('kategori_vendor')
    .select('id, nama')
    .eq('id', kategoriId)
    .maybeSingle();
  if (eKategori) throw new Error('Gagal memuat komparasi');
  if (!kategori) notFound();

  const [paket, komponen, acara] = await Promise.all([
    supabase
      .from('paket')
      .select(
        'id, nama, harga, syarat_dp, lain_lain, status, nilai_komponen(komponen_id, nilai), vendor!inner(id, nama, status, kategori_vendor_id, vendor_acara(acara(id, nama)))',
      )
      .eq('vendor.kategori_vendor_id', kategoriId)
      .order('dibuat_pada'),
    supabase
      .from('komponen')
      .select('id, nama, tipe, satuan')
      .eq('kategori_vendor_id', kategoriId)
      .order('urutan')
      .order('nama'),
    supabase.from('acara').select('id, nama').order('tanggal', { nullsFirst: false }).order('nama'),
  ]);
  if (paket.error || komponen.error || acara.error) throw new Error('Gagal memuat komparasi');

  const semua = paket.data
    .map((p) => {
      const v = embedSatu(p.vendor);
      const acaraVendor = (v?.vendor_acara ?? [])
        .map((r) => embedSatu(r.acara))
        .filter((a): a is { id: string; nama: string } => !!a);
      return { p, v, acaraVendor };
    })
    .filter((r): r is typeof r & { v: NonNullable<typeof r.v> } => !!r.v)
    .sort((a, b) => a.v.nama.localeCompare(b.v.nama, 'id'));

  const kolom = semua.filter(
    (r) => (tampilBatal || r.v.status !== 'batal') && (!acaraId || r.acaraVendor.some((a) => a.id === acaraId)),
  );
  const adaFilter = !!acaraId || tampilBatal;

  return (
    <>
      <JudulHalaman judul={`Komparasi ${kategori.nama}`} />

      <form method="get" action={`/komparasi/${kategori.id}`} className="filter filter-komparasi">
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
        <label className="pilihan">
          <input type="checkbox" name="batal" value="1" defaultChecked={tampilBatal} />
          Tampilkan vendor batal
        </label>
        <button type="submit" className="tombol-utama">
          Terapkan
        </button>
      </form>

      {kolom.length === 0 ? (
        adaFilter ? (
          <Kosong
            pesan="Tidak ada paket yang cocok dengan filter ini."
            aksi={{ label: 'Lihat semua paket', href: `/komparasi/${kategori.id}` }}
          />
        ) : (
          <Kosong
            pesan={`Belum ada paket di kategori ${kategori.nama}. Tambah paket dari halaman vendor.`}
            aksi={{ label: 'Lihat vendor', href: '/vendor' }}
          />
        )
      ) : (
        <div
          className="tabel-geser"
          data-testid="tabel-geser"
          tabIndex={0}
          role="region"
          aria-label="Tabel komparasi paket, geser ke samping"
        >
          <table className="tabel-komparasi">
            <thead>
              <tr>
                <th scope="col" className="kolom-label">
                  <span className="sr-saja">Baris</span>
                </th>
                {kolom.map(({ p, v }) => (
                  <th key={p.id} scope="col" className={`kolom-${p.status}`}>
                    <Link href={`/vendor/${v.id}`} className="tautan-aksi">
                      {v.nama}
                    </Link>
                    <span className="nama-paket">{p.nama}</span>
                    <span className="label-kolom">
                      <StatusPaketLabel status={p.status} />
                      <StatusLabel status={v.status} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className="kolom-label">
                  Harga
                </th>
                {kolom.map(({ p }) => (
                  <td key={p.id} className={`kolom-${p.status} rupiah`}>
                    {formatRupiah(p.harga)}
                  </td>
                ))}
              </tr>
              {komponen.data.map((k) => (
                <tr key={k.id}>
                  <th scope="row" className="kolom-label">
                    {k.nama}
                  </th>
                  {kolom.map(({ p }) => {
                    const isi = p.nilai_komponen.find((n) => n.komponen_id === k.id)?.nilai;
                    return (
                      <td key={p.id} className={`kolom-${p.status}${isi ? '' : ' kosong-sel'}`}>
                        {isi ? tampilkanNilai(k.tipe as TipeKomponen, k.satuan, isi) : NILAI_KOSONG}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th scope="row" className="kolom-label">
                  Syarat DP
                </th>
                {kolom.map(({ p }) => (
                  <td key={p.id} className={`kolom-${p.status}${p.syarat_dp ? '' : ' kosong-sel'}`}>
                    {p.syarat_dp || NILAI_KOSONG}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="kolom-label">
                  Lain-lain
                </th>
                {kolom.map(({ p }) => (
                  <td key={p.id} className={`kolom-${p.status}${p.lain_lain ? '' : ' kosong-sel'}`}>
                    {p.lain_lain || NILAI_KOSONG}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="kolom-label">
                  <span className="sr-saja">Aksi</span>
                </th>
                {kolom.map(({ p, v, acaraVendor }) => (
                  <td key={p.id} className={`kolom-${p.status}`}>
                    {p.status !== 'dipilih' && (
                      <PilihPaket paketId={p.id} namaPaket={p.nama} namaVendor={v.nama} acara={acaraVendor} />
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p>
        <Link href="/komparasi" className="tautan-aksi">
          Kembali ke daftar kategori
        </Link>
      </p>
    </>
  );
}
