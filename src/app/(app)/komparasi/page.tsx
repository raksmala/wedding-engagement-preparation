import Link from 'next/link';
import { JudulHalaman } from '@/components/JudulHalaman';
import { Kosong } from '@/components/Kosong';
import { embedSatu } from '@/lib/embed';
import { createClient } from '@/lib/supabase/server';

export default async function KomparasiPage() {
  const supabase = await createClient();
  const [kategori, paket] = await Promise.all([
    supabase.from('kategori_vendor').select('id, nama').order('urutan'),
    supabase.from('paket').select('id, vendor(kategori_vendor_id)'),
  ]);
  if (kategori.error || paket.error) throw new Error('Gagal memuat komparasi');

  const jumlah = new Map<string, number>();
  for (const p of paket.data) {
    const k = embedSatu(p.vendor)?.kategori_vendor_id;
    if (k) jumlah.set(k, (jumlah.get(k) ?? 0) + 1);
  }
  const daftar = kategori.data.filter((k) => jumlah.has(k.id));

  return (
    <>
      <JudulHalaman judul="Komparasi" />
      {daftar.length === 0 ? (
        <Kosong
          pesan="Belum ada paket untuk dibandingkan. Tambah paket dari halaman vendor."
          aksi={{ label: 'Lihat vendor', href: '/vendor' }}
        />
      ) : (
        <ul className="daftar-kartu">
          {daftar.map((k) => (
            <li key={k.id} className="kartu">
              <h2>{k.nama}</h2>
              <p className="teks-lembut">{jumlah.get(k.id)} paket</p>
              <Link href={`/komparasi/${k.id}`} className="tautan-aksi" aria-label={`Bandingkan paket ${k.nama}`}>
                Bandingkan
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
