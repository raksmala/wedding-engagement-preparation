'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { flushSync } from 'react-dom';
import { Kosong } from '@/components/Kosong';
import {
  aktifkanKategori,
  aktifkanPihak,
  arsipkanKategori,
  arsipkanPihak,
  hapusKategori,
  hapusPihak,
  simpanKategori,
  simpanPihak,
  type HasilSimpanPengaturan,
} from './actions';

export type JenisPengaturan = 'pihak' | 'kategori';

export type ItemPengaturan = {
  id: string;
  nama: string;
  arsip: boolean;
  // Teks pemakaian, misalnya "Dipakai: 2 pembayaran". null berarti belum dipakai dan boleh dihapus.
  pemakaian: string | null;
};

const AKSI = {
  pihak: {
    simpan: simpanPihak,
    arsipkan: arsipkanPihak,
    aktifkan: aktifkanPihak,
    hapus: hapusPihak,
    benda: 'pihak',
    contoh: 'Om Budi',
  },
  kategori: {
    simpan: simpanKategori,
    arsipkan: arsipkanKategori,
    aktifkan: aktifkanKategori,
    hapus: hapusKategori,
    benda: 'kategori',
    contoh: 'Henna',
  },
} as const;

const PANJANG_MAKS = 60;

// Server Action di actions.ts memanggil revalidatePath, jadi daftar ikut segar tanpa router.refresh().
export function DaftarPengaturan({
  jenis,
  daftar,
  judulId,
}: {
  jenis: JenisPengaturan;
  daftar: ItemPengaturan[];
  // id judul section (tabIndex -1), tujuan fokus setelah baris dihapus.
  judulId: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tombolBatal = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState<ItemPengaturan>();
  const [galat, setGalat] = useState<string>();
  // Baris yang sedang diarsipkan atau diaktifkan lagi.
  const [diproses, setDiproses] = useState<string>();
  const [memproses, mulai] = useTransition();
  const aksi = AKSI[jenis];
  const adaAktif = daftar.some((i) => !i.arsip);

  function ubahArsip(item: ItemPengaturan) {
    if (memproses) return;
    setGalat(undefined);
    setDiproses(item.id);
    mulai(async () => {
      const hasil = await (item.arsip ? aksi.aktifkan(item.id) : aksi.arsipkan(item.id));
      if (hasil.error) setGalat(hasil.error);
      setDiproses(undefined);
    });
  }

  function mintaHapus(item: ItemPengaturan) {
    // Isi dialog harus sudah berisi nama baris ini sebelum dibuka, supaya pembaca layar membacakan nama yang benar.
    flushSync(() => {
      setTarget(item);
      setGalat(undefined);
    });
    dialog.current?.showModal();
    tombolBatal.current?.focus();
  }

  function hapus() {
    if (!target) return;
    const id = target.id;
    mulai(async () => {
      const hasil = await aksi.hapus(id);
      dialog.current?.close();
      if (hasil.error) {
        setGalat(hasil.error);
        return;
      }
      // Baris dan tombol Hapus-nya hilang, jadi fokus pindah ke judul section.
      document.getElementById(judulId)?.focus();
    });
  }

  return (
    <>
      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}
        </p>
      )}
      {!adaAktif && (
        <Kosong pesan={`Belum ada ${aksi.benda} aktif. Tambahkan lewat form di bawah, atau aktifkan lagi yang diarsipkan.`} />
      )}
      {daftar.length > 0 && (
        <ul className="daftar-kartu">
          {daftar.map((item) => (
            <BarisItem
              key={item.id}
              jenis={jenis}
              item={item}
              sibuk={memproses && diproses === item.id}
              ubahArsip={() => ubahArsip(item)}
              mintaHapus={() => mintaHapus(item)}
            />
          ))}
        </ul>
      )}

      <h3>Tambah {aksi.benda}</h3>
      <FormTambah jenis={jenis} />

      <dialog ref={dialog} className="dialog" aria-labelledby={`judul-hapus-${jenis}`}>
        <h2 id={`judul-hapus-${jenis}`}>Hapus {target?.nama}?</h2>
        <p>
          {aksi.benda === 'pihak' ? 'Pihak' : 'Kategori'} ini belum dipakai. Yang sudah dihapus tidak bisa
          dikembalikan.
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

function BarisItem({
  jenis,
  item,
  sibuk,
  ubahArsip,
  mintaHapus,
}: {
  jenis: JenisPengaturan;
  item: ItemPengaturan;
  sibuk: boolean;
  ubahArsip: () => void;
  mintaHapus: () => void;
}) {
  const [ubah, setUbah] = useState(false);
  const tombolUbah = useRef<HTMLButtonElement>(null);
  const fokusKembali = useRef(false);

  // Setelah form ubah nama ditutup, fokus keyboard kembali ke tombol "Ubah nama".
  useEffect(() => {
    if (!ubah && fokusKembali.current) {
      fokusKembali.current = false;
      tombolUbah.current?.focus();
    }
  }, [ubah]);

  function tutup() {
    fokusKembali.current = true;
    setUbah(false);
  }

  if (ubah) {
    return (
      <li className="kartu">
        <FormUbahNama jenis={jenis} item={item} selesai={tutup} />
      </li>
    );
  }

  return (
    <li className="kartu">
      <h3>{item.nama}</h3>
      <p className="teks-lembut">
        {item.arsip && (
          <>
            <span className="status-label status-lembut">Diarsipkan</span>
            {'. '}
          </>
        )}
        {item.pemakaian ?? 'Belum dipakai'}
      </p>
      <div className="baris-tombol">
        <button
          type="button"
          className="tombol-sekunder"
          ref={tombolUbah}
          aria-label={`Ubah nama ${item.nama}`}
          onClick={() => setUbah(true)}
        >
          Ubah nama
        </button>
        {/* Satu tombol untuk dua keadaan, supaya fokus keyboard tetap di tempat setelah diklik. */}
        <button
          type="button"
          className="tombol-sekunder"
          aria-label={sibuk ? `Menyimpan ${item.nama}` : `${item.arsip ? 'Aktifkan lagi' : 'Arsipkan'} ${item.nama}`}
          aria-busy={sibuk}
          onClick={ubahArsip}
        >
          {sibuk ? 'Menyimpan...' : item.arsip ? 'Aktifkan lagi' : 'Arsipkan'}
        </button>
        {item.pemakaian === null && (
          <button type="button" className="tombol-bahaya" aria-label={`Hapus ${item.nama}`} onClick={mintaHapus}>
            Hapus
          </button>
        )}
      </div>
    </li>
  );
}

function FormUbahNama({
  jenis,
  item,
  selesai,
}: {
  jenis: JenisPengaturan;
  item: ItemPengaturan;
  selesai: () => void;
}) {
  const [hasil, aksi, memproses] = useActionState(
    async (_sebelumnya: HasilSimpanPengaturan, formData: FormData) => {
      const h = await AKSI[jenis].simpan(formData);
      if (h.ok) selesai();
      return h;
    },
    {},
  );

  return (
    <form action={aksi} className="form" aria-label={`Ubah nama ${item.nama}`}>
      <input type="hidden" name="id" value={item.id} />
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      {/* Form ini dibuka dari tombol "Ubah nama", jadi fokus langsung ke isiannya. */}
      <label>
        Nama baru
        <input name="nama" required maxLength={PANJANG_MAKS} defaultValue={hasil.nama ?? item.nama} autoFocus />
      </label>
      <div className="baris-tombol">
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Menyimpan...' : 'Simpan nama'}
        </button>
        <button type="button" className="tombol-sekunder" onClick={selesai}>
          Batal
        </button>
      </div>
    </form>
  );
}

function FormTambah({ jenis }: { jenis: JenisPengaturan }) {
  const { simpan, benda, contoh } = AKSI[jenis];
  const [hasil, aksi, memproses] = useActionState(
    (_sebelumnya: HasilSimpanPengaturan, formData: FormData) => simpan(formData),
    {},
  );

  return (
    <form action={aksi} className="form" aria-label={`Tambah ${benda}`}>
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      <label>
        Nama {benda} baru
        <input
          name="nama"
          required
          maxLength={PANJANG_MAKS}
          defaultValue={hasil.nama ?? ''}
          placeholder={contoh}
        />
      </label>
      <div className="baris-tombol">
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Menyimpan...' : `Tambah ${benda}`}
        </button>
      </div>
    </form>
  );
}
