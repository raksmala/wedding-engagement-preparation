import { describe, expect, test } from 'vitest';
import { tampilkanNilai, validasiNilai } from '@/lib/komponen';

describe('tampilkanNilai', () => {
  test('angka digabung dengan satuan', () => {
    expect(tampilkanNilai('angka', 'jam', '8')).toBe('8 jam');
    expect(tampilkanNilai('angka', null, '8')).toBe('8');
  });
  test('ya_tidak tampil Ya dan Tidak', () => {
    expect(tampilkanNilai('ya_tidak', null, 'ya')).toBe('Ya');
    expect(tampilkanNilai('ya_tidak', null, 'tidak')).toBe('Tidak');
  });
  test('teks apa adanya', () => {
    expect(tampilkanNilai('teks', null, 'Album 30 halaman')).toBe('Album 30 halaman');
  });
});

describe('validasiNilai', () => {
  test('angka hanya digit dengan desimal opsional', () => {
    expect(validasiNilai('angka', '8')).toBe(true);
    expect(validasiNilai('angka', '1,5')).toBe(true);
    expect(validasiNilai('angka', 'delapan')).toBe(false);
    expect(validasiNilai('angka', '8 jam')).toBe(false);
  });
  test('ya_tidak hanya ya atau tidak', () => {
    expect(validasiNilai('ya_tidak', 'ya')).toBe(true);
    expect(validasiNilai('ya_tidak', 'mungkin')).toBe(false);
  });
  test('teks bebas', () => {
    expect(validasiNilai('teks', 'apa saja')).toBe(true);
  });
});
