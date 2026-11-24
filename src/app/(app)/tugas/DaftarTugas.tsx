'use client';

import Link from 'next/link';
import { useCallback, useRef, useState, useTransition } from 'react';
import { StatusLabel } from '@/components/StatusLabel';
import { formatTanggal } from '@/lib/tanggal';
import type { StatusTugas } from '@/lib/tugas';
import { bukaLagiTugas, hapusTugas, selesaikanTugas, type NilaiTugas } from './actions';
import { FormTugas, type Pilihan } from './FormTugas';

export type BarisTugas = {
  id: string;
  judul: string;
  catatan: string | null;
  pic_id: string;
  pic_nama: string;
  jatuh_tempo: string | null;
  status: StatusTugas;
  terlambat: boolean;
  vendor: Pilihan | null;
  acara: Pilihan | null;
  // Tanggal Log Kontak asal, kalau Tugas ini follow-up.
  dari_log: string | null;
  diubah: string;
};

type Mode = { tipe: 'tambah' } | { tipe: 'ubah'; id: string } | null;

function awalDari(b: BarisTugas): NilaiTugas {
  return {
    id: b.id,
    judul: b.judul,
    catatan: b.catatan ?? '',
    pic_id: b.pic_id,
    jatuh_tempo: b.jatuh_tempo ?? '',
    vendor_id: b.vendor?.id ?? '',
    acara_id: b.acara?.id ?? '',
  };
}

export function DaftarTugas({
  baris,
  editor,
  vendor,
  acara,
  picAwal,
  kosong,
}: {
  baris: BarisTugas[];
  editor: Pilihan[];
  vendor: Pilihan[];
  acara: Pilihan[];
  picAwal: string;
  kosong: React.ReactNode;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [hapus, setHapus] = useState<BarisTugas>();
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const tombolBatal = useRef<HTMLButtonElement>(null);
  const tutup = useCallback(() => setMode(null), []);
  const pilihan = { editor, vendor, acara, picAwal };

  function jalankan(aksi: () => Promise<{ error?: string }>) {
    setGalat(undefined);
    mulai(async () => {
      const hasil = await aksi();
      setGalat(hasil.error);
    });
  }

  function konfirmasiHapus() {
    if (!hapus) return;
    const id = hapus.id;
    mulai(async () => {
      const hasil = await hapusTugas(id);
      setGalat(hasil.error);
      dialog.current?.close();
      setHapus(undefined);
    });
  }

  return (
    <>
      {mode?.tipe === 'tambah' ? (
        <FormTugas {...pilihan} selesai={tutup} />
      ) : (
        <p>
          <button type="button" className="tombol-utama" onClick={() => setMode({ tipe: 'tambah' })}>
            Tambah tugas
          </button>
        </p>
      )}

      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}
        </p>
      )}

      {baris.length === 0 ? (
        kosong
      ) : (
        <ul className="daftar-kartu" aria-label="Daftar tugas">
          {baris.map((b) => {
            if (mode?.tipe === 'ubah' && mode.id === b.id) {
              return (
                <li key={b.id} className="kartu">
                  <FormTugas
                    {...pilihan}
                    awal={awalDari(b)}
                    vendorTerkunci={b.dari_log ? (b.vendor?.nama ?? 'Vendor tidak dikenal') : undefined}
                    selesai={tutup}
                  />
                </li>
              );
            }
            return (
              <li key={b.id} className="kartu">
                <p className="baris-judul">
                  <strong>{b.judul}</strong>
                  {b.status === 'selesai' ? (
                    <StatusLabel status="selesai" />
                  ) : (
                    b.terlambat && <StatusLabel status="terlambat" />
                  )}
                </p>
                <p>PIC {b.pic_nama}</p>
                <p className={b.jatuh_tempo ? undefined : 'teks-lembut'}>
                  {b.jatuh_tempo ? `Jatuh tempo ${formatTanggal(b.jatuh_tempo)}` : 'Tanpa jatuh tempo'}
                </p>
                {b.vendor && (
                  <p>
                    Vendor <Link href={`/vendor/${b.vendor.id}`}>{b.vendor.nama}</Link>
                  </p>
                )}
                {b.acara && (
                  <p>
                    Acara <Link href={`/acara/${b.acara.id}`}>{b.acara.nama}</Link>
                  </p>
                )}
                {b.dari_log && <p className="teks-lembut">Follow-up dari log kontak {formatTanggal(b.dari_log)}</p>}
                {b.catatan && <p className="isi-panjang">{b.catatan}</p>}
                <div className="baris-tombol">
                  {b.status === 'belum' ? (
                    <button
                      type="button"
                      className="tombol-utama"
                      aria-label={`Tandai selesai: ${b.judul}`}
                      disabled={memproses}
                      onClick={() => jalankan(() => selesaikanTugas(b.id))}
                    >
                      Selesai
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tombol-sekunder"
                      aria-label={`Buka lagi: ${b.judul}`}
                      disabled={memproses}
                      onClick={() => jalankan(() => bukaLagiTugas(b.id))}
                    >
                      Buka lagi
                    </button>
                  )}
                  <button
                    type="button"
                    className="tombol-sekunder"
                    aria-label={`Ubah tugas ${b.judul}`}
                    onClick={() => setMode({ tipe: 'ubah', id: b.id })}
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    className="tombol-bahaya"
                    aria-label={`Hapus tugas ${b.judul}`}
                    disabled={memproses}
                    onClick={() => {
                      setGalat(undefined);
                      setHapus(b);
                      dialog.current?.showModal();
                      tombolBatal.current?.focus();
                    }}
                  >
                    Hapus
                  </button>
                </div>
                <p className="jejak-audit">{b.diubah}</p>
              </li>
            );
          })}
        </ul>
      )}

      <dialog ref={dialog} className="dialog" aria-labelledby="judul-hapus-tugas" onClose={() => setHapus(undefined)}>
        <h2 id="judul-hapus-tugas">Hapus tugas?</h2>
        <p>{hapus ? `"${hapus.judul}"` : 'Tugas ini'} akan dihapus dan tidak bisa dikembalikan.</p>
        <div className="baris-tombol">
          <button type="button" className="tombol-bahaya" onClick={konfirmasiHapus} disabled={memproses}>
            Hapus
          </button>
          <button type="button" className="tombol-sekunder" ref={tombolBatal} onClick={() => dialog.current?.close()}>
            Batal
          </button>
        </div>
      </dialog>
    </>
  );
}
