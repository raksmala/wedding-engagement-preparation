import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest } from '../db/helpers';
import { masukSebagaiEditor } from './helpers';

const EMAIL = 'paket@test.local';
const PNG = path.join(__dirname, 'fixtures', 'pricelist.png');
const TXT = path.join(__dirname, 'fixtures', 'catatan.txt');
let editor: SupabaseClient;

async function bersihkan() {
  // Hapus objek Storage milik Paket uji dulu, karena baris Paket ikut terhapus bersama Vendor.
  const { data: vendor } = await editor.from('vendor').select('id').like('nama', 'Uji %');
  if (vendor && vendor.length > 0) {
    const { data: paket } = await editor
      .from('paket')
      .select('lampiran')
      .in(
        'vendor_id',
        vendor.map((v) => v.id),
      );
    const berkas = (paket ?? []).flatMap((p) => p.lampiran);
    if (berkas.length > 0) await admin.storage.from('lampiran').remove(berkas);
  }
  const { error } = await editor.from('vendor').delete().like('nama', 'Uji %');
  if (error) throw error;
  const { error: e2 } = await editor.from('komponen').delete().like('nama', 'Uji %');
  if (e2) throw e2;
}

test.beforeAll(async () => {
  editor = await buatEditorTest(EMAIL);
});

test.beforeEach(async ({ page }) => {
  await bersihkan();
  await masukSebagaiEditor(page, EMAIL);
});

test.afterAll(async () => {
  try {
    await bersihkan();
  } finally {
    await bersihkanTest();
  }
});

async function tambahFotoA(page: Page): Promise<string> {
  await page.goto('/vendor/baru');
  await page.getByLabel('Nama', { exact: true }).fill('Uji Foto A');
  await page.getByLabel('Kategori').selectOption({ label: 'Foto & Video' });
  await page.getByLabel('Lamaran').check();
  await page.getByRole('button', { name: 'Simpan' }).click();
  await expect(page).toHaveURL(/\/vendor\/[0-9a-f-]{36}$/);
  return page.url();
}

async function tambahKomponen(page: Page, nama: string, tipe: string, satuan?: string) {
  await page.getByLabel('Nama komponen').fill(nama);
  await page.getByLabel('Tipe').selectOption(tipe);
  if (satuan) await page.getByLabel('Satuan').fill(satuan);
  await page.getByRole('button', { name: 'Simpan komponen' }).click();
  await expect(page.getByRole('heading', { name: nama })).toBeVisible();
}

async function siapkanKomponen(page: Page) {
  await page.goto('/pengaturan/komponen');
  await page.getByLabel('Kategori').selectOption({ label: 'Foto & Video' });
  await page.getByRole('button', { name: 'Pilih' }).click();
  await expect(page).toHaveURL(/kategori=/);
  await tambahKomponen(page, 'Uji Durasi', 'angka', 'jam');
  await tambahKomponen(page, 'Uji Album', 'ya_tidak');
}

async function isiPaketGold(page: Page, urlVendor: string) {
  await page.goto(urlVendor);
  await page.getByRole('link', { name: 'Tambah paket' }).click();
  await page.getByLabel('Nama paket').fill('Uji Gold');
  await page.getByLabel('Harga').fill('8.500.000');
  await page.getByLabel('Uji Durasi').fill('8');
  await page.getByLabel('Uji Album').selectOption('ya');
  await page.getByLabel('Syarat DP').fill('DP 30%, pelunasan H-14');
  await page.getByLabel('Lain-lain').fill('Gratis sesi prewedding');
  await page.getByRole('button', { name: 'Simpan paket' }).click();
  await expect(page).toHaveURL(urlVendor);
}

test('tambah Komponen dan Paket, nilai tampil di detail vendor', async ({ page }) => {
  const urlVendor = await tambahFotoA(page);
  await siapkanKomponen(page);
  await isiPaketGold(page, urlVendor);

  const paket = page.getByRole('listitem').filter({ hasText: 'Uji Gold' });
  await expect(paket.getByText('Rp 8.500.000')).toBeVisible();
  await expect(paket.getByText('8 jam')).toBeVisible();
  await expect(paket.getByText('Ya', { exact: true })).toBeVisible();
  await expect(paket.getByText('DP 30%, pelunasan H-14')).toBeVisible();
  await expect(paket.getByText('Gratis sesi prewedding')).toBeVisible();
  await expect(paket.getByText('Aktif', { exact: true })).toBeVisible();

  // Ubah paket menampilkan nilai yang tersimpan.
  await paket.getByRole('link', { name: 'Ubah paket Uji Gold' }).click();
  await expect(page.getByLabel('Harga')).toHaveValue('8.500.000');
  await expect(page.getByLabel('Uji Durasi')).toHaveValue('8');
  await expect(page.getByLabel('Uji Album')).toHaveValue('ya');
});

test('harga yang tidak bisa dibaca menampilkan pesan dan isian tetap ada', async ({ page }) => {
  const urlVendor = await tambahFotoA(page);
  await page.goto(`${urlVendor}/paket/baru`);
  await page.getByLabel('Nama paket').fill('Uji Gold');
  await page.getByLabel('Harga').fill('1,5jt');
  await page.getByRole('button', { name: 'Simpan paket' }).click();
  await expect(page.getByText('Tulis nominal dengan angka, contoh 1.500.000')).toBeVisible();
  await expect(page.getByLabel('Nama paket')).toHaveValue('Uji Gold');
  await expect(page.getByLabel('Harga')).toHaveValue('1,5jt');
});

test('lampiran: unggah PNG tampil di daftar, file salah ditolak, hapus lewat konfirmasi', async ({ page }) => {
  const urlVendor = await tambahFotoA(page);
  await page.goto(`${urlVendor}/paket/baru`);
  await page.getByLabel('Nama paket').fill('Uji Gold');
  await page.getByLabel('Harga').fill('8.500.000');
  await page.getByRole('button', { name: 'Simpan paket' }).click();
  await expect(page).toHaveURL(urlVendor);

  const paket = page.getByRole('listitem').filter({ hasText: 'Uji Gold' });
  await paket.getByLabel('Unggah lampiran').setInputFiles(TXT);
  await expect(paket.getByText('File maksimal 10 MB, berupa JPG, PNG, WEBP, atau PDF.')).toBeVisible();

  await paket.getByLabel('Unggah lampiran').setInputFiles(PNG);
  const berkas = paket.getByRole('link', { name: 'pricelist.png' });
  await expect(berkas).toBeVisible();
  const href = await berkas.getAttribute('href');
  expect(href).toContain('/storage/v1/object/sign/lampiran/paket/');
  const respons = await page.request.get(href!);
  expect(respons.status()).toBe(200);

  // Tetap ada setelah muat ulang.
  await page.reload();
  await expect(paket.getByRole('link', { name: 'pricelist.png' })).toBeVisible();

  await paket.getByRole('button', { name: 'Hapus lampiran pricelist.png' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Batal' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Hapus' }).click();
  await expect(paket.getByRole('link', { name: 'pricelist.png' })).toHaveCount(0);
});

test('menghapus Komponen yang sudah berisi meminta konfirmasi dan ikut menghapus nilainya', async ({ page }) => {
  const urlVendor = await tambahFotoA(page);
  await siapkanKomponen(page);
  await isiPaketGold(page, urlVendor);

  await page.goto('/pengaturan/komponen');
  await page.getByLabel('Kategori').selectOption({ label: 'Foto & Video' });
  await page.getByRole('button', { name: 'Pilih' }).click();
  await page.getByRole('button', { name: 'Hapus Uji Durasi' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Nilainya di 1 paket ikut terhapus.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Batal' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Hapus' }).click();
  await expect(page.getByRole('heading', { name: 'Uji Durasi' })).toHaveCount(0);

  await page.goto(urlVendor);
  const paket = page.getByRole('listitem').filter({ hasText: 'Uji Gold' });
  await expect(paket.getByText('8 jam')).toHaveCount(0);
  await expect(paket.getByText('Ya', { exact: true })).toBeVisible();
});

test('urutan Komponen bisa digeser dan nama ganda ditolak', async ({ page }) => {
  await tambahFotoA(page);
  await siapkanKomponen(page);
  const judul = page.locator('main h2, main h3').filter({ hasText: /^Uji (Durasi|Album)$/ });
  await expect(judul).toHaveText(['Uji Durasi', 'Uji Album']);
  await page.getByRole('button', { name: 'Naik Uji Album' }).click();
  await expect(judul).toHaveText(['Uji Album', 'Uji Durasi']);
  await page.reload();
  await expect(judul).toHaveText(['Uji Album', 'Uji Durasi']);

  await page.getByLabel('Nama komponen').fill('Uji Durasi');
  await page.getByRole('button', { name: 'Simpan komponen' }).click();
  await expect(page.getByText('Komponen dengan nama itu sudah ada di kategori ini.')).toBeVisible();
});

test('layout 375px tanpa scroll horizontal dan tap target 44px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const urlVendor = await tambahFotoA(page);
  await siapkanKomponen(page);
  await isiPaketGold(page, urlVendor);
  const paket = page.getByRole('listitem').filter({ hasText: 'Uji Gold' });
  await paket.getByLabel('Unggah lampiran').setInputFiles(PNG);
  await expect(paket.getByRole('link', { name: 'pricelist.png' })).toBeVisible();

  const halaman = [urlVendor, `${urlVendor}/paket/baru`, '/pengaturan/komponen'];
  for (const url of halaman) {
    await page.goto(url);
    if (url === '/pengaturan/komponen') {
      await page.getByLabel('Kategori').selectOption({ label: 'Foto & Video' });
      await page.getByRole('button', { name: 'Pilih' }).click();
    }
    const lebih = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(lebih).toBe(false);
    const kecil = await page.evaluate(() =>
      [...document.querySelectorAll('main a, main button, main select, main input:not([type=hidden])')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < 44).length,
    );
    expect(kecil).toBe(0);
  }
});
