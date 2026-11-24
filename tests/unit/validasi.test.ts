import { describe, expect, test } from 'vitest';
import { adalahUuid } from '@/lib/validasi';

describe('adalahUuid', () => {
  test('menerima uuid sah', () => {
    expect(adalahUuid('0b9f3a52-1c3e-4f6d-9a7b-2d1e5c8f4a10')).toBe(true);
    expect(adalahUuid('0B9F3A52-1C3E-4F6D-9A7B-2D1E5C8F4A10')).toBe(true);
  });
  test('menolak selain uuid', () => {
    expect(adalahUuid('')).toBe(false);
    expect(adalahUuid('baru')).toBe(false);
    expect(adalahUuid('0b9f3a52-1c3e-4f6d-9a7b-2d1e5c8f4a10x')).toBe(false);
    expect(adalahUuid('../0b9f3a52-1c3e-4f6d-9a7b-2d1e5c8f4a10')).toBe(false);
  });
});
