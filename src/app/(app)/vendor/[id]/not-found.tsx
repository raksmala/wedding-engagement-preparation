import Link from 'next/link';
import { JudulHalaman } from '@/components/JudulHalaman';

export default function VendorTidakDitemukan() {
  return (
    <>
      <JudulHalaman judul="Vendor tidak ditemukan" />
      <p>Vendor ini tidak ada atau sudah dihapus.</p>
      <p>
        <Link href="/vendor" className="tautan-aksi">
          Kembali ke daftar vendor
        </Link>
      </p>
    </>
  );
}
