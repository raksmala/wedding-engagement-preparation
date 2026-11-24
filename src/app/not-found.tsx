import type { Metadata } from 'next';
import { JudulHalaman } from '@/components/JudulHalaman';
import { Kosong } from '@/components/Kosong';

// Layout root memakai judul biasa tanpa template, dan template tidak berlaku di segment yang sama, jadi nama aplikasi ditulis lengkap.
export const metadata: Metadata = { title: 'Halaman tidak ditemukan | Rendy & Dinar' };

// Dipakai untuk URL yang tidak cocok dengan route mana pun, dan notFound() yang tidak punya not-found.tsx di foldernya.
// Dirender di layout root, jadi tanpa navigasi bawah. Dashboard tetap meminta login kalau belum masuk.
export default function TidakDitemukan() {
  return (
    <main className="halaman-mandiri">
      <JudulHalaman judul="Rendy & Dinar" />
      <Kosong pesan="Halaman tidak ditemukan." aksi={{ label: 'Kembali ke dashboard', href: '/' }} />
    </main>
  );
}
