import Link from 'next/link';
import { JudulHalaman } from '@/components/JudulHalaman';
import { Kosong } from '@/components/Kosong';
import type { TipeKomponen } from '@/lib/komponen';
import { createClient } from '@/lib/supabase/server';
import { adalahUuid } from '@/lib/validasi';
import { BarisKomponen } from './BarisKomponen';
import { FormKomponen } from './FormKomponen';

function satu(nilai: string | string[] | undefined): string {
  return (Array.isArray(nilai) ? nilai[0] : nilai) ?? '';
}

export default async function KomponenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const kategoriParam = satu(sp.kategori);
  const ubahParam = satu(sp.ubah);

  const supabase = await createClient();
  const { data: kategori, error } = await supabase
    .from('kategori_vendor')
    .select('id, nama, arsip')
    .order('urutan');
  if (error) throw new Error('Gagal memuat kategori');

  const terpilih =
    adalahUuid(kategoriParam) ? (kategori.find((k) => k.id === kategoriParam) ?? null) : null;

  const komponen = terpilih
    ? await supabase
        .from('komponen')
        .select('id, nama, tipe, satuan, nilai_komponen(count)')
        .eq('kategori_vendor_id', terpilih.id)
        .order('urutan')
        .order('nama')
    : null;
  if (komponen?.error) throw new Error('Gagal memuat komponen');

  const daftar = (komponen?.data ?? []).map((k) => ({
    id: k.id,
    nama: k.nama,
    tipe: k.tipe as TipeKomponen,
    satuan: k.satuan,
    jumlahNilai: k.nilai_komponen[0]?.count ?? 0,
  }));
  const diubah = adalahUuid(ubahParam) ? daftar.find((k) => k.id === ubahParam) : undefined;

  return (
    <>
      <JudulHalaman judul="Komponen pembanding" />
      <p>Komponen adalah butir yang dibandingkan antarpaket, misalnya durasi atau jumlah fotografer.</p>

      <form method="get" className="pilih-kategori">
        <label>
          Kategori
          <select name="kategori" defaultValue={terpilih?.id ?? ''}>
            <option value="" disabled>
              Pilih kategori
            </option>
            {kategori
              .filter((k) => !k.arsip || k.id === terpilih?.id)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
          </select>
        </label>
        <button type="submit" className="tombol-sekunder">
          Pilih
        </button>
      </form>

      {!terpilih ? (
        <Kosong pesan="Pilih kategori vendor untuk melihat dan mengatur komponennya." />
      ) : (
        <>
          <h2>Komponen {terpilih.nama}</h2>
          {daftar.length === 0 ? (
            <Kosong pesan="Kategori ini belum punya komponen. Tambahkan yang pertama di bawah." />
          ) : (
            <BarisKomponen kategoriId={terpilih.id} daftar={daftar} />
          )}

          <h2>{diubah ? `Ubah ${diubah.nama}` : 'Tambah komponen'}</h2>
          <FormKomponen
            key={diubah?.id ?? 'baru'}
            kategoriId={terpilih.id}
            awal={
              diubah
                ? {
                    id: diubah.id,
                    kategori_vendor_id: terpilih.id,
                    nama: diubah.nama,
                    tipe: diubah.tipe,
                    satuan: diubah.satuan ?? '',
                  }
                : undefined
            }
          />
        </>
      )}
      <p>
        <Link href="/pengaturan" className="tautan-aksi">
          Kembali ke pengaturan
        </Link>
      </p>
    </>
  );
}
