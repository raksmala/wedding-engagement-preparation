'use client';

import { useActionState, useEffect, useState } from 'react';
import { simpanPembayaran, type HasilPembayaran, type NilaiPembayaran } from './actions';

export type PihakPilihan = { id: string; nama: string };

export const LABEL_JENIS = { dp: 'DP', termin: 'Termin', pelunasan: 'Pelunasan' } as const;

export function FormPembayaran({
  kontrakId,
  pihak,
  hariIni,
  awal,
  namaPihakAwal,
  selesai,
}: {
  kontrakId: string;
  pihak: PihakPilihan[];
  hariIni: string;
  awal?: NilaiPembayaran;
  // Nama Pihak yang dipakai baris ini, untuk Pihak yang sudah diarsipkan dan tidak ada di daftar pilihan.
  namaPihakAwal?: string | null;
  selesai: () => void;
}) {
  const [hasil, aksi, memproses] = useActionState(
    (_sebelumnya: HasilPembayaran, formData: FormData) => simpanPembayaran(formData),
    {},
  );
  // Setelah gagal, isian yang dikirim dipakai ulang supaya tidak hilang.
  const nilai = hasil.nilai ?? awal;
  const [status, setStatus] = useState(nilai?.status ?? 'terjadwal');

  useEffect(() => {
    if (hasil.ok) selesai();
  }, [hasil, selesai]);

  // Pihak yang sudah diarsipkan tetap bisa dipilih kalau baris ini memakainya.
  const opsiPihak =
    awal?.pihak_id && !pihak.some((p) => p.id === awal.pihak_id)
      ? [...pihak, { id: awal.pihak_id, nama: `${namaPihakAwal ?? 'Pihak'} (diarsipkan)` }]
      : pihak;

  return (
    <form action={aksi} className="form" aria-label="Form pembayaran">
      <input type="hidden" name="kontrak_id" value={kontrakId} />
      {awal?.id && <input type="hidden" name="id" value={awal.id} />}
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      <label>
        Jenis
        <select name="jenis" defaultValue={nilai?.jenis ?? 'dp'}>
          <option value="dp">{LABEL_JENIS.dp}</option>
          <option value="termin">{LABEL_JENIS.termin}</option>
          <option value="pelunasan">{LABEL_JENIS.pelunasan}</option>
        </select>
      </label>
      <label>
        Nominal
        <input name="nominal" inputMode="numeric" placeholder="1.500.000" defaultValue={nilai?.nominal ?? ''} />
      </label>
      <label>
        Status
        <select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="terjadwal">Terjadwal</option>
          <option value="dibayar">Dibayar</option>
        </select>
      </label>
      <label>
        Jatuh tempo
        <input type="date" name="jatuh_tempo" defaultValue={nilai?.jatuh_tempo ?? ''} />
      </label>
      {status === 'dibayar' && (
        <>
          <label>
            Tanggal bayar
            <input type="date" name="tanggal_bayar" defaultValue={nilai?.tanggal_bayar || hariIni} />
          </label>
          <label>
            Dibayar oleh
            <select name="pihak_id" defaultValue={nilai?.pihak_id ?? ''}>
              <option value="">Pilih pihak</option>
              {opsiPihak.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <label>
        Catatan
        <textarea name="catatan" rows={2} defaultValue={nilai?.catatan ?? ''} />
      </label>
      <div className="baris-tombol">
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Menyimpan...' : 'Simpan pembayaran'}
        </button>
        <button type="button" className="tombol-sekunder" onClick={selesai}>
          Batal
        </button>
      </div>
    </form>
  );
}
