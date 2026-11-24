import { formatTanggalJamWib } from '@/lib/tanggal';

// "Terakhir diubah oleh {nama Editor}, {tanggal jam WIB}".
export function jejakAudit(diubahOleh: string | null, diubahPada: string, nama: Map<string, string>): string {
  const pengubah = (diubahOleh && nama.get(diubahOleh)) || 'Editor tidak dikenal';
  return `Terakhir diubah oleh ${pengubah}, ${formatTanggalJamWib(diubahPada)}`;
}
