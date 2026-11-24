import { describe, expect, test } from 'vitest';
import { formatRupiah, parseRupiah } from '@/lib/rupiah';

describe('formatRupiah', () => {
  test('memakai titik ribuan dan spasi biasa', () => {
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
    expect(formatRupiah(0)).toBe('Rp 0');
  });
});

describe('parseRupiah', () => {
  test('menerima angka valid', () => {
    expect(parseRupiah('1.500.000')).toBe(1500000);
    expect(parseRupiah('Rp 1.500.000')).toBe(1500000);
    expect(parseRupiah(' 1500000 ')).toBe(1500000);
  });
  test('menolak input tidak valid', () => {
    expect(parseRupiah('1,5jt')).toBeNull();
    expect(parseRupiah('')).toBeNull();
    expect(parseRupiah('-5000')).toBeNull();
    expect(parseRupiah('1.50.000')).toBeNull();
  });
});
