'use client';

import { useState, useTransition } from 'react';
import { tandaiDibayar } from './actions';
import type { PihakPilihan } from './FormPembayaran';

export function FormTandaiDibayar({
  pembayaranId,
  pihak,
  hariIni,
  selesai,
  berhasil,
  label = 'Form tandai dibayar',
}: {
  pembayaranId: string;
  pihak: PihakPilihan[];
  hariIni: string;
  // Dipanggil saat form ditutup, baik setelah tersimpan maupun lewat Batal.
  selesai: () => void;
  // Dipanggil hanya setelah tersimpan, sebelum selesai().
  berhasil?: () => void;
  label?: string;
}) {
  const [tanggal, setTanggal] = useState(hariIni);
  const [pihakId, setPihakId] = useState('');
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(undefined);
    mulai(async () => {
      const hasil = await tandaiDibayar(pembayaranId, tanggal, pihakId);
      if (hasil.error) {
        setGalat(hasil.error);
        return;
      }
      berhasil?.();
      selesai();
    });
  }

  return (
    <form onSubmit={simpan} className="form" aria-label={label}>
      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}
        </p>
      )}
      <label>
        Tanggal bayar
        <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
      </label>
      <label>
        Dibayar oleh
        <select value={pihakId} onChange={(e) => setPihakId(e.target.value)}>
          <option value="">Pilih pihak</option>
          {pihak.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
        </select>
      </label>
      <div className="baris-tombol">
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button type="button" className="tombol-sekunder" onClick={selesai}>
          Batal
        </button>
      </div>
    </form>
  );
}
