'use client';

import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TipeKomponen } from '@/lib/komponen';
import { simpanPaket, type HasilSimpanPaket, type NilaiPaket } from './actions';

export type KomponenForm = { id: string; nama: string; tipe: TipeKomponen; satuan: string | null };

export function FormPaket({
  vendorId,
  kategoriId,
  komponen,
  awal,
}: {
  vendorId: string;
  kategoriId: string;
  komponen: KomponenForm[];
  awal?: NilaiPaket;
}) {
  const router = useRouter();
  const [hasil, aksi, memproses] = useActionState(
    (_sebelumnya: HasilSimpanPaket, formData: FormData) => simpanPaket(formData),
    {},
  );
  // Setelah gagal, isian yang dikirim dipakai ulang supaya tidak hilang.
  const nilai = hasil.nilai ?? awal;

  useEffect(() => {
    if (hasil.id) router.push(`/vendor/${vendorId}`);
  }, [hasil.id, vendorId, router]);

  return (
    <form action={aksi} className="form">
      <input type="hidden" name="vendor_id" value={vendorId} />
      {nilai?.id && <input type="hidden" name="id" value={nilai.id} />}
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      <label>
        Nama paket
        <input name="nama" required defaultValue={nilai?.nama ?? ''} />
      </label>
      <label>
        Harga
        <input
          name="harga"
          required
          inputMode="numeric"
          placeholder="1.500.000"
          defaultValue={nilai?.harga ?? ''}
        />
      </label>

      <fieldset>
        <legend>Komponen</legend>
        {komponen.length === 0 && (
          <p className="teks-lembut">Kategori ini belum punya komponen pembanding.</p>
        )}
        <div className="form">
          {komponen.map((k) => {
            const label = k.satuan ? `${k.nama} (${k.satuan})` : k.nama;
            const isi = nilai?.nilai[k.id] ?? '';
            return k.tipe === 'ya_tidak' ? (
              <label key={k.id}>
                {label}
                <select name={`nilai_${k.id}`} defaultValue={isi}>
                  <option value="">Belum diisi</option>
                  <option value="ya">Ya</option>
                  <option value="tidak">Tidak</option>
                </select>
              </label>
            ) : (
              <label key={k.id}>
                {label}
                <input
                  name={`nilai_${k.id}`}
                  inputMode={k.tipe === 'angka' ? 'numeric' : undefined}
                  defaultValue={isi}
                />
              </label>
            );
          })}
        </div>
        <Link href={`/pengaturan/komponen?kategori=${kategoriId}`} className="tautan-aksi">
          Atur Komponen
        </Link>
      </fieldset>

      <label>
        Syarat DP
        <input name="syarat_dp" defaultValue={nilai?.syarat_dp ?? ''} placeholder="DP 30%, pelunasan H-14" />
      </label>
      <label>
        Lain-lain
        <textarea name="lain_lain" rows={3} defaultValue={nilai?.lain_lain ?? ''} />
      </label>
      <label>
        Catatan
        <textarea name="catatan" rows={3} defaultValue={nilai?.catatan ?? ''} />
      </label>
      <button type="submit" className="tombol-utama" disabled={memproses}>
        {memproses ? 'Menyimpan...' : 'Simpan paket'}
      </button>
    </form>
  );
}
