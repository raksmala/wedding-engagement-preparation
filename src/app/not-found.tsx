import { JudulHalaman } from '@/components/JudulHalaman';
import { Kosong } from '@/components/Kosong';

// Dipakai untuk URL yang tidak ada dan notFound() yang tidak punya not-found.tsx sendiri (misalnya /acara/{id}).
// Dirender di layout root, jadi tanpa navigasi bawah. Dashboard tetap meminta login kalau belum masuk.
export default function TidakDitemukan() {
  return (
    <main className="halaman-mandiri">
      <JudulHalaman judul="Rendy & Dinar" />
      <Kosong pesan="Halaman tidak ditemukan." aksi={{ label: 'Kembali ke dashboard', href: '/' }} />
    </main>
  );
}
