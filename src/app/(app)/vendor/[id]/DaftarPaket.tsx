import Link from 'next/link';
import { Kosong } from '@/components/Kosong';
import { StatusPaketLabel, type StatusPaket } from '@/components/StatusLabel';
import { UnggahLampiran } from '@/components/UnggahLampiran';
import { NILAI_KOSONG, tampilkanNilai, type TipeKomponen } from '@/lib/komponen';
import { formatRupiah } from '@/lib/rupiah';

export type KomponenTampil = { id: string; nama: string; tipe: TipeKomponen; satuan: string | null };
export type PaketTampil = {
  id: string;
  nama: string;
  harga: number;
  syarat_dp: string | null;
  lain_lain: string | null;
  catatan: string | null;
  status: StatusPaket;
  lampiran: string[];
  nilai_komponen: { komponen_id: string; nilai: string }[];
};

export function DaftarPaket({
  vendorId,
  paket,
  komponen,
  url,
}: {
  vendorId: string;
  paket: PaketTampil[];
  komponen: KomponenTampil[];
  url: Map<string, string | null>;
}) {
  return (
    <section aria-labelledby="judul-paket" className="bagian">
      <h2 id="judul-paket">Paket</h2>
      {paket.length === 0 ? (
        <Kosong
          pesan="Vendor ini belum punya paket."
          aksi={{ label: 'Tambah paket', href: `/vendor/${vendorId}/paket/baru` }}
        />
      ) : (
        <>
          <ul className="daftar-kartu">
            {paket.map((p) => {
              const nilai = new Map(p.nilai_komponen.map((n) => [n.komponen_id, n.nilai]));
              return (
                <li key={p.id} className="kartu">
                  <h3>{p.nama}</h3>
                  <p>
                    <StatusPaketLabel status={p.status} />
                  </p>
                  <dl className="rincian">
                    <div>
                      <dt>Harga</dt>
                      <dd className="rupiah">{formatRupiah(p.harga)}</dd>
                    </div>
                    {komponen.map((k) => {
                      const isi = nilai.get(k.id);
                      return (
                        <div key={k.id}>
                          <dt>{k.nama}</dt>
                          <dd className={isi ? undefined : 'teks-lembut'}>
                            {isi ? tampilkanNilai(k.tipe, k.satuan, isi) : NILAI_KOSONG}
                          </dd>
                        </div>
                      );
                    })}
                    {p.syarat_dp && (
                      <div>
                        <dt>Syarat DP</dt>
                        <dd>{p.syarat_dp}</dd>
                      </div>
                    )}
                    {p.lain_lain && (
                      <div>
                        <dt>Lain-lain</dt>
                        <dd>{p.lain_lain}</dd>
                      </div>
                    )}
                    {p.catatan && (
                      <div>
                        <dt>Catatan</dt>
                        <dd>{p.catatan}</dd>
                      </div>
                    )}
                  </dl>
                  <UnggahLampiran
                    tabel="paket"
                    id={p.id}
                    konteks={p.nama}
                    daftar={p.lampiran.map((path) => ({ path, url: url.get(path) ?? null }))}
                  />
                  <Link
                    href={`/vendor/${vendorId}/paket/${p.id}/ubah`}
                    className="tombol-sekunder"
                    aria-label={`Ubah paket ${p.nama}`}
                  >
                    Ubah paket
                  </Link>
                </li>
              );
            })}
          </ul>
          <p>
            <Link href={`/vendor/${vendorId}/paket/baru`} className="tombol-utama">
              Tambah paket
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
