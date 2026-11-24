'use client';

import { useActionState, useEffect } from 'react';
import { LABEL_SALURAN, SALURAN } from '@/lib/tugas';
import { simpanLogKontak, type HasilLog } from './actions';

export function FormLogKontak({
  vendorId,
  hariIni,
  selesai,
}: {
  vendorId: string;
  hariIni: string;
  selesai: () => void;
}) {
  const [hasil, aksi, memproses] = useActionState(
    (_sebelumnya: HasilLog, formData: FormData) => simpanLogKontak(formData),
    {},
  );
  // Setelah gagal, isian yang dikirim dipakai ulang supaya tidak hilang.
  const nilai = hasil.nilai;

  useEffect(() => {
    if (hasil.ok) selesai();
  }, [hasil, selesai]);

  return (
    <form action={aksi} className="form" aria-label="Form log kontak">
      <input type="hidden" name="vendor_id" value={vendorId} />
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      <label>
        Tanggal
        <input type="date" name="tanggal" defaultValue={nilai?.tanggal || hariIni} />
      </label>
      <label>
        Saluran
        <select name="saluran" defaultValue={nilai?.saluran ?? 'whatsapp'}>
          {SALURAN.map((s) => (
            <option key={s} value={s}>
              {LABEL_SALURAN[s]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Isi
        <textarea
          name="isi"
          rows={3}
          placeholder="Contoh: sepakat DP 30%, pelunasan H-14"
          defaultValue={nilai?.isi ?? ''}
        />
      </label>
      <div className="baris-tombol">
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Menyimpan...' : 'Simpan log kontak'}
        </button>
        <button type="button" className="tombol-sekunder" onClick={selesai}>
          Batal
        </button>
      </div>
    </form>
  );
}
