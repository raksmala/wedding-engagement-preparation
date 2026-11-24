'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { hapusAcara } from '../actions';

export function TombolHapus({ id, nama }: { id: string; nama: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();

  function hapus() {
    mulai(async () => {
      const hasil = await hapusAcara(id);
      if (hasil.error) {
        setGalat(hasil.error);
        return;
      }
      dialog.current?.close();
      router.push('/acara');
    });
  }

  return (
    <>
      <button
        type="button"
        className="tombol-bahaya"
        onClick={() => {
          setGalat(undefined);
          dialog.current?.showModal();
        }}
      >
        Hapus acara
      </button>
      <dialog ref={dialog} className="dialog" aria-labelledby="judul-hapus">
        <h2 id="judul-hapus">Hapus {nama}?</h2>
        <p>Acara yang dihapus tidak bisa dikembalikan.</p>
        {galat && (
          <p role="alert" className="pesan-galat">
            {galat}
          </p>
        )}
        <div className="baris-tombol">
          <button type="button" className="tombol-bahaya" onClick={hapus} disabled={memproses}>
            Hapus
          </button>
          <button type="button" className="tombol-sekunder" onClick={() => dialog.current?.close()}>
            Batal
          </button>
        </div>
      </dialog>
    </>
  );
}
