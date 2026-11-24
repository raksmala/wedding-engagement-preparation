'use client';

import { useActionState, useState } from 'react';
import { simpanKontrak, type HasilKontrak } from './actions';

export type AcaraPilihan = { id: string; nama: string };

// Kontrak manual untuk Vendor tanpa Paket: minimal satu harga per acara.
export function FormKontrak({ vendorId, acara }: { vendorId: string; acara: AcaraPilihan[] }) {
  const [buka, setBuka] = useState(false);
  const [hasil, aksi, memproses] = useActionState(
    (_sebelumnya: HasilKontrak, formData: FormData) => simpanKontrak(formData),
    {},
  );
  const nilai = hasil.nilai;

  // Setelah tersimpan, halaman dimuat ulang dan bagian ini diganti ringkasan kontrak.
  if (!buka || hasil.ok) {
    return (
      <button type="button" className="tombol-utama" aria-expanded="false" onClick={() => setBuka(true)}>
        Buat kontrak
      </button>
    );
  }

  return (
    <form action={aksi} className="form" aria-label="Form buat kontrak">
      <input type="hidden" name="vendor_id" value={vendorId} />
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      <fieldset>
        <legend>Harga per acara</legend>
        <div className="form">
          {acara.map((a) => (
            <label key={a.id}>
              Harga {a.nama}
              <input
                name={`harga_${a.id}`}
                inputMode="numeric"
                placeholder="1.500.000"
                defaultValue={nilai?.harga[a.id] ?? ''}
              />
            </label>
          ))}
        </div>
        <p className="teks-lembut">Kosongkan acara yang tidak masuk kontrak.</p>
      </fieldset>
      <label>
        Tanggal kesepakatan
        <input type="date" name="tanggal" defaultValue={nilai?.tanggal ?? ''} />
      </label>
      <label>
        Catatan
        <textarea name="catatan" rows={3} defaultValue={nilai?.catatan ?? ''} />
      </label>
      <div className="baris-tombol">
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Menyimpan...' : 'Simpan kontrak'}
        </button>
        <button type="button" className="tombol-sekunder" onClick={() => setBuka(false)}>
          Batal
        </button>
      </div>
    </form>
  );
}
