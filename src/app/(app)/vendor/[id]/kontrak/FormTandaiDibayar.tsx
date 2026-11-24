'use client';

import { useState, useTransition } from 'react';
import { tandaiDibayar } from './actions';
import type { PihakPilihan } from './FormPembayaran';

export function FormTandaiDibayar({
  pembayaranId,
  pihak,
  hariIni,
  selesai,
}: {
  pembayaranId: string;
  pihak: PihakPilihan[];
  hariIni: string;
  selesai: () => void;
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
      if (hasil.error) setGalat(hasil.error);
      else selesai();
    });
  }

  return (
    <form onSubmit={simpan} className="form" aria-label="Form tandai dibayar">
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
