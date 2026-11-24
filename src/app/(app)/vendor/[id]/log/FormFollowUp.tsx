'use client';

import { useState, useTransition } from 'react';
import { buatTugasDariLog } from './actions';

export type EditorPilihan = { id: string; nama: string };

export function FormFollowUp({
  logKontakId,
  editor,
  picAwal,
  selesai,
}: {
  logKontakId: string;
  editor: EditorPilihan[];
  picAwal: string;
  selesai: () => void;
}) {
  const [judul, setJudul] = useState('');
  const [jatuhTempo, setJatuhTempo] = useState('');
  const [picId, setPicId] = useState(picAwal);
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(undefined);
    mulai(async () => {
      const hasil = await buatTugasDariLog(logKontakId, judul, jatuhTempo, picId);
      if (hasil.error) setGalat(hasil.error);
      else selesai();
    });
  }

  return (
    <form onSubmit={simpan} className="form" aria-label="Form follow-up">
      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}
        </p>
      )}
      <label>
        Judul
        <input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Contoh: cek revisi pricelist" />
      </label>
      <label>
        Jatuh tempo
        <input type="date" value={jatuhTempo} onChange={(e) => setJatuhTempo(e.target.value)} />
      </label>
      <label>
        PIC
        <select value={picId} onChange={(e) => setPicId(e.target.value)}>
          <option value="">Pilih PIC</option>
          {editor.map((ed) => (
            <option key={ed.id} value={ed.id}>
              {ed.nama}
            </option>
          ))}
        </select>
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
