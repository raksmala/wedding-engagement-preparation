import { describe, expect, test } from 'vitest';
import { formatTanggal, formatTanggalJamWib, hariIniJakarta, kelompokJatuhTempo } from '@/lib/tanggal';

describe('hariIniJakarta', () => {
  test('memakai zona Asia/Jakarta', () => {
    expect(hariIniJakarta(new Date('2026-11-24T17:30:00Z'))).toBe('2026-11-25');
  });
});

describe('kelompokJatuhTempo', () => {
  test('mengelompokkan tanggal jatuh tempo', () => {
    expect(kelompokJatuhTempo('2026-11-24', '2026-11-25')).toBe('terlambat');
    expect(kelompokJatuhTempo('2026-11-25', '2026-11-25')).toBe('hari_ini');
    expect(kelompokJatuhTempo('2026-12-02', '2026-11-25')).toBe('tujuh_hari');
    expect(kelompokJatuhTempo('2026-12-03', '2026-11-25')).toBeNull();
    expect(kelompokJatuhTempo(null, '2026-11-25')).toBeNull();
  });
});

describe('formatTanggal', () => {
  test('memakai nama bulan Indonesia', () => {
    expect(formatTanggal('2026-12-20')).toBe('20 Desember 2026');
    expect(formatTanggal('2027-01-01')).toBe('1 Januari 2027');
    expect(formatTanggal('2026-08-17')).toBe('17 Agustus 2026');
  });
});

describe('formatTanggalJamWib', () => {
  test('menampilkan tanggal dan jam WIB', () => {
    expect(formatTanggalJamWib('2026-11-24T08:05:00Z')).toBe('24 November 2026 15.05 WIB');
  });
  test('melewati tengah malam di zona Jakarta', () => {
    expect(formatTanggalJamWib('2026-11-24T17:30:00Z')).toBe('25 November 2026 00.30 WIB');
  });
});
