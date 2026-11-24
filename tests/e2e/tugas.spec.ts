import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest } from '../db/helpers';
import { masukSebagaiEditor } from './helpers';

// Nama Editor diambil dari bagian depan email: rendy@test.local menjadi "Rendy".
const EMAIL = 'rendy@test.local';
const EMAIL_DINAR = 'dinar@test.local';
let editor: SupabaseClient;

async function bersihkan() {
  const { error } = await admin.from('tugas').delete().like('judul', 'Uji %');
  if (error) throw error;
  const { error: e2 } = await admin.from('vendor').delete().like('nama', 'Uji %');
  if (e2) throw e2;
}

test.beforeAll(async () => {
  editor = await buatEditorTest(EMAIL);
  await buatEditorTest(EMAIL_DINAR);
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

async function vendorFotoA(): Promise<string> {
  const { data: k, error: ek } = await editor.from('kategori_vendor').select('id').eq('nama', 'Foto & Video').single();
  if (ek) throw ek;
  const { data, error } = await editor
    .from('vendor')
    .insert({ nama: 'Uji Foto A', kategori_vendor_id: k.id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

const logKontak = (page: Page) => page.getByRole('region', { name: 'Log Kontak' });
const daftarTugas = (page: Page) => page.getByRole('list', { name: 'Daftar tugas' });

async function filterTugas(page: Page, o: { pic?: string; status?: string }) {
  const form = page.getByRole('search', { name: 'Filter tugas' });
  if (o.pic) await form.getByLabel('PIC').selectOption({ label: o.pic });
  if (o.status) await form.getByLabel('Status').selectOption({ label: o.status });
  await form.getByRole('button', { name: 'Terapkan' }).click();
}

test('log kontak whatsapp dan follow-up untuk Dinar tampil di halaman tugas', async ({ page }) => {
  const vendorId = await vendorFotoA();
  await page.goto(`/vendor/${vendorId}`);

  const seksi = logKontak(page);
  await expect(seksi.getByText('Belum ada log kontak.')).toBeVisible();
  await seksi.getByRole('button', { name: 'Tambah log kontak' }).click();
  const form = page.getByRole('form', { name: 'Form log kontak' });
  await form.getByLabel('Saluran').selectOption({ label: 'WhatsApp' });
  await form.getByLabel('Isi').fill('Minta revisi pricelist');
  await form.getByRole('button', { name: 'Simpan log kontak' }).click();
  await expect(form).toHaveCount(0);

  const log = seksi.getByRole('listitem').filter({ hasText: 'Minta revisi pricelist' });
  await expect(log).toContainText('WhatsApp');
  await log.getByRole('button', { name: 'Buat follow-up' }).click();
  const fu = page.getByRole('form', { name: 'Form follow-up' });
  await fu.getByLabel('Judul').fill('Uji Cek revisi pricelist Foto A');
  await fu.getByLabel('Jatuh tempo').fill('2026-12-01');
  await fu.getByLabel('PIC').selectOption({ label: 'Dinar' });
  await fu.getByRole('button', { name: 'Simpan tugas' }).click();
  await expect(fu).toHaveCount(0);
  await expect(log).toContainText('Uji Cek revisi pricelist Foto A');

  await page.goto('/tugas');
  const item = daftarTugas(page).getByRole('listitem').filter({ hasText: 'Uji Cek revisi pricelist Foto A' });
  await expect(item).toContainText('PIC Dinar');
  await expect(item).toContainText('1 Desember 2026');
  await expect(item.getByRole('link', { name: 'Uji Foto A' })).toHaveAttribute('href', `/vendor/${vendorId}`);

  await filterTugas(page, { pic: 'Rendy' });
  await expect(page).toHaveURL(/pic=/);
  await expect(page.getByText('Uji Cek revisi pricelist Foto A')).toHaveCount(0);
  await expect(page.getByText('Tidak ada tugas yang cocok dengan filter ini.')).toBeVisible();

  await filterTugas(page, { pic: 'Dinar' });
  await expect(page.getByText('Uji Cek revisi pricelist Foto A')).toBeVisible();
});

test('tugas tanpa jatuh tempo, selesai, lalu dibuka lagi', async ({ page }) => {
  await page.goto('/tugas');
  await page.getByRole('button', { name: 'Tambah tugas' }).click();
  const form = page.getByRole('form', { name: 'Form tugas' });
  await form.getByLabel('Judul').fill('Uji Beli map dokumen');
  await form.getByLabel('PIC').selectOption({ label: 'Rendy' });
  await form.getByRole('button', { name: 'Simpan tugas' }).click();
  await expect(form).toHaveCount(0);

  const item = daftarTugas(page).getByRole('listitem').filter({ hasText: 'Uji Beli map dokumen' });
  await expect(item).toContainText('Tanpa jatuh tempo');
  await expect(item).toContainText('Terakhir diubah oleh Rendy');

  await item.getByRole('button', { name: 'Selesai' }).click();
  await expect(page.getByText('Uji Beli map dokumen')).toHaveCount(0);

  await filterTugas(page, { status: 'Selesai' });
  const selesai = daftarTugas(page).getByRole('listitem').filter({ hasText: 'Uji Beli map dokumen' });
  await expect(selesai).toContainText('Selesai');
  await selesai.getByRole('button', { name: 'Buka lagi' }).click();
  await expect(page.getByText('Uji Beli map dokumen')).toHaveCount(0);

  await filterTugas(page, { status: 'Belum selesai' });
  await expect(page.getByText('Uji Beli map dokumen')).toBeVisible();
});

test('tugas lewat jatuh tempo berlabel terlambat dan form menolak judul kosong', async ({ page }) => {
  const { data: pic } = await editor.rpc('editor_saat_ini');
  const { error } = await editor
    .from('tugas')
    .insert({ judul: 'Uji Tugas Lama', pic_id: pic as string, jatuh_tempo: '2026-01-01' });
  if (error) throw error;

  await page.goto('/tugas');
  const item = daftarTugas(page).getByRole('listitem').filter({ hasText: 'Uji Tugas Lama' });
  await expect(item).toContainText('Terlambat');

  await page.getByRole('button', { name: 'Tambah tugas' }).click();
  const form = page.getByRole('form', { name: 'Form tugas' });
  await form.getByRole('button', { name: 'Simpan tugas' }).click();
  await expect(form.getByRole('alert')).toHaveText('Judul tugas wajib diisi.');
});

test('halaman tugas tidak melebar di 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/tugas');
  const lebar = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(lebar).toBeLessThanOrEqual(375);
});
