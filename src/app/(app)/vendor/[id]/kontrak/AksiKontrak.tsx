'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { formatRupiah, parseRupiah } from '@/lib/rupiah';
import { simpanAlokasi, simpanDataKontrak, type HasilDataKontrak } from './actions';
import type { AcaraPilihan } from './FormKontrak';

type Mode = 'harga' | 'data' | null;

export function AksiKontrak({
  kontrakId,
  acara,
  alokasi,
  tanggal,
  catatan,
}: {
  kontrakId: string;
  acara: AcaraPilihan[];
  alokasi: Record<string, number>;
  tanggal: string;
  catatan: string;
}) {
  const [mode, setMode] = useState<Mode>(null);
  return (
    <div className="aksi-kontrak">
      {mode === null && (
        <div className="baris-tombol">
          <button type="button" className="tombol-sekunder" onClick={() => setMode('harga')}>
            Ubah harga per acara
          </button>
          <button type="button" className="tombol-sekunder" onClick={() => setMode('data')}>
            Ubah data kontrak
          </button>
        </div>
      )}
      {mode === 'harga' && (
        <FormHarga kontrakId={kontrakId} acara={acara} alokasi={alokasi} tutup={() => setMode(null)} />
      )}
      {mode === 'data' && (
        <FormDataKontrak kontrakId={kontrakId} tanggal={tanggal} catatan={catatan} tutup={() => setMode(null)} />
      )}
    </div>
  );
}

function FormHarga({
  kontrakId,
  acara,
  alokasi,
  tutup,
}: {
  kontrakId: string;
  acara: AcaraPilihan[];
  alokasi: Record<string, number>;
  tutup: () => void;
}) {
  const [isi, setIsi] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      acara.map((a) => [a.id, a.id in alokasi ? formatRupiah(alokasi[a.id]).replace('Rp ', '') : '']),
    ),
  );
  const [galat, setGalat] = useState<string>();
  const [memproses, mulai] = useTransition();

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(undefined);
    const daftar: { acara_id: string; nominal: number }[] = [];
    for (const a of acara) {
      const teks = (isi[a.id] ?? '').trim();
      if (teks === '') continue;
      const nominal = parseRupiah(teks);
      if (nominal === null) {
        setGalat('Tulis nominal dengan angka, contoh 1.500.000');
        return;
      }
      daftar.push({ acara_id: a.id, nominal });
    }
    if (daftar.length === 0) {
      setGalat('Isi harga untuk minimal satu acara.');
      return;
    }
    mulai(async () => {
      const hasil = await simpanAlokasi(kontrakId, daftar);
      if (hasil.error) setGalat(hasil.error);
      else tutup();
    });
  }

  return (
    <form onSubmit={simpan} className="form" aria-label="Form harga per acara">
      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}
        </p>
      )}
      {acara.map((a) => (
        <label key={a.id}>
          Harga {a.nama}
          <input
            inputMode="numeric"
            placeholder="1.500.000"
            value={isi[a.id] ?? ''}
            onChange={(e) => setIsi({ ...isi, [a.id]: e.target.value })}
          />
        </label>
      ))}
      <p className="teks-lembut">Kosongkan acara yang tidak masuk kontrak.</p>
      <div className="baris-tombol">
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Menyimpan...' : 'Simpan harga'}
        </button>
        <button type="button" className="tombol-sekunder" onClick={tutup}>
          Batal
        </button>
      </div>
    </form>
  );
}

function FormDataKontrak({
  kontrakId,
  tanggal,
  catatan,
  tutup,
}: {
  kontrakId: string;
  tanggal: string;
  catatan: string;
  tutup: () => void;
}) {
  const [hasil, aksi, memproses] = useActionState(
    (_sebelumnya: HasilDataKontrak, formData: FormData) => simpanDataKontrak(formData),
    {},
  );
  const nilai = hasil.nilai;

  useEffect(() => {
    if (hasil.ok) tutup();
  }, [hasil, tutup]);

  return (
    <form action={aksi} className="form" aria-label="Form data kontrak">
      <input type="hidden" name="kontrak_id" value={kontrakId} />
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      <label>
        Tanggal kesepakatan
        <input type="date" name="tanggal" defaultValue={nilai?.tanggal ?? tanggal} />
      </label>
      <label>
        Catatan
        <textarea name="catatan" rows={3} defaultValue={nilai?.catatan ?? catatan} />
      </label>
      <div className="baris-tombol">
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Menyimpan...' : 'Simpan data kontrak'}
        </button>
        <button type="button" className="tombol-sekunder" onClick={tutup}>
          Batal
        </button>
      </div>
    </form>
  );
}
