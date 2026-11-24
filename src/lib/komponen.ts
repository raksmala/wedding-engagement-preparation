export type TipeKomponen = 'teks' | 'angka' | 'ya_tidak';

export const LABEL_TIPE_KOMPONEN: Record<TipeKomponen, string> = {
  teks: 'Teks',
  angka: 'Angka',
  ya_tidak: 'Ya/Tidak',
};

export const NILAI_KOSONG = 'Belum diisi';

// Nilai disimpan sebagai teks. Tampilannya mengikuti tipe Komponen.
export function tampilkanNilai(tipe: TipeKomponen, satuan: string | null, nilai: string): string {
  if (tipe === 'ya_tidak') return nilai === 'ya' ? 'Ya' : nilai === 'tidak' ? 'Tidak' : nilai;
  if (tipe === 'angka' && satuan) return `${nilai} ${satuan}`;
  return nilai;
}

export function validasiNilai(tipe: TipeKomponen, nilai: string): boolean {
  if (tipe === 'angka') return /^\d+(?:[.,]\d+)?$/.test(nilai);
  if (tipe === 'ya_tidak') return nilai === 'ya' || nilai === 'tidak';
  return true;
}
