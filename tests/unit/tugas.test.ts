import { describe, expect, test } from 'vitest';
import { adalahSaluran, tugasTerlambat } from '@/lib/tugas';

describe('tugasTerlambat', () => {
  test('belum selesai dan lewat jatuh tempo', () => {
    expect(tugasTerlambat({ status: 'belum', jatuh_tempo: '2026-11-24' }, '2026-11-25')).toBe(true);
  });
  test('jatuh tempo hari ini belum terlambat', () => {
    expect(tugasTerlambat({ status: 'belum', jatuh_tempo: '2026-11-25' }, '2026-11-25')).toBe(false);
  });
  test('tugas selesai tidak pernah terlambat', () => {
    expect(tugasTerlambat({ status: 'selesai', jatuh_tempo: '2026-01-01' }, '2026-11-25')).toBe(false);
  });
  test('tanpa jatuh tempo tidak terlambat', () => {
    expect(tugasTerlambat({ status: 'belum', jatuh_tempo: null }, '2026-11-25')).toBe(false);
  });
});

describe('adalahSaluran', () => {
  test('menerima saluran yang dikenal saja', () => {
    expect(adalahSaluran('whatsapp')).toBe(true);
    expect(adalahSaluran('sms')).toBe(false);
    expect(adalahSaluran('toString')).toBe(false);
  });
});
