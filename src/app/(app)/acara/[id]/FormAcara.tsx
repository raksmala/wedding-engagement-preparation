'use client';

import { useActionState } from 'react';
import { simpanAcara } from '../actions';

type Acara = {
  id: string;
  nama: string;
  jenis: string;
  tanggal: string | null;
  perkiraan: string | null;
  lokasi: string | null;
  catatan: string | null;
};

const JENIS = [
  ['lamaran', 'Lamaran'],
  ['akad', 'Akad'],
  ['resepsi', 'Resepsi'],
  ['ngunduh_mantu', 'Ngunduh Mantu'],
  ['lainnya', 'Lainnya'],
];

export function FormAcara({ acara }: { acara?: Acara }) {
  const [hasil, aksi, memproses] = useActionState(
    (_awal: { error?: string }, formData: FormData) => simpanAcara(formData),
    {},
  );

  return (
    <form action={aksi} className="form">
      {acara && <input type="hidden" name="id" value={acara.id} />}
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      <label>
        Nama
        <input name="nama" required defaultValue={acara?.nama ?? ''} />
      </label>
      <label>
        Jenis
        <select name="jenis" defaultValue={acara?.jenis ?? 'lainnya'}>
          {JENIS.map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tanggal
        <input type="date" name="tanggal" defaultValue={acara?.tanggal ?? ''} />
      </label>
      <label>
        Perkiraan (dipakai saat tanggal belum pasti)
        <input name="perkiraan" defaultValue={acara?.perkiraan ?? ''} placeholder="pertengahan 2027" />
      </label>
      <label>
        Lokasi
        <input name="lokasi" defaultValue={acara?.lokasi ?? ''} />
      </label>
      <label>
        Catatan
        <textarea name="catatan" rows={3} defaultValue={acara?.catatan ?? ''} />
      </label>
      <button type="submit" className="tombol-utama" disabled={memproses}>
        {memproses ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  );
}
