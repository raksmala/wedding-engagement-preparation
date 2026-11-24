'use client';

import { useRef, useState, useTransition } from 'react';
import { Kosong } from '@/components/Kosong';
import { namaBagian } from '@/lib/shareLink';
import { formatTanggalJamWib } from '@/lib/tanggal';
import { cabutShareLink } from './actions';
import { FormShareLink } from './FormShareLink';

export type BarisShareLink = {
  id: string;
  label: string;
  bagian: string[];
  dicabut_pada: string | null;
  // Null untuk link yang sudah dicabut.
  url: string | null;
};

type Pesan = { id: string; teks: string; berhasil: boolean };

export function DaftarShareLink({ baris }: { baris: BarisShareLink[] }) {
  const [cabut, setCabut] = useState<BarisShareLink>();
  const [galat, setGalat] = useState<string>();
  const [pesan, setPesan] = useState<Pesan>();
  const [memproses, mulai] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const tombolBatal = useRef<HTMLButtonElement>(null);

  async function salin(b: BarisShareLink) {
    if (!b.url) return;
    try {
      await navigator.clipboard.writeText(b.url);
      setPesan({ id: b.id, teks: 'Link disalin', berhasil: true });
    } catch {
      // Clipboard tidak tersedia, misalnya izin ditolak browser. Teks link dipilih supaya bisa disalin manual.
      const input = document.getElementById(`link-${b.id}`);
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
      setPesan({
        id: b.id,
        teks: 'Link belum bisa disalin otomatis. Salin manual dari kotak link di atas.',
        berhasil: false,
      });
    }
  }

  function konfirmasiCabut() {
    if (!cabut) return;
    const id = cabut.id;
    mulai(async () => {
      const hasil = await cabutShareLink(id);
      setGalat(hasil.error);
      dialog.current?.close();
      setCabut(undefined);
    });
  }

  return (
    <>
      <section className="bagian" aria-labelledby="judul-buat-share">
        <h2 id="judul-buat-share">Buat Share Link</h2>
        <FormShareLink />
      </section>

      <section className="bagian" aria-labelledby="judul-daftar-share">
        <h2 id="judul-daftar-share">Daftar Share Link</h2>
        {galat && (
          <p role="alert" className="pesan-galat">
            {galat}
          </p>
        )}
        {baris.length === 0 ? (
          <Kosong pesan="Belum ada Share Link. Isi nama link dan pilih bagiannya di atas, lalu bagikan linknya ke keluarga." />
        ) : (
          <ul className="daftar-kartu" aria-label="Daftar Share Link">
            {baris.map((b) => (
              <li key={b.id} className="kartu">
                <h3>{b.label}</h3>
                <p>Bagian: {namaBagian(b.bagian)}</p>
                {b.dicabut_pada ? (
                  <p>
                    <span className="status-label status-lembut">Dicabut</span>{' '}
                    <span className="teks-lembut">{formatTanggalJamWib(b.dicabut_pada)}</span>
                  </p>
                ) : (
                  <p>
                    <span className="status-label status-aksen">Aktif</span>
                  </p>
                )}
                {b.url && (
                  <>
                    <label className="tautan-share">
                      Link
                      <input
                        id={`link-${b.id}`}
                        type="text"
                        readOnly
                        value={b.url}
                        onFocus={(e) => e.currentTarget.select()}
                      />
                    </label>
                    <div className="baris-tombol">
                      <button
                        type="button"
                        className="tombol-utama"
                        aria-label={`Salin link ${b.label}`}
                        onClick={() => salin(b)}
                      >
                        Salin link
                      </button>
                      <button
                        type="button"
                        className="tombol-bahaya"
                        aria-label={`Cabut ${b.label}`}
                        disabled={memproses}
                        onClick={() => {
                          setGalat(undefined);
                          setCabut(b);
                          dialog.current?.showModal();
                          tombolBatal.current?.focus();
                        }}
                      >
                        Cabut
                      </button>
                    </div>
                    {pesan?.id === b.id && (
                      <p role="status" className={pesan.berhasil ? 'pesan-berhasil' : 'pesan-galat'}>
                        {pesan.teks}
                      </p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <dialog ref={dialog} className="dialog" aria-labelledby="judul-cabut-share" onClose={() => setCabut(undefined)}>
        <h2 id="judul-cabut-share">Cabut Share Link?</h2>
        <p>
          Pembaca yang membuka {cabut ? `"${cabut.label}"` : 'link ini'} akan melihat pesan bahwa link sudah tidak
          aktif. Link yang dicabut tidak bisa diaktifkan lagi.
        </p>
        <div className="baris-tombol">
          <button type="button" className="tombol-bahaya" onClick={konfirmasiCabut} disabled={memproses}>
            Cabut
          </button>
          <button type="button" className="tombol-sekunder" ref={tombolBatal} onClick={() => dialog.current?.close()}>
            Batal
          </button>
        </div>
      </dialog>
    </>
  );
}
