import { describe, expect, test } from 'vitest';
import { BAGIAN_DEFAULT, namaBagian, rapikanBagian } from '@/lib/shareLink';

describe('rapikanBagian', () => {
  test('bagian sah diurutkan dan dibuat unik', () => {
    expect(rapikanBagian(['tugas', 'acara', 'tugas'])).toEqual(['acara', 'tugas']);
    expect(rapikanBagian(['keuangan', 'vendor', 'acara', 'tugas'])).toEqual(['acara', 'vendor', 'tugas', 'keuangan']);
  });
  test('kosong atau nilai tidak dikenal ditolak', () => {
    expect(rapikanBagian([])).toBeNull();
    expect(rapikanBagian(['acara', 'tamu'])).toBeNull();
    expect(rapikanBagian(['Acara'])).toBeNull();
    expect(rapikanBagian(['toString'])).toBeNull();
  });
});

describe('namaBagian', () => {
  test('nama Indonesia sesuai urutan tampil', () => {
    expect(namaBagian(['tugas', 'acara'])).toBe('Acara, Tugas');
    expect(namaBagian(['acara', 'vendor', 'tugas', 'keuangan'])).toBe('Acara, Vendor, Tugas, Keuangan');
  });
});

test('Keuangan tidak dicentang secara default', () => {
  expect(BAGIAN_DEFAULT).toEqual(['acara', 'vendor', 'tugas']);
});
