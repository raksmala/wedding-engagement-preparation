import type { Metadata } from 'next';
import { JudulHalaman } from '@/components/JudulHalaman';
import { Rupiah } from '@/components/Rupiah';
import { StatusLabel } from '@/components/StatusLabel';
import type { IsiShareLink } from '@/lib/shareLink';
import { createAnonClient } from '@/lib/supabase/anon';
import { formatTanggal, hariIniJakarta } from '@/lib/tanggal';
import { tugasTerlambat } from '@/lib/tugas';

// Selalu dibaca ulang dari database, supaya link yang dicabut langsung berhenti menampilkan data.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rendy & Dinar',
  robots: { index: false, follow: false, nocache: true },
  // Token ada di URL, jadi tidak dikirim ke situs lain lewat header Referer.
  referrer: 'no-referrer',
};

type Acara = NonNullable<IsiShareLink['acara']>[number];
type Vendor = NonNullable<IsiShareLink['vendor']>[number];
type Tugas = NonNullable<IsiShareLink['tugas']>[number];
type Keuangan = NonNullable<IsiShareLink['keuangan']>;

function Kerangka({ children }: { children: React.ReactNode }) {
  return (
    <main className="halaman-pembaca">
      <JudulHalaman judul="Rendy & Dinar" />
      {children}
    </main>
  );
}

function SeksiAcara({ acara }: { acara: Acara[] }) {
  return (
    <section className="bagian" aria-labelledby="judul-acara">
      <h2 id="judul-acara">Acara</h2>
      {acara.length === 0 ? (
        <p className="teks-lembut">Belum ada acara.</p>
      ) : (
        <ul className="daftar-kartu" aria-label="Daftar acara">
          {acara.map((a, i) => (
            <li key={i} className="kartu">
              <h3>{a.nama}</h3>
              <p className="teks-lembut">
                {a.tanggal
                  ? formatTanggal(a.tanggal)
                  : a.perkiraan
                    ? `Perkiraan: ${a.perkiraan}`
                    : 'Tanggal belum pasti'}
              </p>
              {a.lokasi && <p>{a.lokasi}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SeksiVendor({ vendor }: { vendor: Vendor[] }) {
  return (
    <section className="bagian" aria-labelledby="judul-vendor">
      <h2 id="judul-vendor">Vendor</h2>
      {vendor.length === 0 ? (
        <p className="teks-lembut">Belum ada vendor.</p>
      ) : (
        <ul className="daftar-kartu" aria-label="Daftar vendor">
          {vendor.map((v, i) => (
            <li key={i} className="kartu">
              <h3>{v.nama}</h3>
              <p className="teks-lembut">{v.kategori}</p>
              <p>
                <StatusLabel status={v.status} />
              </p>
              <p className={v.acara.length > 0 ? undefined : 'teks-lembut'}>
                {v.acara.length > 0 ? `Acara: ${v.acara.join(', ')}` : 'Belum terhubung ke acara'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SeksiTugas({ tugas }: { tugas: Tugas[] }) {
  const hariIni = hariIniJakarta();
  return (
    <section className="bagian" aria-labelledby="judul-tugas">
      <h2 id="judul-tugas">Tugas</h2>
      {tugas.length === 0 ? (
        <p className="teks-lembut">Belum ada tugas.</p>
      ) : (
        <ul className="daftar-kartu" aria-label="Daftar tugas">
          {tugas.map((t, i) => (
            <li key={i} className="kartu">
              <p className="baris-judul">
                <strong>{t.judul}</strong>
                {t.status === 'selesai' ? (
                  <StatusLabel status="selesai" />
                ) : tugasTerlambat(t, hariIni) ? (
                  <StatusLabel status="terlambat" />
                ) : (
                  <span className="status-label status-teks">Belum selesai</span>
                )}
              </p>
              <p>PIC {t.pic}</p>
              <p className={t.jatuh_tempo ? undefined : 'teks-lembut'}>
                {t.jatuh_tempo ? `Jatuh tempo ${formatTanggal(t.jatuh_tempo)}` : 'Tanpa jatuh tempo'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SeksiKeuangan({ keuangan }: { keuangan: Keuangan }) {
  const totalKontribusi = keuangan.kontribusi.reduce((t, k) => t + k.total, 0);
  return (
    <section className="bagian" aria-labelledby="judul-keuangan">
      <h2 id="judul-keuangan">Keuangan</h2>

      <h3>Kontrak vendor</h3>
      {keuangan.vendor.length === 0 ? (
        <p className="teks-lembut">Belum ada kontrak vendor.</p>
      ) : (
        <ul className="daftar-kartu" aria-label="Kontrak vendor">
          {keuangan.vendor.map((v, i) => {
            const sisa = v.sisa;
            return (
              <li key={i} className="kartu">
                <p className="baris-judul">
                  <strong>{v.nama}</strong>
                  {/* Vendor batal tidak akan dilunasi, jadi statusnya Batal, bukan Lunas atau Belum lunas. */}
                  <StatusLabel status={v.status === 'batal' ? 'batal' : sisa <= 0 ? 'lunas' : 'belum_lunas'} />
                </p>
                {sisa < 0 && (
                  <p className="kelebihan">
                    Kelebihan bayar <Rupiah nilai={-sisa} />
                  </p>
                )}
                <dl className="rincian">
                  <div>
                    <dt>Total</dt>
                    <dd>
                      <Rupiah nilai={v.total} />
                    </dd>
                  </div>
                  <div>
                    <dt>Terbayar</dt>
                    <dd>
                      <Rupiah nilai={v.terbayar} />
                    </dd>
                  </div>
                  <div>
                    <dt>Sisa Tagihan</dt>
                    <dd>
                      <Rupiah nilai={Math.max(0, sisa)} />
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="judul-kontribusi">Kontribusi per Pihak</h3>
      {keuangan.kontribusi.length === 0 ? (
        <p className="teks-lembut">Belum ada kontribusi.</p>
      ) : (
        <>
          <p className="total-kontribusi">
            <span>Total dibayar</span> <Rupiah nilai={totalKontribusi} />
          </p>
          <ul className="daftar-alokasi" aria-label="Kontribusi per Pihak">
            {keuangan.kontribusi.map((k, i) => (
              <li key={i}>
                <span>{k.nama}</span>
                <Rupiah nilai={k.total} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default async function HalamanPembaca({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAnonClient();
  // Satu-satunya data yang dibaca halaman ini. Bagian yang tidak dipilih tidak ada di hasilnya.
  const { data, error } = await supabase.rpc('baca_share_link', { p_token: token });
  if (error) throw new Error('Gagal memuat Share Link');

  const isi = data as unknown as IsiShareLink | null;
  if (!isi) {
    return (
      <Kerangka>
        <p className="pesan-tidak-aktif">Link ini sudah tidak aktif.</p>
        <p className="teks-lembut">Minta link yang baru ke Rendy atau Dinar.</p>
      </Kerangka>
    );
  }

  return (
    <Kerangka>
      <p className="label-share">{isi.label}</p>
      <p className="teks-lembut">Persiapan lamaran dan pernikahan Rendy dan Dinar. Halaman ini hanya untuk dilihat.</p>
      {isi.acara && <SeksiAcara acara={isi.acara} />}
      {isi.vendor && <SeksiVendor vendor={isi.vendor} />}
      {isi.tugas && <SeksiTugas tugas={isi.tugas} />}
      {isi.keuangan && <SeksiKeuangan keuangan={isi.keuangan} />}
    </Kerangka>
  );
}
