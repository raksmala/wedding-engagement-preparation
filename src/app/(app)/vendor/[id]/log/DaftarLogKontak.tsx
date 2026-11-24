'use client';

import Link from 'next/link';
import { useCallback, useRef, useState, useTransition } from 'react';
import { StatusLabel } from '@/components/StatusLabel';
import { formatTanggal } from '@/lib/tanggal';
import { LABEL_SALURAN, type Saluran, type StatusTugas } from '@/lib/tugas';
import { hapusLogKontak } from './actions';
import { FormFollowUp, type EditorPilihan } from './FormFollowUp';
import { FormLogKontak } from './FormLogKontak';

export type BarisLog = {
  id: string;
  tanggal: string;
  saluran: Saluran;
  isi: string;
  diubah: string;
  tugas: { id: string; judul: string; status: StatusTugas; jatuh_tempo: string | null; terlambat: boolean }[];
};

type Mode = { tipe: 'tambah' } | { tipe: 'followup'; id: string } | null;

export function DaftarLogKontak({
  vendorId,
  baris,
  editor,
  picAwal,
  hariIni,
}: {
  vendorId: string;
  baris: BarisLog[];
  editor: EditorPilihan[];
  picAwal: string;
  hariIni: string;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [hapus, setHapus] = useState<BarisLog>();
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const tombolBatal = useRef<HTMLButtonElement>(null);
  const tutup = useCallback(() => setMode(null), []);

  function konfirmasiHapus() {
    if (!hapus) return;
    const id = hapus.id;
    mulai(async () => {
      const hasil = await hapusLogKontak(id);
      setGalat(hasil.error);
      dialog.current?.close();
      setHapus(undefined);
    });
  }

  return (
    <>
      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}
        </p>
      )}
      {baris.length === 0 ? (
        <p className="teks-lembut">Belum ada log kontak.</p>
      ) : (
        <ul className="daftar-kartu" aria-label="Daftar log kontak">
          {baris.map((b) => {
            const tanggal = formatTanggal(b.tanggal);
            return (
              <li key={b.id} className="kartu">
                <p className="baris-judul">
                  <strong>{tanggal}</strong>
                  <span>{LABEL_SALURAN[b.saluran]}</span>
                </p>
                <p className="isi-panjang">{b.isi}</p>
                {b.tugas.length > 0 && (
                  <>
                    <h3>Follow-up</h3>
                    <ul className="daftar-alokasi">
                      {b.tugas.map((t) => (
                        <li key={t.id}>
                          <span>{t.judul}</span>
                          <span>
                            {t.status === 'selesai' ? (
                              <StatusLabel status="selesai" />
                            ) : t.terlambat ? (
                              <StatusLabel status="terlambat" />
                            ) : t.jatuh_tempo ? (
                              `Jatuh tempo ${formatTanggal(t.jatuh_tempo)}`
                            ) : (
                              'Tanpa jatuh tempo'
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="baris-tombol">
                  <button
                    type="button"
                    className="tombol-sekunder"
                    aria-expanded={mode?.tipe === 'followup' && mode.id === b.id}
                    onClick={() => setMode({ tipe: 'followup', id: b.id })}
                  >
                    Buat follow-up
                  </button>
                  <button
                    type="button"
                    className="tombol-bahaya"
                    aria-label={`Hapus log kontak ${tanggal}`}
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
                {mode?.tipe === 'followup' && mode.id === b.id && (
                  <FormFollowUp logKontakId={b.id} editor={editor} picAwal={picAwal} selesai={tutup} />
                )}
                <p className="jejak-audit">{b.diubah}</p>
              </li>
            );
          })}
        </ul>
      )}

      {mode?.tipe === 'tambah' ? (
        <FormLogKontak vendorId={vendorId} hariIni={hariIni} selesai={tutup} />
      ) : (
        <p className="baris-tombol">
          <button type="button" className="tombol-utama" onClick={() => setMode({ tipe: 'tambah' })}>
            Tambah log kontak
          </button>
          <Link href="/tugas" className="tautan-aksi">
            Lihat semua tugas
          </Link>
        </p>
      )}

      <dialog ref={dialog} className="dialog" aria-labelledby="judul-hapus-log" onClose={() => setHapus(undefined)}>
        <h2 id="judul-hapus-log">Hapus log kontak?</h2>
        <p>
          Log kontak {hapus ? formatTanggal(hapus.tanggal) : ''} akan dihapus dan tidak bisa dikembalikan. Tugas
          follow-up dari log ini tetap ada.
        </p>
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
