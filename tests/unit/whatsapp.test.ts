import { describe, expect, test } from 'vitest';
import { linkWhatsApp } from '@/lib/whatsapp';

describe('linkWhatsApp', () => {
  test('menormalkan nomor ke link wa.me', () => {
    expect(linkWhatsApp('0812-3456-7890')).toBe('https://wa.me/6281234567890');
    expect(linkWhatsApp('+62 812 3456 7890')).toBe('https://wa.me/6281234567890');
    expect(linkWhatsApp('6281234567890')).toBe('https://wa.me/6281234567890');
  });
  test('menolak nomor tidak valid', () => {
    expect(linkWhatsApp('12345')).toBeNull();
  });
});
