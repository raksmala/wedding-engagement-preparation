'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { Rupiah } from '@/components/Rupiah';
import { StatusLabel } from '@/components/StatusLabel';
import { formatTanggal } from '@/lib/tanggal';
import { selesaikanTugas } from './tugas/actions';
import type { PihakPilihan } from './vendor/[id]/kontrak/FormPembayaran';
import { FormTandaiDibayar } from './vendor/[id]/kontrak/FormTandaiDibayar';

type Tautan = { id: string; nama: string };

export type BarisAgenda = {
  jenis: 'tugas' | 'pembayaran';
  id: string;
  judul: string;
  jatuh_tempo: string;
  nominal: number | null;
  pic_nama: string | null;
  vendor: Tautan | null;
  acara: Tautan | null;
};

export function ItemAgenda({
  item,
  terlambat,
  pihak,
  hariIni,
  idJudulKelompok,
}: {
  item: BarisAgenda;
  terlambat: boolean;
  pihak: PihakPilihan[];
  hariIni: string;
  // Judul kelompok (tabIndex -1) yang menerima fokus setelah item ini selesai.
  idJudulKelompok: string;
}) {
  const [bayar, setBayar] = useState(false);
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();
  const tombolBayar = useRef<HTMLButtonElement>(null);
  const idFormBayar = `bayar-${item.id}`;

  // Setelah berhasil, revalidatePath('/') di action membuat item hilang dari dashboard.
  // Fokus dipindah ke judul kelompok supaya tidak jatuh ke body saat tombolnya hilang.
  function fokusKeJudul() {
    document.getElementById(idJudulKelompok)?.focus();
  }

  function selesai() {
    setGalat(undefined);
    mulai(async () => {
      const hasil = await selesaikanTugas(item.id);
      if (hasil.error) setGalat(hasil.error);
      else fokusKeJudul();
    });
  }

  function tutupFormBayar() {
    setBayar(false);
    // Kalau tersimpan, fokus sudah ada di judul kelompok. Kalau Batal, fokus kembali ke tombolnya.
    if (document.activeElement?.id !== idJudulKelompok) tombolBayar.current?.focus();
  }

  return (
    <li className="kartu">
      <p className="baris-judul">
        <strong>{item.judul}</strong>
        {item.nominal !== null && <Rupiah nilai={item.nominal} />}
        {terlambat && <StatusLabel status="terlambat" />}
      </p>
      <p className="teks-lembut">
        {item.jenis === 'tugas' ? 'Tugas' : 'Pembayaran Terjadwal'}, jatuh tempo {formatTanggal(item.jatuh_tempo)}
      </p>
      {item.pic_nama && <p>PIC {item.pic_nama}</p>}
      {item.vendor && (
        <p>
          Vendor{' '}
          <Link href={`/vendor/${item.vendor.id}`} className="tautan-aksi">
            {item.vendor.nama}
          </Link>
        </p>
      )}
      {item.acara && (
        <p>
          Acara{' '}
          <Link href={`/acara/${item.acara.id}`} className="tautan-aksi">
            {item.acara.nama}
          </Link>
        </p>
      )}
      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}
        </p>
      )}
      <div className="baris-tombol">
        {item.jenis === 'tugas' ? (
          <button
            type="button"
            className="tombol-utama"
            aria-label={`Tandai selesai: ${item.judul}`}
            disabled={memproses}
            onClick={selesai}
          >
            {memproses ? 'Menyimpan...' : 'Selesai'}
          </button>
        ) : (
          <button
            ref={tombolBayar}
            type="button"
            className={bayar ? 'tombol-sekunder' : 'tombol-utama'}
            aria-label={`Tandai dibayar: ${item.judul}`}
            aria-expanded={bayar}
            aria-controls={bayar ? idFormBayar : undefined}
            onClick={() => setBayar((b) => !b)}
          >
            Tandai dibayar
          </button>
        )}
      </div>
      {bayar && (
        <div id={idFormBayar} className="form-agenda">
          <FormTandaiDibayar
            pembayaranId={item.id}
            pihak={pihak}
            hariIni={hariIni}
            label={`Tandai dibayar: ${item.judul}`}
            berhasil={fokusKeJudul}
            selesai={tutupFormBayar}
          />
        </div>
      )}
    </li>
  );
}
