import Link from 'next/link';
import { Rupiah } from '@/components/Rupiah';
import { StatusLabel, type StatusVendor } from '@/components/StatusLabel';
import { UnggahLampiran } from '@/components/UnggahLampiran';
import { embedSatu } from '@/lib/embed';
import { createClient } from '@/lib/supabase/server';
import { formatTanggal, formatTanggalJamWib, hariIniJakarta } from '@/lib/tanggal';
import { urlLampiran } from '@/lib/urlLampiran';
import { AksiKontrak } from './AksiKontrak';
import { DaftarPembayaran, type BarisPembayaran } from './DaftarPembayaran';
import { FormKontrak } from './FormKontrak';

type Pengubah = Map<string, string>;

function jejak(diubahOleh: string | null, diubahPada: string, nama: Pengubah): string {
  const pengubah = (diubahOleh && nama.get(diubahOleh)) || 'Editor tidak dikenal';
  return `Terakhir diubah oleh ${pengubah}, ${formatTanggalJamWib(diubahPada)}`;
}

// Urutan tampil: tanggal bayar atau jatuh tempo, lalu waktu dibuat.
function kunciUrut(p: { tanggal_bayar: string | null; jatuh_tempo: string | null; dibuat_pada: string }): string {
  return `${p.tanggal_bayar ?? p.jatuh_tempo ?? '9999-12-31'}|${p.dibuat_pada}`;
}

export async function SeksiKontrak({ vendorId, status }: { vendorId: string; status: StatusVendor }) {
  const supabase = await createClient();

  const [kontrakRes, acaraRes] = await Promise.all([
    supabase
      .from('kontrak')
      .select(
        'id, tanggal_kesepakatan, catatan, lampiran, diubah_pada, diubah_oleh, alokasi_acara(acara_id, nominal)',
      )
      .eq('vendor_id', vendorId)
      .maybeSingle(),
    supabase.from('vendor_acara').select('acara(id, nama, tanggal)').eq('vendor_id', vendorId),
  ]);
  if (kontrakRes.error || acaraRes.error) throw new Error('Gagal memuat kontrak');

  const acara = acaraRes.data
    .map((r) => embedSatu(r.acara))
    .filter((a): a is { id: string; nama: string; tanggal: string | null } => !!a)
    .sort((a, b) => (a.tanggal ?? '9999').localeCompare(b.tanggal ?? '9999') || a.nama.localeCompare(b.nama))
    .map(({ id, nama }) => ({ id, nama }));
  const kontrak = kontrakRes.data;

  if (!kontrak) {
    const bisaBuat = status === 'booked' || status === 'survei_nego';
    return (
      <section aria-labelledby="judul-kontrak" className="bagian">
        <h2 id="judul-kontrak">Kontrak</h2>
        {bisaBuat && acara.length > 0 ? (
          <>
            <p>Belum ada kontrak. Pilih paket di halaman Bandingkan, atau buat kontrak langsung.</p>
            <FormKontrak vendorId={vendorId} acara={acara} />
          </>
        ) : bisaBuat ? (
          <>
            <p>Vendor ini belum terhubung ke acara, jadi kontrak belum bisa dibuat.</p>
            <Link href={`/vendor/${vendorId}/ubah`} className="tombol-utama">
              Hubungkan ke acara
            </Link>
          </>
        ) : (
          <p className="teks-lembut">Kontrak dibuat saat paket dipilih, atau saat vendor masuk tahap Survei/Nego.</p>
        )}
      </section>
    );
  }

  const [ringkasanRes, bayarRes, pihakRes] = await Promise.all([
    supabase.from('ringkasan_kontrak').select('total, terbayar, sisa, lunas').eq('kontrak_id', kontrak.id).maybeSingle(),
    supabase
      .from('pembayaran')
      .select(
        'id, jenis, nominal, status, jatuh_tempo, tanggal_bayar, pihak_id, catatan, bukti, dibuat_pada, diubah_pada, diubah_oleh',
      )
      .eq('kontrak_id', kontrak.id),
    supabase.from('pihak').select('id, nama, arsip').order('urutan').order('nama'),
  ]);
  if (ringkasanRes.error || bayarRes.error || pihakRes.error) throw new Error('Gagal memuat kontrak');

  const ringkasan = ringkasanRes.data;
  const total = Number(ringkasan?.total ?? 0);
  const terbayar = Number(ringkasan?.terbayar ?? 0);
  const sisa = Number(ringkasan?.sisa ?? 0);
  const lunas = ringkasan?.lunas ?? false;

  const pembayaran = [...bayarRes.data].sort((a, b) => kunciUrut(a).localeCompare(kunciUrut(b)));
  const namaPihak = new Map(pihakRes.data.map((p) => [p.id, p.nama]));
  const pihakAktif = pihakRes.data.filter((p) => !p.arsip).map(({ id, nama }) => ({ id, nama }));

  const idEditor = [kontrak.diubah_oleh, ...pembayaran.map((p) => p.diubah_oleh)].filter((x): x is string => !!x);
  const pengubah: Pengubah = new Map();
  if (idEditor.length > 0) {
    const { data } = await supabase.from('editor').select('id, nama').in('id', [...new Set(idEditor)]);
    for (const e of data ?? []) pengubah.set(e.id, e.nama);
  }

  const url = await urlLampiran(supabase, [...kontrak.lampiran, ...pembayaran.flatMap((p) => p.bukti)]);
  const nominalAlokasi = new Map(kontrak.alokasi_acara.map((a) => [a.acara_id, Number(a.nominal)]));
  const rincian = acara.filter((a) => nominalAlokasi.has(a.id));
  const barisPembayaran: BarisPembayaran[] = pembayaran.map((p) => ({
    id: p.id,
    jenis: p.jenis,
    nominal: Number(p.nominal),
    status: p.status,
    jatuh_tempo: p.jatuh_tempo,
    tanggal_bayar: p.tanggal_bayar,
    pihak_id: p.pihak_id,
    pihak_nama: p.pihak_id ? (namaPihak.get(p.pihak_id) ?? null) : null,
    catatan: p.catatan,
    bukti: p.bukti.map((path: string) => ({ path, url: url.get(path) ?? null })),
    diubah: jejak(p.diubah_oleh, p.diubah_pada, pengubah),
  }));

  return (
    <>
      <section aria-labelledby="judul-kontrak" className="bagian">
        <h2 id="judul-kontrak">Kontrak</h2>
        <p data-testid="status-kontrak">
          <StatusLabel status={lunas ? 'lunas' : 'belum_lunas'} />
        </p>
        {sisa < 0 && (
          <p className="kelebihan">
            Kelebihan bayar <Rupiah nilai={-sisa} />
          </p>
        )}

        <h3>Harga per acara</h3>
        <ul className="daftar-alokasi">
          {rincian.map((a) => (
            <li key={a.id}>
              <span>{a.nama}</span>
              <Rupiah nilai={nominalAlokasi.get(a.id) ?? 0} />
            </li>
          ))}
        </ul>

        <dl className="rincian ringkasan">
          <div>
            <dt>Total</dt>
            <dd>
              <Rupiah nilai={total} />
            </dd>
          </div>
          <div>
            <dt>Terbayar</dt>
            <dd>
              <Rupiah nilai={terbayar} />
            </dd>
          </div>
          <div>
            <dt>Sisa Tagihan</dt>
            <dd>
              <Rupiah nilai={Math.max(0, sisa)} />
            </dd>
          </div>
          <div>
            <dt>Tanggal kesepakatan</dt>
            <dd className={kontrak.tanggal_kesepakatan ? undefined : 'teks-lembut'}>
              {kontrak.tanggal_kesepakatan ? formatTanggal(kontrak.tanggal_kesepakatan) : 'Belum diisi'}
            </dd>
          </div>
          {kontrak.catatan && (
            <div>
              <dt>Catatan</dt>
              <dd>{kontrak.catatan}</dd>
            </div>
          )}
        </dl>

        <AksiKontrak
          kontrakId={kontrak.id}
          acara={acara}
          alokasi={Object.fromEntries(nominalAlokasi)}
          tanggal={kontrak.tanggal_kesepakatan ?? ''}
          catatan={kontrak.catatan ?? ''}
        />

        <UnggahLampiran
          tabel="kontrak"
          id={kontrak.id}
          konteks="kontrak"
          daftar={kontrak.lampiran.map((path: string) => ({ path, url: url.get(path) ?? null }))}
        />
        <p className="jejak-audit">{jejak(kontrak.diubah_oleh, kontrak.diubah_pada, pengubah)}</p>
      </section>

      <section aria-labelledby="judul-pembayaran" className="bagian">
        <h2 id="judul-pembayaran">Pembayaran</h2>
        <DaftarPembayaran
          kontrakId={kontrak.id}
          baris={barisPembayaran}
          pihak={pihakAktif}
          hariIni={hariIniJakarta()}
        />
      </section>
    </>
  );
}
