'use client';

import { useState, useTransition } from 'react';
import { LABEL_STATUS_VENDOR, type StatusVendor } from '@/components/StatusLabel';
import { ubahStatusVendor } from '../actions';

export function UbahStatus({ id, status }: { id: string; status: StatusVendor }) {
  const [pilihan, setPilihan] = useState<StatusVendor>(status);
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(undefined);
    mulai(async () => {
      const hasil = await ubahStatusVendor(id, pilihan);
      if (hasil.error) setGalat(hasil.error);
    });
  }

  return (
    <form onSubmit={simpan} className="ubah-status">
      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}
        </p>
      )}
      <label>
        Ubah status
        <select value={pilihan} onChange={(e) => setPilihan(e.target.value as StatusVendor)}>
          {(Object.keys(LABEL_STATUS_VENDOR) as StatusVendor[]).map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS_VENDOR[s]}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="tombol-sekunder" disabled={memproses || pilihan === status}>
        {memproses ? 'Menyimpan...' : 'Simpan status'}
      </button>
    </form>
  );
}
