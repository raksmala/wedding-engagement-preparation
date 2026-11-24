import { describe, expect, test } from 'vitest';
import { hariIniJakarta, kelompokJatuhTempo } from '@/lib/tanggal';

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
