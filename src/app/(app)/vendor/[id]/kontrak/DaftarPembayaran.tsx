'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { Rupiah } from '@/components/Rupiah';
import { StatusLabel } from '@/components/StatusLabel';
import { UnggahLampiran, type BerkasLampiran } from '@/components/UnggahLampiran';
import { formatRupiah } from '@/lib/rupiah';
import { formatTanggal } from '@/lib/tanggal';
import { hapusPembayaran, type NilaiPembayaran } from './actions';
import { FormPembayaran, LABEL_JENIS, type PihakPilihan } from './FormPembayaran';
import { FormTandaiDibayar } from './FormTandaiDibayar';

export type BarisPembayaran = {
  id: string;
  jenis: keyof typeof LABEL_JENIS;
  nominal: number;
  status: 'terjadwal' | 'dibayar';
  jatuh_tempo: string | null;
  tanggal_bayar: string | null;
  pihak_id: string | null;
  pihak_nama: string | null;
  catatan: string | null;
  bukti: BerkasLampiran[];
  diubah: string;
};

type Mode = { tipe: 'tambah' } | { tipe: 'ubah' | 'bayar'; id: string } | null;

function awalDari(b: BarisPembayaran, kontrakId: string): NilaiPembayaran {
  return {
    id: b.id,
    kontrak_id: kontrakId,
    jenis: b.jenis,
    nominal: formatRupiah(b.nominal).replace('Rp ', ''),
    status: b.status,
    jatuh_tempo: b.jatuh_tempo ?? '',
    tanggal_bayar: b.tanggal_bayar ?? '',
    pihak_id: b.pihak_id ?? '',
    catatan: b.catatan ?? '',
  };
}

export function DaftarPembayaran({
  kontrakId,
  baris,
  pihak,
  hariIni,
}: {
  kontrakId: string;
  baris: BarisPembayaran[];
  pihak: PihakPilihan[];
  hariIni: string;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [hapus, setHapus] = useState<BarisPembayaran>();
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const tombolBatal = useRef<HTMLButtonElement>(null);
  const tutup = useCallback(() => setMode(null), []);

  function konfirmasiHapus() {
    if (!hapus) return;
    const id = hapus.id;
    mulai(async () => {
      const hasil = await hapusPembayaran(id);
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
        <p className="teks-lembut">Belum ada pembayaran.</p>
      ) : (
        <ul className="daftar-kartu">
          {baris.map((b) => {
            const jenis = LABEL_JENIS[b.jenis];
            const nama = `${jenis} ${formatRupiah(b.nominal)}`;
            if (mode?.tipe === 'ubah' && mode.id === b.id) {
              return (
                <li key={b.id} className="kartu">
                  <FormPembayaran
                    kontrakId={kontrakId}
                    pihak={pihak}
                    hariIni={hariIni}
                    awal={awalDari(b, kontrakId)}
                    selesai={tutup}
                  />
                </li>
              );
            }
            return (
              <li key={b.id} className="kartu">
                <p className="baris-judul">
                  <strong>{jenis}</strong>
                  <Rupiah nilai={b.nominal} />
                  <StatusLabel status={b.status} />
                </p>
                {b.status === 'dibayar' && b.tanggal_bayar && (
                  <p>
                    Dibayar {formatTanggal(b.tanggal_bayar)} oleh {b.pihak_nama ?? 'pihak tidak dikenal'}
                  </p>
                )}
                {b.jatuh_tempo && (
                  <p className={b.status === 'dibayar' ? 'teks-lembut' : undefined}>
                    Jatuh tempo {formatTanggal(b.jatuh_tempo)}
                  </p>
                )}
                {b.catatan && <p>{b.catatan}</p>}
                <div className="baris-tombol">
                  {b.status === 'terjadwal' && (
                    <button
                      type="button"
                      className="tombol-utama"
                      aria-label={`Tandai dibayar: ${nama}`}
                      onClick={() => setMode({ tipe: 'bayar', id: b.id })}
                    >
                      Tandai dibayar
                    </button>
                  )}
                  <button
                    type="button"
                    className="tombol-sekunder"
                    aria-label={`Ubah pembayaran ${nama}`}
                    onClick={() => setMode({ tipe: 'ubah', id: b.id })}
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    className="tombol-bahaya"
                    aria-label={`Hapus pembayaran ${nama}`}
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
                {mode?.tipe === 'bayar' && mode.id === b.id && (
                  <FormTandaiDibayar pembayaranId={b.id} pihak={pihak} hariIni={hariIni} selesai={tutup} />
                )}
                <details className="bukti">
                  <summary>Bukti transfer ({b.bukti.length})</summary>
                  <UnggahLampiran tabel="pembayaran" id={b.id} judul="Bukti transfer" daftar={b.bukti} />
                </details>
                <p className="jejak-audit">{b.diubah}</p>
              </li>
            );
          })}
        </ul>
      )}

      {mode?.tipe === 'tambah' ? (
        <FormPembayaran kontrakId={kontrakId} pihak={pihak} hariIni={hariIni} selesai={tutup} />
      ) : (
        <p>
          <button type="button" className="tombol-utama" onClick={() => setMode({ tipe: 'tambah' })}>
            Tambah pembayaran
          </button>
        </p>
      )}

      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby="judul-hapus-pembayaran"
        onClose={() => setHapus(undefined)}
      >
        <h2 id="judul-hapus-pembayaran">Hapus pembayaran?</h2>
        <p>
          {hapus ? `${LABEL_JENIS[hapus.jenis]} ${formatRupiah(hapus.nominal)}` : ''} akan dihapus dan tidak bisa
          dikembalikan.
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
