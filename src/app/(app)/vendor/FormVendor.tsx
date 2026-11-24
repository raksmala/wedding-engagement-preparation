'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { linkWhatsApp } from '@/lib/whatsapp';
import { simpanVendor, type HasilSimpanVendor, type NilaiVendor } from './actions';

type Opsi = { id: string; nama: string };

export function FormVendor({
  awal,
  kategori,
  acara,
}: {
  awal?: NilaiVendor;
  kategori: Opsi[];
  acara: Opsi[];
}) {
  const router = useRouter();
  const [hasil, aksi, memproses] = useActionState(
    (_sebelumnya: HasilSimpanVendor, formData: FormData) => simpanVendor(formData),
    {},
  );
  // Setelah gagal, isian yang dikirim dipakai ulang supaya tidak hilang.
  const nilai = hasil.nilai ?? awal;
  const [wa, setWa] = useState(nilai?.whatsapp ?? '');
  const waTidakDikenali = wa.trim() !== '' && linkWhatsApp(wa.trim()) === null;

  useEffect(() => {
    if (hasil.id) router.push(`/vendor/${hasil.id}`);
  }, [hasil.id, router]);

  return (
    <form action={aksi} className="form">
      {nilai?.id && <input type="hidden" name="id" value={nilai.id} />}
      {hasil.error && (
        <p role="alert" className="pesan-galat">
          {hasil.error}
        </p>
      )}
      <label>
        Nama
        <input name="nama" required defaultValue={nilai?.nama ?? ''} />
      </label>
      <label>
        Kategori
        <select name="kategori_vendor_id" required defaultValue={nilai?.kategori_vendor_id ?? ''}>
          <option value="" disabled>
            Pilih kategori
          </option>
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Acara</legend>
        {acara.map((a) => (
          <label key={a.id} className="pilihan">
            <input
              type="checkbox"
              name="acara_id"
              value={a.id}
              defaultChecked={nilai?.acara_id.includes(a.id) ?? false}
            />
            {a.nama}
          </label>
        ))}
      </fieldset>
      <label>
        Nama kontak
        <input name="nama_kontak" defaultValue={nilai?.nama_kontak ?? ''} />
      </label>
      <label>
        WhatsApp
        <input
          name="whatsapp"
          inputMode="tel"
          defaultValue={nilai?.whatsapp ?? ''}
          placeholder="0812-3456-7890"
          aria-describedby={waTidakDikenali ? 'petunjuk-wa' : undefined}
          onChange={(e) => setWa(e.target.value)}
        />
        {waTidakDikenali && (
          <span id="petunjuk-wa" className="petunjuk">
            Nomor WhatsApp tidak dikenali
          </span>
        )}
      </label>
      <label>
        Instagram
        <input name="instagram" defaultValue={nilai?.instagram ?? ''} placeholder="@namavendor" />
      </label>
      <label>
        Link
        <input name="link" inputMode="url" defaultValue={nilai?.link ?? ''} placeholder="https://" />
      </label>
      <label>
        Catatan
        <textarea name="catatan" rows={3} defaultValue={nilai?.catatan ?? ''} />
      </label>
      <button type="submit" className="tombol-utama" disabled={memproses}>
        {memproses ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  );
}
