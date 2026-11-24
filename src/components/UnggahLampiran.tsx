'use client';

import { useId, useRef, useState, useTransition, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  BUCKET_LAMPIRAN,
  namaFileAman,
  namaTampil,
  PESAN_FILE_SALAH,
  TIPE_LAMPIRAN,
  validasiFileLampiran,
} from '@/lib/lampiran';
import { createClient } from '@/lib/supabase/browser';
import { hapusLampiran, tambahLampiran } from './actionsLampiran';

export type BerkasLampiran = { path: string; url: string | null };

function pesanUnggah(pesan: string): string {
  return /exceed|size|mime|not supported|too large|invalid/i.test(pesan)
    ? PESAN_FILE_SALAH
    : 'Lampiran belum terunggah. Coba lagi.';
}

export function UnggahLampiran({
  tabel,
  id,
  daftar,
  konteks,
}: {
  tabel: string;
  id: string;
  daftar: BerkasLampiran[];
  konteks?: string;
}) {
  const router = useRouter();
  const idInput = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const tombolBatal = useRef<HTMLButtonElement>(null);
  const [galat, setGalat] = useState<string>();
  const [hapus, setHapus] = useState<string>();
  const [memproses, mulai] = useTransition();

  function pilih(e: ChangeEvent<HTMLInputElement>) {
    const berkas = Array.from(e.target.files ?? []);
    e.target.value = '';
    setGalat(undefined);
    if (berkas.length === 0) return;
    for (const f of berkas) {
      const salah = validasiFileLampiran(f);
      if (salah) {
        setGalat(salah);
        return;
      }
    }
    mulai(async () => {
      const supabase = createClient();
      const sekarang = Date.now();
      for (const [i, f] of berkas.entries()) {
        const path = `${tabel}/${id}/${namaFileAman(f.name, sekarang + i)}`;
        const { error } = await supabase.storage
          .from(BUCKET_LAMPIRAN)
          .upload(path, f, { contentType: f.type });
        if (error) {
          setGalat(pesanUnggah(error.message));
          break;
        }
        const hasil = await tambahLampiran(tabel, id, path);
        if (hasil.error) {
          await supabase.storage.from(BUCKET_LAMPIRAN).remove([path]);
          setGalat(hasil.error);
          break;
        }
      }
      router.refresh();
    });
  }

  function konfirmasiHapus() {
    if (!hapus) return;
    const path = hapus;
    mulai(async () => {
      const hasil = await hapusLampiran(tabel, id, path);
      if (hasil.error) {
        setGalat(hasil.error);
      } else {
        router.refresh();
      }
      dialog.current?.close();
      setHapus(undefined);
    });
  }

  return (
    <div className="lampiran">
      <h4>Lampiran</h4>
      {daftar.length === 0 ? (
        <p className="teks-lembut">Belum ada lampiran.</p>
      ) : (
        <ul className="daftar-lampiran">
          {daftar.map((b) => {
            const nama = namaTampil(b.path);
            return (
              <li key={b.path}>
                {b.url ? (
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="tautan-aksi">
                    {nama}
                  </a>
                ) : (
                  <span>{nama}</span>
                )}
                <button
                  type="button"
                  className="tombol-bahaya"
                  aria-label={`Hapus lampiran ${nama}`}
                  disabled={memproses}
                  onClick={() => {
                    setHapus(b.path);
                    dialog.current?.showModal();
                    tombolBatal.current?.focus();
                  }}
                >
                  Hapus
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}
        </p>
      )}
      <div className="unggah">
        <label htmlFor={idInput}>
          Unggah lampiran{konteks ? ` ${konteks}` : ''}
        </label>
        <input
          id={idInput}
          type="file"
          accept={TIPE_LAMPIRAN.join(',')}
          multiple
          disabled={memproses}
          onChange={pilih}
        />
        <span className="petunjuk-unggah">JPG, PNG, WEBP, atau PDF, maksimal 10 MB.</span>
        {memproses && (
          <span role="status" className="teks-lembut">
            Memproses...
          </span>
        )}
      </div>
      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby={`${idInput}-judul`}
        onClose={() => setHapus(undefined)}
      >
        <h2 id={`${idInput}-judul`}>Hapus lampiran?</h2>
        <p>{hapus ? namaTampil(hapus) : ''} akan dihapus dan tidak bisa dikembalikan.</p>
        <div className="baris-tombol">
          <button type="button" className="tombol-bahaya" onClick={konfirmasiHapus} disabled={memproses}>
            Hapus
          </button>
          <button type="button" className="tombol-sekunder" ref={tombolBatal} onClick={() => dialog.current?.close()}>
            Batal
          </button>
        </div>
      </dialog>
    </div>
  );
}
