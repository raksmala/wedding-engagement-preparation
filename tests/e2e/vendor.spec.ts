import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { bersihkanTest, buatEditorTest } from '../db/helpers';
import { masukSebagaiEditor } from './helpers';

const EMAIL = 'vendor@test.local';
let editor: SupabaseClient;

async function bersihkanVendor() {
  const { error } = await editor.from('vendor').delete().like('nama', 'Foto A%');
  if (error) throw error;
  const { error: e2 } = await editor.from('vendor').delete().like('nama', 'Vendor Uji %');
  if (e2) throw e2;
}

test.beforeAll(async () => {
  editor = await buatEditorTest(EMAIL);
});

test.beforeEach(async ({ page }) => {
  await bersihkanVendor();
  await masukSebagaiEditor(page, EMAIL);
});

test.afterAll(async () => {
  try {
    await bersihkanVendor();
  } finally {
    await bersihkanTest();
  }
});

async function tambahFotoA(page: Page) {
  await page.goto('/vendor/baru');
  await page.getByLabel('Nama', { exact: true }).fill('Foto A');
  await page.getByLabel('Kategori').selectOption({ label: 'Foto & Video' });
  await page.getByLabel('Lamaran').check();
  await page.getByLabel('WhatsApp').fill('0812-3456-7890');
  await page.getByRole('button', { name: 'Simpan' }).click();
  await expect(page).toHaveURL(/\/vendor\/[0-9a-f-]{36}$/);
}

test('tambah vendor, tombol Chat WhatsApp, dan filter Status', async ({ page }) => {
  await tambahFotoA(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Foto A' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Chat WhatsApp' })).toHaveAttribute(
    'href',
    'https://wa.me/6281234567890',
  );
  await expect(page.getByText(/Terakhir diubah oleh .+, /)).toBeVisible();

  await page.goto('/vendor?status=kandidat');
  await expect(page.getByRole('heading', { name: 'Foto A' })).toBeVisible();

  await page.goto('/vendor?status=booked');
  await expect(page.getByRole('heading', { name: 'Foto A' })).toHaveCount(0);
  await expect(page.getByText('Tidak ada vendor yang cocok dengan filter ini.')).toBeVisible();
});

test('filter lewat form memakai query string', async ({ page }) => {
  await tambahFotoA(page);
  await page.goto('/vendor');
  await page.getByLabel('Kategori').selectOption({ label: 'Venue' });
  await page.getByRole('button', { name: 'Terapkan' }).click();
  await expect(page).toHaveURL(/kategori=/);
  await expect(page.getByRole('heading', { name: 'Foto A' })).toHaveCount(0);
  await page.getByLabel('Kategori').selectOption({ label: 'Foto & Video' });
  await page.getByLabel('Acara').selectOption({ label: 'Lamaran' });
  await page.getByRole('button', { name: 'Terapkan' }).click();
  await expect(page.getByRole('heading', { name: 'Foto A' })).toBeVisible();
});

test('mengubah status, termasuk Batal dari status mana saja', async ({ page }) => {
  await tambahFotoA(page);
  await page.getByLabel('Ubah status').selectOption('survei_nego');
  await page.getByRole('button', { name: 'Simpan status' }).click();
  await expect(page.getByTestId('status-vendor')).toHaveText('Survei/Nego');
  await page.getByLabel('Ubah status').selectOption('batal');
  await page.getByRole('button', { name: 'Simpan status' }).click();
  await expect(page.getByTestId('status-vendor')).toHaveText('Batal');
});

test('nomor WhatsApp tidak dikenali menampilkan petunjuk dan tersimpan apa adanya', async ({ page }) => {
  await page.goto('/vendor/baru');
  await page.getByLabel('Nama', { exact: true }).fill('Vendor Uji Wa');
  await page.getByLabel('Kategori').selectOption({ label: 'Venue' });
  await page.getByLabel('WhatsApp').fill('abc');
  await expect(page.getByText('Nomor WhatsApp tidak dikenali')).toBeVisible();
  await page.getByRole('button', { name: 'Simpan' }).click();
  await expect(page).toHaveURL(/\/vendor\/[0-9a-f-]{36}$/);
  await expect(page.getByText('abc')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Chat WhatsApp' })).toHaveCount(0);
});

test('menghapus Acara yang dipakai vendor menampilkan pesan', async ({ page }) => {
  await tambahFotoA(page);
  await page.goto('/acara');
  await page.getByRole('link', { name: 'Ubah Lamaran' }).click();
  await page.getByRole('button', { name: 'Hapus acara' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hapus' }).click();
  await expect(
    page.getByRole('dialog').getByText('Acara ini masih dipakai vendor. Lepas vendornya dulu.'),
  ).toBeVisible();
});

test('filter tanpa hasil menampilkan tampilan kosong', async ({ page }) => {
  await page.goto('/vendor?kategori=00000000-0000-0000-0000-000000000000');
  await expect(page.getByText('Tidak ada vendor yang cocok dengan filter ini.')).toBeVisible();
});

test('layout 375px tanpa scroll horizontal dan tap target 44px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await tambahFotoA(page);
  for (const url of [page.url(), '/vendor', '/vendor/baru']) {
    await page.goto(url);
    const lebih = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(lebih).toBe(false);
    const kecil = await page.evaluate(() =>
      [...document.querySelectorAll('main a, main button, main select')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < 44).length,
    );
    expect(kecil).toBe(0);
  }
});
