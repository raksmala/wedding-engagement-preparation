import Link from 'next/link';
import { JudulHalaman } from '@/components/JudulHalaman';

export default function PaketTidakDitemukan() {
  return (
    <>
      <JudulHalaman judul="Paket tidak ditemukan" />
      <p>Paket atau vendor ini tidak ada atau sudah dihapus.</p>
      <p>
        <Link href="/vendor" className="tautan-aksi">
          Kembali ke daftar vendor
        </Link>
      </p>
    </>
  );
}
