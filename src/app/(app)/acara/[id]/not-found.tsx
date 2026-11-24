import Link from 'next/link';
import { JudulHalaman } from '@/components/JudulHalaman';

export default function AcaraTidakDitemukan() {
  return (
    <>
      <JudulHalaman judul="Acara tidak ditemukan" />
      <p>Acara ini tidak ada atau sudah dihapus.</p>
      <p>
        <Link href="/acara" className="tautan-aksi">
          Kembali ke daftar acara
        </Link>
      </p>
    </>
  );
}
