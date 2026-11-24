import { describe, expect, test } from 'vitest';
import {
  namaFileAman,
  namaTampil,
  pathLampiranSah,
  validasiFileLampiran,
} from '@/lib/lampiran';

const ID = '0b9f3a52-1c3e-4f6d-9a7b-2d1e5c8f4a10';

describe('namaFileAman', () => {
  test('membersihkan karakter dan menambah timestamp', () => {
    expect(namaFileAman('Price List Gold (2027).PDF', 1700000000000)).toBe(
      '1700000000000-price-list-gold-2027.pdf',
    );
  });
  test('menjaga ekstensi dan membuang path', () => {
    expect(namaFileAman('../../etc/pass wd.png', 1)).toBe('1-pass-wd.png');
  });
  test('nama kosong tetap menghasilkan nama sah', () => {
    expect(namaFileAman('###.jpg', 5)).toBe('5-file.jpg');
  });
  test('nama panjang dipotong', () => {
    expect(namaFileAman(`${'a'.repeat(300)}.png`, 1).length).toBeLessThanOrEqual(100);
  });
});

describe('namaTampil', () => {
  test('membuang timestamp di depan', () => {
    expect(namaTampil(`paket/${ID}/1700000000000-price-list.pdf`)).toBe('price-list.pdf');
  });
});

describe('pathLampiranSah', () => {
  test('hanya tabel di allowlist dan path di bawah tabel/id', () => {
    expect(pathLampiranSah('paket', ID, `paket/${ID}/1-a.png`)).toBe(true);
    expect(pathLampiranSah('kontrak', ID, `kontrak/${ID}/1-a.png`)).toBe(false);
    expect(pathLampiranSah('paket', ID, `paket/${ID}/../x/1-a.png`)).toBe(false);
    expect(pathLampiranSah('paket', ID, `paket/${ID}/sub/1-a.png`)).toBe(false);
    expect(pathLampiranSah('paket', ID, `paket/lain/1-a.png`)).toBe(false);
    expect(pathLampiranSah('paket', 'bukan-uuid', `paket/bukan-uuid/1-a.png`)).toBe(false);
  });
});

describe('validasiFileLampiran', () => {
  test('menerima jpg, png, webp, pdf sampai 10 MB', () => {
    expect(validasiFileLampiran({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validasiFileLampiran({ type: 'application/pdf', size: 10 * 1024 * 1024 })).toBeNull();
  });
  test('menolak terlalu besar atau tipe salah dengan pesan Indonesia', () => {
    const pesan = 'File maksimal 10 MB, berupa JPG, PNG, WEBP, atau PDF.';
    expect(validasiFileLampiran({ type: 'image/png', size: 10 * 1024 * 1024 + 1 })).toBe(pesan);
    expect(validasiFileLampiran({ type: 'text/plain', size: 10 })).toBe(pesan);
  });
});
