import { describe, expect, test } from 'vitest';
import { linkWhatsApp, normalisasiWhatsApp } from '@/lib/whatsapp';

describe('normalisasiWhatsApp', () => {
  test('mengubah berbagai format ke 62xxxxxxxxxx', () => {
    expect(normalisasiWhatsApp('0812-3456-7890')).toBe('6281234567890');
    expect(normalisasiWhatsApp('+62 812 3456 7890')).toBe('6281234567890');
    expect(normalisasiWhatsApp('62 (812) 3456.7890')).toBe('6281234567890');
    expect(normalisasiWhatsApp('0062 812 3456 7890')).toBe('6281234567890');
    expect(normalisasiWhatsApp('81234567890')).toBe('6281234567890');
  });
  test('null untuk nomor tidak valid', () => {
    expect(normalisasiWhatsApp('12345')).toBeNull();
    expect(normalisasiWhatsApp('abc')).toBeNull();
    expect(normalisasiWhatsApp('+62 0812 3456 7890')).toBeNull();
  });
});

describe('linkWhatsApp', () => {
  test('menormalkan nomor ke link wa.me', () => {
    expect(linkWhatsApp('0812-3456-7890')).toBe('https://wa.me/6281234567890');
    expect(linkWhatsApp('+62 812 3456 7890')).toBe('https://wa.me/6281234567890');
    expect(linkWhatsApp('6281234567890')).toBe('https://wa.me/6281234567890');
  });
  test('menolak nomor tidak valid', () => {
    expect(linkWhatsApp('12345')).toBeNull();
  });
  test('menolak 0 tepat setelah kode negara', () => {
    expect(linkWhatsApp('+62 0812 3456 7890')).toBeNull();
    expect(linkWhatsApp('620812345678')).toBeNull();
  });
  test('batas panjang digit setelah 62', () => {
    expect(linkWhatsApp('62812345678')).toBeNull();
    expect(linkWhatsApp('628123456789')).toBe('https://wa.me/628123456789');
    expect(linkWhatsApp('628123456789012')).toBe('https://wa.me/628123456789012');
    expect(linkWhatsApp('6281234567890123')).toBeNull();
  });
  test('menolak huruf', () => {
    expect(linkWhatsApp('abc')).toBeNull();
  });
});
