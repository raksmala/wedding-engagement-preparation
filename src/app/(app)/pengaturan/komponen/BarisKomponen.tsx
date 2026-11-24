'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LABEL_TIPE_KOMPONEN, type TipeKomponen } from '@/lib/komponen';
import { hapusKomponen, urutkanKomponen } from './actions';

export type KomponenBaris = {
  id: string;
  nama: string;
  tipe: TipeKomponen;
  satuan: string | null;
  jumlahNilai: number;
};

export function BarisKomponen({
  kategoriId,
  daftar,
}: {
  kategoriId: string;
  daftar: KomponenBaris[];
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const tombolBatal = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState<KomponenBaris>();
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();

  function geser(indeks: number, arah: -1 | 1) {
    const urutan = daftar.map((k) => k.id);
    [urutan[indeks], urutan[indeks + arah]] = [urutan[indeks + arah], urutan[indeks]];
    setGalat(undefined);
    mulai(async () => {
      const hasil = await urutkanKomponen(kategoriId, urutan);
      if (hasil.error) setGalat(hasil.error);
      else router.refresh();
    });
  }

  function hapus() {
    if (!target) return;
    const id = target.id;
    mulai(async () => {
      const hasil = await hapusKomponen(id);
      if (hasil.error) setGalat(hasil.error);
      else router.refresh();
      dialog.current?.close();
    });
  }

  return (
    <>
      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}
        </p>
      )}
      <ol className="daftar-kartu">
        {daftar.map((k, i) => (
          <li key={k.id} className="kartu">
            <h3>{k.nama}</h3>
            <p className="teks-lembut">
              {LABEL_TIPE_KOMPONEN[k.tipe]}
              {k.satuan ? `, satuan ${k.satuan}` : ''}
            </p>
            <div className="baris-tombol">
              <button
                type="button"
                className="tombol-sekunder"
                aria-label={`Naik ${k.nama}`}
                disabled={memproses || i === 0}
                onClick={() => geser(i, -1)}
              >
                Naik
              </button>
              <button
                type="button"
                className="tombol-sekunder"
                aria-label={`Turun ${k.nama}`}
                disabled={memproses || i === daftar.length - 1}
                onClick={() => geser(i, 1)}
              >
                Turun
              </button>
              <Link
                href={`/pengaturan/komponen?kategori=${kategoriId}&ubah=${k.id}`}
                className="tombol-sekunder"
                aria-label={`Ubah ${k.nama}`}
              >
                Ubah
              </Link>
              <button
                type="button"
                className="tombol-bahaya"
                aria-label={`Hapus ${k.nama}`}
                onClick={() => {
                  setTarget(k);
                  setGalat(undefined);
                  dialog.current?.showModal();
                  tombolBatal.current?.focus();
                }}
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
      </ol>
      <dialog ref={dialog} className="dialog" aria-labelledby="judul-hapus-komponen">
        <h2 id="judul-hapus-komponen">Hapus {target?.nama}?</h2>
        <p>
          {target && target.jumlahNilai > 0
            ? `Nilainya di ${target.jumlahNilai} paket ikut terhapus.`
            : 'Komponen yang dihapus tidak bisa dikembalikan.'}
        </p>
        <div className="baris-tombol">
          <button type="button" className="tombol-bahaya" onClick={hapus} disabled={memproses}>
            Hapus
          </button>
          <button
            type="button"
            className="tombol-sekunder"
            ref={tombolBatal}
            onClick={() => dialog.current?.close()}
          >
            Batal
          </button>
        </div>
      </dialog>
    </>
  );
}
