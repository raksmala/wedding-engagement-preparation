'use client';

import { useRef, useState, useTransition } from 'react';
import { parseRupiah } from '@/lib/rupiah';
import { pilihPaket } from './actions';

type Acara = { id: string; nama: string };

export function PilihPaket({
  paketId,
  namaPaket,
  namaVendor,
  acara,
}: {
  paketId: string;
  namaPaket: string;
  namaVendor: string;
  acara: Acara[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [isian, setIsian] = useState<Record<string, string>>({});
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();

  const banyak = acara.length > 1;
  const tanpaAcara = acara.length === 0;
  const nominal = acara.map((a) => parseRupiah(isian[a.id] ?? ''));
  const lengkap = !tanpaAcara && (!banyak || nominal.every((n) => n !== null));

  function simpan() {
    setGalat(undefined);
    mulai(async () => {
      const alokasi = banyak ? acara.map((a, i) => ({ acara_id: a.id, nominal: nominal[i] as number })) : null;
      const hasil = await pilihPaket(paketId, alokasi);
      if (hasil.error) {
        setGalat(hasil.error);
        return;
      }
      dialog.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        className="tombol-utama"
        aria-label={`Pilih paket ini: ${namaPaket} dari ${namaVendor}`}
        onClick={() => {
          setGalat(undefined);
          dialog.current?.showModal();
        }}
      >
        Pilih paket ini
      </button>
      <dialog ref={dialog} className="dialog" aria-labelledby={`judul-pilih-${paketId}`}>
        <h2 id={`judul-pilih-${paketId}`}>Pilih paket {namaPaket}?</h2>
        {tanpaAcara ? (
          <p>Vendor ini belum terhubung ke acara. Hubungkan ke acara lewat halaman ubah vendor dulu.</p>
        ) : banyak ? (
          <>
            <p>Vendor ini melayani {acara.length} acara. Isi harga untuk tiap acara.</p>
            <div className="form">
              {acara.map((a) => (
                <label key={a.id}>
                  Nominal {a.nama}
                  <input
                    inputMode="numeric"
                    placeholder="1.500.000"
                    value={isian[a.id] ?? ''}
                    onChange={(e) => setIsian({ ...isian, [a.id]: e.target.value })}
                  />
                </label>
              ))}
            </div>
          </>
        ) : (
          <p>
            Vendor {namaVendor} menjadi Booked dan kontraknya dibuat dari harga paket ini. Paket lain di kategori
            dan acara yang sama ditandai tidak dipilih.
          </p>
        )}
        {galat && (
          <p role="alert" className="pesan-galat">
            {galat}
          </p>
        )}
        <div className="baris-tombol">
          <button type="button" className="tombol-utama" onClick={simpan} disabled={memproses || !lengkap}>
            {memproses ? 'Menyimpan...' : 'Pilih paket'}
          </button>
          <button type="button" className="tombol-sekunder" autoFocus onClick={() => dialog.current?.close()}>
            Batal
          </button>
        </div>
      </dialog>
    </>
  );
}
