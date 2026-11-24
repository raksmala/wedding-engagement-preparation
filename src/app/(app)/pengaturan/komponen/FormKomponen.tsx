'use client';

import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LABEL_TIPE_KOMPONEN } from '@/lib/komponen';
import { simpanKomponen, type HasilSimpanKomponen, type NilaiKomponen } from './actions';

export function FormKomponen({ kategoriId, awal }: { kategoriId: string; awal?: NilaiKomponen }) {
  const router = useRouter();
  const [hasil, aksi, memproses] = useActionState(
    (_sebelumnya: HasilSimpanKomponen, formData: FormData) => simpanKomponen(formData),
    {},
  );
  const nilai = hasil.nilai ?? awal;

  useEffect(() => {
    // Setelah mengubah, kembali ke mode tambah.
    if (hasil.ok && awal) router.replace(`/pengaturan/komponen?kategori=${kategoriId}`);
  }, [hasil, awal, kategoriId, router]);

  return (
    <form action={aksi} className="form">
      <input type="hidden" name="kategori_vendor_id" value={kategoriId} />
      {nilai?.id && <input type="hidden" name="id" value={nilai.id} />}
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      <label>
        Nama komponen
        <input name="nama" required defaultValue={nilai?.nama ?? ''} placeholder="Durasi" />
      </label>
      <label>
        Tipe
        <select name="tipe" defaultValue={nilai?.tipe ?? 'teks'}>
          {Object.entries(LABEL_TIPE_KOMPONEN).map(([nilaiTipe, label]) => (
            <option key={nilaiTipe} value={nilaiTipe}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Satuan
        <input name="satuan" defaultValue={nilai?.satuan ?? ''} placeholder="jam" />
      </label>
      <div className="baris-tombol">
        <button type="submit" className="tombol-utama" disabled={memproses}>
          {memproses ? 'Menyimpan...' : 'Simpan komponen'}
        </button>
        {awal && (
          <Link href={`/pengaturan/komponen?kategori=${kategoriId}`} className="tombol-sekunder">
            Batal ubah
          </Link>
        )}
      </div>
    </form>
  );
}
