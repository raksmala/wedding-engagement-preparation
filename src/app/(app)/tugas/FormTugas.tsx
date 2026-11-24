'use client';

import { useActionState, useEffect } from 'react';
import { simpanTugas, type HasilTugas, type NilaiTugas } from './actions';

export type Pilihan = { id: string; nama: string };

export function FormTugas({
  editor,
  vendor,
  acara,
  picAwal,
  awal,
  vendorTerkunci,
  selesai,
}: {
  editor: Pilihan[];
  vendor: Pilihan[];
  acara: Pilihan[];
  picAwal: string;
  awal?: NilaiTugas;
  // Tugas follow-up: Vendornya mengikuti Log Kontak asal.
  vendorTerkunci?: string;
  selesai: () => void;
}) {
  const [hasil, aksi, memproses] = useActionState(
    (_sebelumnya: HasilTugas, formData: FormData) => simpanTugas(formData),
    {},
  );
  // Setelah gagal, isian yang dikirim dipakai ulang supaya tidak hilang.
  const nilai = hasil.nilai ?? awal;

  useEffect(() => {
    if (hasil.ok) selesai();
  }, [hasil, selesai]);

  return (
    <form action={aksi} className="form" aria-label="Form tugas">
      {awal?.id && <input type="hidden" name="id" value={awal.id} />}
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      <label>
        Judul
        <input name="judul" defaultValue={nilai?.judul ?? ''} placeholder="Contoh: kirim DP ke venue" />
      </label>
      <label>
        PIC
        <select name="pic_id" defaultValue={nilai?.pic_id ?? picAwal}>
          <option value="">Pilih PIC</option>
          {editor.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nama}
            </option>
          ))}
        </select>
      </label>
      <label>
        Jatuh tempo
        <input type="date" name="jatuh_tempo" defaultValue={nilai?.jatuh_tempo ?? ''} />
      </label>
      {vendorTerkunci ? (
        <p>
          <strong>Vendor</strong>
          <br />
          {vendorTerkunci}
          <br />
          <span className="teks-lembut">Vendor mengikuti log kontak asal tugas ini.</span>
        </p>
      ) : (
        <label>
          Vendor
          <select name="vendor_id" defaultValue={nilai?.vendor_id ?? ''}>
            <option value="">Tidak terkait vendor</option>
            {vendor.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nama}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Acara
        <select name="acara_id" defaultValue={nilai?.acara_id ?? ''}>
          <option value="">Tidak terkait acara</option>
          {acara.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama}
            </option>
          ))}
        </select>
      </label>
      <label>
        Catatan
        <textarea name="catatan" rows={2} defaultValue={nilai?.catatan ?? ''} />
      </label>
      <div className="baris-tombol">
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Menyimpan...' : 'Simpan tugas'}
        </button>
        <button type="button" className="tombol-sekunder" onClick={selesai}>
          Batal
        </button>
      </div>
    </form>
  );
}
