'use client';

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
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
  // Contoh "/s/{token}". Null untuk link yang sudah dicabut.
  path: string | null;
};

type Pesan = { id: string; teks: string; berhasil: boolean };

const tanpaLangganan = () => () => {};

// Origin diambil dari alamat yang sedang dibuka di browser, bukan dari header request.
// Saat render server dan hidrasi nilainya kosong, jadi kotak link menampilkan path saja dulu
// dan hasil server sama dengan browser.
function useOrigin(): string {
  return useSyncExternalStore(
    tanpaLangganan,
    () => window.location.origin,
    () => '',
  );
}

export function DaftarShareLink({ baris }: { baris: BarisShareLink[] }) {
  const [cabut, setCabut] = useState<BarisShareLink>();
  const [galat, setGalat] = useState<string>();
  const [pesan, setPesan] = useState<Pesan>();
  // Link yang baru dicabut. Fokus dipindah ke judul kartunya setelah daftar diperbarui.
  const [fokus, setFokus] = useState<string>();
  const sudahDifokus = useRef<string>(undefined);
  const origin = useOrigin();
  const [memproses, mulai] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const tombolBatal = useRef<HTMLButtonElement>(null);

  // Tombol Cabut hilang setelah link dicabut, jadi fokus tidak boleh tertinggal di body.
  useEffect(() => {
    if (!fokus || sudahDifokus.current === fokus) return;
    if (baris.find((b) => b.id === fokus)?.dicabut_pada) {
      document.getElementById(`judul-share-${fokus}`)?.focus();
      sudahDifokus.current = fokus;
    }
  }, [fokus, baris]);

  // Gagal mencabut: fokus ke pesan galat supaya tidak jatuh ke body.
  useEffect(() => {
    if (galat) document.getElementById('galat-share')?.focus();
  }, [galat]);

  async function salin(b: BarisShareLink) {
    if (!b.path) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${b.path}`);
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
      if (!hasil.error) setFokus(id);
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
          <p role="alert" id="galat-share" tabIndex={-1} className="pesan-galat">
            {galat}
          </p>
        )}
        {baris.length === 0 ? (
          <Kosong pesan="Belum ada Share Link. Isi nama link dan pilih bagiannya di atas, lalu bagikan linknya ke keluarga." />
        ) : (
          <ul className="daftar-kartu" aria-label="Daftar Share Link">
            {baris.map((b) => (
              <li key={b.id} className="kartu">
                <h3 id={`judul-share-${b.id}`} tabIndex={-1}>
                  {b.label}
                </h3>
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
                {b.path && (
                  <>
                    <label className="tautan-share">
                      Link
                      <input
                        id={`link-${b.id}`}
                        type="text"
                        readOnly
                        value={`${origin}${b.path}`}
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
