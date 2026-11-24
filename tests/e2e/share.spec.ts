import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, hapusDataUji } from '../db/helpers';
import { masukSebagaiEditor } from './helpers';

const EMAIL = 'share@test.local';
const LABEL = 'Uji Keluarga Dinar';
let editor: SupabaseClient;

async function hapusShareLinkUji() {
  const { error } = await admin.from('share_link').delete().like('label', 'Uji %');
  if (error) throw error;
}

async function idByNama(tabel: string, nama: string): Promise<string> {
  const { data, error } = await editor.from(tabel).select('id').eq('nama', nama).single();
  if (error) throw error;
  return data.id;
}

// Vendor Booked dengan harga Paket, supaya ada nominal yang bisa bocor kalau Share Link salah.
async function vendorBerharga(): Promise<void> {
  const { data: v, error } = await editor
    .from('vendor')
    .insert({
      nama: 'Uji Share Venue',
      kategori_vendor_id: await idByNama('kategori_vendor', 'Venue'),
      whatsapp: '081298765432',
      catatan: 'Catatan vendor uji rahasia',
    })
    .select('id')
    .single();
  if (error) throw error;
  const { error: e2 } = await editor
    .from('vendor_acara')
    .insert({ vendor_id: v.id, acara_id: await idByNama('acara', 'Resepsi') });
  if (e2) throw e2;
  const { data: paket, error: e3 } = await editor
    .from('paket')
    .insert({ vendor_id: v.id, nama: 'Paket Uji Share', harga: 12345678 })
    .select('id')
    .single();
  if (e3) throw e3;
  const { error: e4 } = await editor.rpc('pilih_paket', { p_paket_id: paket.id });
  if (e4) throw e4;
}

const daftar = (page: Page) => page.getByRole('list', { name: 'Daftar Share Link' });
const kartu = (page: Page, label: string) =>
  daftar(page).getByRole('listitem').filter({ has: page.getByRole('heading', { name: label, exact: true }) });

async function buatLinkDariForm(page: Page, label: string): Promise<string> {
  await page.goto('/share');
  const form = page.getByRole('form', { name: 'Form Share Link' });
  await form.getByLabel('Nama link').fill(label);
  await form.getByRole('button', { name: 'Buat link' }).click();
  await expect(form.getByRole('status')).toContainText('Share Link dibuat');
  const item = kartu(page, label);
  await expect(item).toContainText('Aktif');
  return urlLengkap(page, label);
}

// Origin ditambahkan di browser setelah hidrasi, jadi tunggu sampai kotak link berisi URL lengkap.
async function urlLengkap(page: Page, label: string): Promise<string> {
  const kotak = kartu(page, label).getByRole('textbox', { name: 'Link' });
  await expect(kotak).toHaveValue(/^https?:\/\/[^/]+\/s\/[0-9a-f]{64}$/);
  return kotak.inputValue();
}

test.beforeAll(async () => {
  editor = await buatEditorTest(EMAIL);
});

test.beforeEach(async ({ page }) => {
  await hapusShareLinkUji();
  await hapusDataUji();
  await masukSebagaiEditor(page, EMAIL);
});

test.afterAll(async () => {
  try {
    await hapusShareLinkUji();
    await hapusDataUji();
  } finally {
    await bersihkanTest();
  }
});

test('share link default tanpa keuangan, dibuka tanpa sesi, lalu dicabut', async ({ page, browser }) => {
  await vendorBerharga();
  await page.goto('/share');

  // Centang default: Acara, Vendor, Tugas. Keuangan tidak.
  const form = page.getByRole('form', { name: 'Form Share Link' });
  await expect(form.getByRole('checkbox', { name: 'Acara' })).toBeChecked();
  await expect(form.getByRole('checkbox', { name: 'Vendor' })).toBeChecked();
  await expect(form.getByRole('checkbox', { name: 'Tugas' })).toBeChecked();
  await expect(form.getByRole('checkbox', { name: 'Keuangan' })).not.toBeChecked();

  const url = await buatLinkDariForm(page, LABEL);
  await expect(kartu(page, LABEL)).toContainText('Bagian: Acara, Vendor, Tugas');

  // Pembaca membuka link di konteks browser baru tanpa sesi.
  const konteks = await browser.newContext();
  try {
    const pembaca = await konteks.newPage();
    await pembaca.goto(url);
    await expect(pembaca).toHaveURL(url);
    await expect(pembaca.getByRole('heading', { level: 1, name: 'Rendy & Dinar' })).toBeVisible();
    await expect(pembaca.getByText(LABEL)).toBeVisible();
    await expect(pembaca.getByRole('heading', { level: 2, name: 'Acara' })).toBeVisible();
    await expect(pembaca.getByRole('heading', { level: 2, name: 'Vendor' })).toBeVisible();
    await expect(pembaca.getByRole('heading', { level: 2, name: 'Tugas' })).toBeVisible();
    await expect(pembaca.getByRole('heading', { level: 2, name: 'Keuangan' })).toHaveCount(0);
    const vendor = pembaca.getByRole('list', { name: 'Daftar vendor' }).getByRole('listitem').filter({ hasText: 'Uji Share Venue' });
    await expect(vendor.getByText('Venue', { exact: true })).toBeVisible();
    await expect(vendor).toContainText('Booked');
    await expect(vendor).toContainText('Acara: Resepsi');

    // Tidak ada teks Rupiah yang terlihat.
    expect(await pembaca.locator('body').innerText()).not.toContain('Rp');
    // Response mentah /s/{token} (HTML dan payload RSC) juga tidak memuat nominal atau kontak data uji.
    const respons = await konteks.request.get(url);
    expect(respons.status()).toBe(200);
    const raw = await respons.text();
    for (const terlarang of [
      'Rp ',
      'Rp\u00a0',
      '12345678',
      '12.345.678',
      '081298765432',
      'Catatan vendor uji rahasia',
    ]) {
      expect(raw, terlarang).not.toContain(terlarang);
    }
    // Tidak ada jalan ke aplikasi Editor dari halaman Pembaca.
    await expect(pembaca.getByRole('link')).toHaveCount(0);
    await expect(pembaca.getByRole('navigation')).toHaveCount(0);

    // Cabut lewat UI dengan konfirmasi.
    await kartu(page, LABEL).getByRole('button', { name: `Cabut ${LABEL}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Cabut Share Link?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cabut' }).click();
    await expect(dialog).toBeHidden();
    await expect(kartu(page, LABEL)).toContainText('Dicabut');
    // Tombol Cabut sudah hilang, jadi fokus pindah ke judul kartu, bukan ke body.
    await expect(kartu(page, LABEL).getByRole('heading', { name: LABEL })).toBeFocused();
    await expect(kartu(page, LABEL).getByRole('textbox')).toHaveCount(0);
    await expect(kartu(page, LABEL).getByRole('button')).toHaveCount(0);

    await pembaca.reload();
    await expect(pembaca.getByText('Link ini sudah tidak aktif.')).toBeVisible();
    await expect(pembaca.getByText('Uji Share Venue')).toHaveCount(0);
    await expect(pembaca.getByText(LABEL)).toHaveCount(0);
  } finally {
    await konteks.close();
  }
});

test('salin link menampilkan "Link disalin"', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const url = await buatLinkDariForm(page, 'Uji Salin');
  await kartu(page, 'Uji Salin').getByRole('button', { name: 'Salin link Uji Salin' }).click();
  await expect(kartu(page, 'Uji Salin').getByRole('status')).toHaveText('Link disalin');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
});

test('dengan keuangan, Pembaca melihat Rupiah', async ({ page, browser }) => {
  await vendorBerharga();
  await page.goto('/share');
  const form = page.getByRole('form', { name: 'Form Share Link' });
  await form.getByLabel('Nama link').fill('Uji Dengan Keuangan');
  await form.getByRole('checkbox', { name: 'Keuangan' }).check();
  await form.getByRole('button', { name: 'Buat link' }).click();
  const item = kartu(page, 'Uji Dengan Keuangan');
  await expect(item).toContainText('Bagian: Acara, Vendor, Tugas, Keuangan');
  const url = await urlLengkap(page, 'Uji Dengan Keuangan');

  const konteks = await browser.newContext();
  try {
    const pembaca = await konteks.newPage();
    await pembaca.goto(url);
    await expect(pembaca.getByRole('heading', { level: 2, name: 'Keuangan' })).toBeVisible();
    const kontrak = pembaca.getByRole('list', { name: 'Kontrak vendor' }).getByRole('listitem').filter({ hasText: 'Uji Share Venue' });
    await expect(kontrak).toContainText('Rp 12.345.678');
    await expect(kontrak).toContainText('Belum lunas');
  } finally {
    await konteks.close();
  }
});

test('form menolak nama link kosong dan tanpa bagian', async ({ page }) => {
  await page.goto('/share');
  const form = page.getByRole('form', { name: 'Form Share Link' });
  await form.getByRole('button', { name: 'Buat link' }).click();
  await expect(form.getByRole('alert')).toHaveText('Nama link wajib diisi.');

  await form.getByLabel('Nama link').fill('Uji Tanpa Bagian');
  for (const nama of ['Acara', 'Vendor', 'Tugas']) await form.getByRole('checkbox', { name: nama }).uncheck();
  await form.getByRole('button', { name: 'Buat link' }).click();
  await expect(form.getByRole('alert')).toHaveText('Pilih minimal satu bagian.');
  // Isian tidak hilang setelah gagal.
  await expect(form.getByLabel('Nama link')).toHaveValue('Uji Tanpa Bagian');
});

test('token yang tidak ada menampilkan link tidak aktif', async ({ browser }) => {
  const konteks = await browser.newContext();
  try {
    const pembaca = await konteks.newPage();
    await pembaca.goto(`/s/${'0'.repeat(64)}`);
    await expect(pembaca).toHaveURL(/\/s\/0+$/);
    await expect(pembaca.getByText('Link ini sudah tidak aktif.')).toBeVisible();
  } finally {
    await konteks.close();
  }
});

test('halaman share dan Pembaca tidak melebar di 375px, tap target 44px', async ({ page, browser }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const url = await buatLinkDariForm(page, 'Uji Nama Link Yang Cukup Panjang Untuk Layar HP Sempit');

  const cek = async (p: Page) => {
    expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    const kecil = await p.evaluate(() =>
      [...document.querySelectorAll('main a, main button, main input:not([type="checkbox"]), main label.pilihan')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < 44).length,
    );
    expect(kecil).toBe(0);
  };
  await cek(page);

  const konteks = await browser.newContext({ viewport: { width: 375, height: 812 } });
  try {
    const pembaca = await konteks.newPage();
    await pembaca.goto(url);
    await expect(pembaca.getByRole('heading', { level: 1, name: 'Rendy & Dinar' })).toBeVisible();
    await cek(pembaca);
  } finally {
    await konteks.close();
  }
});
