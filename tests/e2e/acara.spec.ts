import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { bersihkanTest, buatEditorTest } from '../db/helpers';
import { masukSebagaiEditor } from './helpers';

const EMAIL = 'acara@test.local';
const NAMA_DEFAULT = ['Lamaran', 'Akad', 'Resepsi', 'Ngunduh Mantu'];

// Service role tidak bisa menulis acara (trigger audit butuh sesi Editor), jadi pakai klien Editor.
let editor: SupabaseClient;

async function pulihkanDefault() {
  const { error } = await editor
    .from('acara')
    .update({ tanggal: null, lokasi: null, perkiraan: null, catatan: null })
    .in('nama', NAMA_DEFAULT);
  if (error) throw error;
  const { error: e2 } = await editor
    .from('acara')
    .delete()
    .like('nama', 'Acara Uji %');
  if (e2) throw e2;
}

test.beforeAll(async () => {
  editor = await buatEditorTest(EMAIL);
});

test.beforeEach(async ({ page }) => {
  await pulihkanDefault();
  await masukSebagaiEditor(page, EMAIL);
});

test.afterAll(async () => {
  await pulihkanDefault();
  await bersihkanTest();
});

function kartu(page: Page, nama: string) {
  return page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: nama, exact: true }) });
}

test('daftar menampilkan 4 Acara default dengan Tanggal belum pasti', async ({ page }) => {
  await page.goto('/acara');
  await expect(page.getByRole('heading', { level: 1, name: 'Acara' })).toBeVisible();
  for (const nama of NAMA_DEFAULT) {
    await expect(kartu(page, nama).getByText('Tanggal belum pasti')).toBeVisible();
  }
});

test('mengubah tanggal dan lokasi, lalu perkiraan', async ({ page }) => {
  await page.goto('/acara');
  await page.getByRole('link', { name: 'Ubah Lamaran' }).click();
  await page.getByLabel('Tanggal', { exact: true }).fill('2026-12-20');
  await page.getByLabel('Lokasi').fill('Rumah keluarga Dinar');
  await page.getByRole('button', { name: 'Simpan' }).click();
  await expect(page).toHaveURL(/\/acara$/);
  await expect(kartu(page, 'Lamaran').getByText('20 Desember 2026')).toBeVisible();
  await expect(kartu(page, 'Lamaran').getByText('Rumah keluarga Dinar')).toBeVisible();

  await page.getByRole('link', { name: 'Ubah Resepsi' }).click();
  await page.getByLabel('Perkiraan').fill('pertengahan 2027');
  await page.getByRole('button', { name: 'Simpan' }).click();
  await expect(kartu(page, 'Resepsi').getByText('Perkiraan: pertengahan 2027')).toBeVisible();
  await expect(kartu(page, 'Resepsi').getByText('Tanggal belum pasti')).toHaveCount(0);
});

test('Acara bertanggal tampil sebelum yang belum bertanggal', async ({ page }) => {
  await editor.from('acara').update({ tanggal: '2026-12-20' }).eq('nama', 'Ngunduh Mantu');
  await page.goto('/acara');
  await expect(page.getByRole('listitem').getByRole('heading').first()).toHaveText('Ngunduh Mantu');
});

test('menambah dan menghapus Acara dengan konfirmasi, Escape membatalkan', async ({ page }) => {
  await page.goto('/acara');
  await page.getByRole('link', { name: 'Tambah acara' }).click();
  await page.getByLabel('Nama').fill('Acara Uji Satu');
  await page.getByRole('button', { name: 'Simpan' }).click();
  await expect(kartu(page, 'Acara Uji Satu')).toBeVisible();

  await page.getByRole('link', { name: 'Ubah Acara Uji Satu' }).click();
  await page.getByRole('button', { name: 'Hapus acara' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/acara\/.+/);

  await page.getByRole('button', { name: 'Hapus acara' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hapus' }).click();
  await expect(page).toHaveURL(/\/acara$/);
  await expect(page.getByRole('heading', { name: 'Acara Uji Satu' })).toHaveCount(0);
});
