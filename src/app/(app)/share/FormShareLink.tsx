'use client';

import { useActionState } from 'react';
import { BAGIAN, BAGIAN_DEFAULT, LABEL_BAGIAN, PANJANG_LABEL_MAKS } from '@/lib/shareLink';
import { buatShareLink, type HasilShareLink } from './actions';

export function FormShareLink() {
  const [hasil, aksi, memproses] = useActionState((_sebelumnya: HasilShareLink, formData: FormData) => {
    const label = formData.get('label');
    const bagian = formData.getAll('bagian').filter((b): b is string => typeof b === 'string');
    return buatShareLink(typeof label === 'string' ? label : '', bagian);
  }, {});
  // Setelah gagal, isian yang dikirim dipakai ulang supaya tidak hilang. Setelah berhasil, form kembali ke default.
  const nilai = hasil.nilai;

  return (
    <form action={aksi} className="form" aria-label="Form Share Link">
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      {hasil.ok && (
        <p role="status" className="pesan-berhasil">
          Share Link dibuat. Salin linknya dari daftar di bawah.
        </p>
      )}
      <label>
        Nama link
        <input
          name="label"
          maxLength={PANJANG_LABEL_MAKS}
          defaultValue={nilai?.label ?? ''}
          placeholder="Contoh: Keluarga Dinar"
          autoComplete="off"
        />
      </label>
      <fieldset aria-describedby="petunjuk-bagian petunjuk-teks-bebas">
        <legend>Bagian yang ditampilkan</legend>
        {BAGIAN.map((b) => (
          <label key={b} className="pilihan">
            <input
              type="checkbox"
              name="bagian"
              value={b}
              defaultChecked={nilai ? nilai.bagian.includes(b) : BAGIAN_DEFAULT.includes(b)}
            />
            {LABEL_BAGIAN[b]}
          </label>
        ))}
        <p id="petunjuk-bagian" className="teks-lembut">
          Keuangan menampilkan total, terbayar, dan Sisa Tagihan per vendor, serta Kontribusi per Pihak. Bukti
          transfer dan lampiran tidak pernah ditampilkan.
        </p>
        <p id="petunjuk-teks-bebas" className="teks-lembut">
          Judul Tugas, nama vendor, nama acara, lokasi, dan perkiraan tanggal tampil persis seperti yang ditulis.
          Jangan tulis nominal di sana, karena tetap terlihat walaupun Keuangan tidak dicentang.
        </p>
      </fieldset>
      <p>
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Membuat link...' : 'Buat link'}
        </button>
      </p>
    </form>
  );
}
