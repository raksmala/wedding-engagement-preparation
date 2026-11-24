import Link from 'next/link';
import { JudulHalaman } from '@/components/JudulHalaman';
import { Kosong } from '@/components/Kosong';
import { createClient } from '@/lib/supabase/server';
import { formatTanggal } from '@/lib/tanggal';

export default async function AcaraPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('acara')
    .select('id, nama, tanggal, perkiraan, lokasi')
    .order('tanggal', { ascending: true, nullsFirst: false })
    .order('jenis')
    .order('nama');
  if (error) throw new Error('Gagal memuat acara');

  return (
    <>
      <JudulHalaman judul="Acara" />
      <p>
        <Link href="/acara/baru" className="tombol-utama">
          Tambah acara
        </Link>
      </p>
      {data.length === 0 ? (
        <Kosong pesan="Belum ada acara." aksi={{ label: 'Tambah acara', href: '/acara/baru' }} />
      ) : (
        <ul className="daftar-kartu">
          {data.map((a) => (
            <li key={a.id} className="kartu">
              <h2>{a.nama}</h2>
              <p className="teks-lembut">
                {a.tanggal
                  ? formatTanggal(a.tanggal)
                  : a.perkiraan
                    ? `Perkiraan: ${a.perkiraan}`
                    : 'Tanggal belum pasti'}
              </p>
              {a.lokasi && <p>{a.lokasi}</p>}
              <Link href={`/acara/${a.id}`} className="tautan-aksi" aria-label={`Ubah ${a.nama}`}>
                Ubah
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
