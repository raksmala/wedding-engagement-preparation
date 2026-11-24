import { Kosong } from '@/components/Kosong';

export default function NotFound() {
  return <Kosong pesan="Kategori tidak ditemukan." aksi={{ label: 'Kembali ke komparasi', href: '/komparasi' }} />;
}
