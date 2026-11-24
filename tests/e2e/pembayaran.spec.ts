import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest } from '../db/helpers';
import { masukSebagaiEditor } from './helpers';

const EMAIL = 'pembayaran@test.local';
const PNG = path.join(__dirname, 'fixtures', 'pricelist.png');
let editor: SupabaseClient;

async function bersihkan() {
  const { data: vendor } = await admin.from('vendor').select('id').like('nama', 'Uji %');
  const ids = (vendor ?? []).map((v) => v.id);
  if (ids.length === 0) return;
  const { data: kontrak } = await admin.from('kontrak').select('id, lampiran').in('vendor_id', ids);
  const kids = (kontrak ?? []).map((k) => k.id);
  const berkas = (kontrak ?? []).flatMap((k) => k.lampiran);
  if (kids.length > 0) {
    const { data: bayar } = await admin.from('pembayaran').select('id, bukti').in('kontrak_id', kids);
    berkas.push(...(bayar ?? []).flatMap((b) => b.bukti));
    const { error } = await admin.from('pembayaran').delete().in('kontrak_id', kids);
    if (error) throw error;
  }
  if (berkas.length > 0) await admin.storage.from('lampiran').remove(berkas);
  const { error } = await admin.from('vendor').delete().like('nama', 'Uji %');
  if (error) throw error;
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

async function idByNama(tabel: string, nama: string): Promise<string> {
  const { data, error } = await editor.from(tabel).select('id').eq('nama', nama).single();
  if (error) throw error;
  return data.id;
}

// Vendor Booked lewat pilih_paket, total sama dengan harga paket.
async function vendorBooked(nama = 'Uji Venue Bayar', harga = 8500000): Promise<string> {
  const { data, error } = await editor
    .from('vendor')
    .insert({ nama, kategori_vendor_id: await idByNama('kategori_vendor', 'Venue') })
    .select('id')
    .single();
  if (error) throw error;
  const { error: e2 } = await editor
    .from('vendor_acara')
    .insert({ vendor_id: data.id, acara_id: await idByNama('acara', 'Resepsi') });
  if (e2) throw e2;
  const { data: paket, error: e3 } = await editor
    .from('paket')
    .insert({ vendor_id: data.id, nama: 'Uji Paket Bayar', harga })
    .select('id')
    .single();
  if (e3) throw e3;
  const { error: e4 } = await editor.rpc('pilih_paket', { p_paket_id: paket.id });
  if (e4) throw e4;
  return `/vendor/${data.id}`;
}

const kontrak = (page: Page) => page.getByRole('region', { name: 'Kontrak' });
const pembayaran = (page: Page) => page.getByRole('region', { name: 'Pembayaran' });
const baris = (page: Page, teks: string | RegExp) => pembayaran(page).getByRole('listitem').filter({ hasText: teks });

async function tambahPembayaran(
  page: Page,
  o: { jenis: string; nominal: string; status: 'Terjadwal' | 'Dibayar'; jatuhTempo?: string; pihak?: string },
) {
  await pembayaran(page).getByRole('button', { name: 'Tambah pembayaran' }).click();
  const form = page.getByRole('form', { name: 'Form pembayaran' });
  await form.getByLabel('Jenis').selectOption({ label: o.jenis });
  await form.getByLabel('Nominal').fill(o.nominal);
  await form.getByLabel('Status').selectOption({ label: o.status });
  if (o.jatuhTempo) await form.getByLabel('Jatuh tempo').fill(o.jatuhTempo);
  if (o.pihak) await form.getByLabel('Dibayar oleh').selectOption({ label: o.pihak });
  await form.getByRole('button', { name: 'Simpan pembayaran' }).click();
  await expect(form).toHaveCount(0);
}

test('kontrak dari paket menampilkan alokasi, total, dan belum lunas', async ({ page }) => {
  const url = await vendorBooked();
  await page.goto(url);
  const k = kontrak(page);
  await expect(k.getByText('Resepsi')).toBeVisible();
  await expect(k.getByText('Belum lunas')).toBeVisible();
  const ringkas = k.locator('dl.ringkasan');
  await expect(ringkas.locator('div', { hasText: 'Total' }).first()).toContainText('Rp 8.500.000');
  await expect(ringkas.locator('div', { hasText: 'Terbayar' })).toContainText('Rp 0');
  await expect(ringkas.locator('div', { hasText: 'Sisa Tagihan' })).toContainText('Rp 8.500.000');
  await expect(page.getByText(/Kelebihan bayar/)).toHaveCount(0);
  await expect(pembayaran(page).getByText('Belum ada pembayaran.')).toBeVisible();
});

test('DP dibayar, pelunasan dijadwalkan lalu ditandai dibayar, kelebihan bayar, dan kontribusi', async ({ page }) => {
  const url = await vendorBooked();
  await page.goto(url);

  await tambahPembayaran(page, { jenis: 'DP', nominal: '2.550.000', status: 'Dibayar', pihak: 'Rendy' });
  const ringkas = kontrak(page).locator('dl.ringkasan');
  await expect(ringkas.locator('div', { hasText: 'Sisa Tagihan' })).toContainText('Rp 5.950.000');
  await expect(kontrak(page).getByText('Belum lunas')).toBeVisible();
  await expect(baris(page, 'DP')).toContainText('Dibayar');
  await expect(baris(page, 'DP')).toContainText('oleh Rendy');

  await tambahPembayaran(page, {
    jenis: 'Pelunasan',
    nominal: '5.950.000',
    status: 'Terjadwal',
    jatuhTempo: '2026-12-15',
  });
  const pelunasan = baris(page, 'Pelunasan');
  await expect(pelunasan).toContainText('Terjadwal');
  await expect(pelunasan).toContainText('Jatuh tempo 15 Desember 2026');
  await expect(kontrak(page).getByText('Belum lunas')).toBeVisible();

  await pelunasan.getByRole('button', { name: /Tandai dibayar/ }).click();
  const form = page.getByRole('form', { name: 'Form tandai dibayar' });
  await expect(form.getByLabel('Tanggal bayar')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  await expect(form.getByLabel('Dibayar oleh')).toHaveValue('');
  await form.getByLabel('Dibayar oleh').selectOption({ label: 'Keluarga Wanita' });
  await form.getByRole('button', { name: 'Simpan' }).click();
  await expect(form).toHaveCount(0);
  await expect(kontrak(page).getByText('Lunas', { exact: true })).toBeVisible();
  await expect(ringkas.locator('div', { hasText: 'Sisa Tagihan' })).toContainText('Rp 0');
  await expect(pelunasan).toContainText('oleh Keluarga Wanita');

  await tambahPembayaran(page, { jenis: 'Termin', nominal: '500.000', status: 'Dibayar', pihak: 'Keluarga Wanita' });
  await expect(kontrak(page).getByText('Lunas', { exact: true })).toBeVisible();
  await expect(kontrak(page).getByText('Kelebihan bayar Rp 500.000')).toBeVisible();
  await expect(ringkas.locator('div', { hasText: 'Sisa Tagihan' })).not.toContainText('-');

  await page.goto('/kontribusi');
  await expect(page.getByTestId('total-kontribusi')).toContainText('Rp 9.000.000');
  const rendy = page.locator('details', { hasText: 'Rendy' });
  const wanita = page.locator('details', { hasText: 'Keluarga Wanita' });
  await expect(rendy.locator('summary')).toContainText('Rp 2.550.000');
  await expect(wanita.locator('summary')).toContainText('Rp 6.450.000');
  await expect(wanita.getByText('Uji Venue Bayar')).toBeHidden();
  await wanita.locator('summary').click();
  await expect(wanita.getByText('Uji Venue Bayar')).toBeVisible();
  await expect(wanita).toContainText('Rp 6.450.000');
});

test('tandai dibayar tanpa memilih pihak menampilkan pesan', async ({ page }) => {
  const url = await vendorBooked();
  await page.goto(url);
  await tambahPembayaran(page, { jenis: 'DP', nominal: '1.000.000', status: 'Terjadwal', jatuhTempo: '2026-12-01' });
  await baris(page, 'DP').getByRole('button', { name: /Tandai dibayar/ }).click();
  const form = page.getByRole('form', { name: 'Form tandai dibayar' });
  await form.getByRole('button', { name: 'Simpan' }).click();
  await expect(form.getByText('Pilih siapa yang membayar')).toBeVisible();
  await expect(baris(page, 'DP')).toContainText('Terjadwal');
});

test('form pembayaran menahan isian saat gagal, dan dibayar tanpa pihak ditolak', async ({ page }) => {
  const url = await vendorBooked();
  await page.goto(url);
  await pembayaran(page).getByRole('button', { name: 'Tambah pembayaran' }).click();
  const form = page.getByRole('form', { name: 'Form pembayaran' });
  await form.getByLabel('Nominal').fill('1,5jt');
  await form.getByRole('button', { name: 'Simpan pembayaran' }).click();
  await expect(form.getByText('Tulis nominal dengan angka, contoh 1.500.000')).toBeVisible();
  await expect(form.getByLabel('Nominal')).toHaveValue('1,5jt');

  await form.getByLabel('Nominal').fill('1.500.000');
  await form.getByLabel('Status').selectOption({ label: 'Dibayar' });
  await form.getByRole('button', { name: 'Simpan pembayaran' }).click();
  await expect(form.getByText('Pilih siapa yang membayar')).toBeVisible();
  await expect(form.getByLabel('Nominal')).toHaveValue('1.500.000');
});

test('ubah pembayaran dan hapus lewat konfirmasi dengan fokus di Batal', async ({ page }) => {
  const url = await vendorBooked();
  await page.goto(url);
  await tambahPembayaran(page, { jenis: 'Termin', nominal: '1.000.000', status: 'Terjadwal', jatuhTempo: '2026-12-01' });

  await baris(page, 'Termin').getByRole('button', { name: /^Ubah/ }).click();
  const form = page.getByRole('form', { name: 'Form pembayaran' });
  await expect(form.getByLabel('Nominal')).toHaveValue('1.000.000');
  await form.getByLabel('Nominal').fill('1.250.000');
  await form.getByRole('button', { name: 'Simpan pembayaran' }).click();
  await expect(baris(page, 'Termin')).toContainText('Rp 1.250.000');

  await baris(page, 'Termin').getByRole('button', { name: /^Hapus/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Batal' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Batal' }).click();
  await expect(baris(page, 'Termin')).toHaveCount(1);

  await baris(page, 'Termin').getByRole('button', { name: /^Hapus/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hapus' }).click();
  await expect(baris(page, 'Termin')).toHaveCount(0);
  await expect(pembayaran(page).getByText('Belum ada pembayaran.')).toBeVisible();
});

test('ubah harga per acara mengubah total', async ({ page }) => {
  const url = await vendorBooked();
  await page.goto(url);
  await kontrak(page).getByRole('button', { name: 'Ubah harga per acara' }).click();
  const form = page.getByRole('form', { name: 'Form harga per acara' });
  await expect(form.getByLabel('Harga Resepsi')).toHaveValue('8.500.000');
  await form.getByLabel('Harga Resepsi').fill('9.000.000');
  await form.getByRole('button', { name: 'Simpan harga' }).click();
  await expect(form).toHaveCount(0);
  await expect(kontrak(page).locator('dl.ringkasan div', { hasText: 'Total' }).first()).toContainText('Rp 9.000.000');
  await expect(kontrak(page).getByText(/Terakhir diubah oleh/)).toBeVisible();
});

test('kontrak manual untuk vendor tanpa paket, minimal satu alokasi', async ({ page }) => {
  const { data, error } = await editor
    .from('vendor')
    .insert({ nama: 'Uji Manual Kontrak', kategori_vendor_id: await idByNama('kategori_vendor', 'Venue'), status: 'survei_nego' })
    .select('id')
    .single();
  if (error) throw error;
  const { error: e2 } = await editor.from('vendor_acara').insert([
    { vendor_id: data.id, acara_id: await idByNama('acara', 'Lamaran') },
    { vendor_id: data.id, acara_id: await idByNama('acara', 'Resepsi') },
  ]);
  if (e2) throw e2;

  await page.goto(`/vendor/${data.id}`);
  await kontrak(page).getByRole('button', { name: 'Buat kontrak' }).click();
  const form = page.getByRole('form', { name: 'Form buat kontrak' });
  await form.getByRole('button', { name: 'Simpan kontrak' }).click();
  await expect(form.getByText('Isi harga untuk minimal satu acara.')).toBeVisible();

  await form.getByLabel('Tanggal kesepakatan').fill('2026-12-01');
  await form.getByLabel('Harga Lamaran').fill('2.000.000');
  await form.getByLabel('Harga Resepsi').fill('6.000.000');
  await form.getByRole('button', { name: 'Simpan kontrak' }).click();
  await expect(form).toHaveCount(0);
  const k = kontrak(page);
  await expect(k.locator('dl.ringkasan div', { hasText: 'Total' }).first()).toContainText('Rp 8.000.000');
  await expect(k).toContainText('1 Desember 2026');
  await expect(k.getByText('Belum lunas')).toBeVisible();
});

test('lampiran kontrak dan bukti pembayaran bisa diunggah dan dihapus', async ({ page }) => {
  const url = await vendorBooked();
  await page.goto(url);
  await kontrak(page).getByLabel('Unggah lampiran kontrak').setInputFiles(PNG);
  await expect(kontrak(page).getByRole('link', { name: 'pricelist.png' })).toBeVisible();

  await tambahPembayaran(page, { jenis: 'DP', nominal: '1.000.000', status: 'Dibayar', pihak: 'Rendy' });
  const dp = baris(page, 'DP');
  await dp.locator('summary', { hasText: 'Bukti transfer' }).click();
  await dp.getByLabel('Unggah bukti transfer').setInputFiles(PNG);
  const bukti = dp.getByRole('link', { name: 'pricelist.png' });
  await expect(bukti).toBeVisible();
  const href = await bukti.getAttribute('href');
  expect(href).toContain('/storage/v1/object/sign/lampiran/pembayaran/');
  expect((await page.request.get(href!)).status()).toBe(200);

  await dp.getByRole('button', { name: 'Hapus bukti transfer pricelist.png' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Batal' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Hapus' }).click();
  await expect(dp.getByRole('link', { name: 'pricelist.png' })).toHaveCount(0);
});

test('kontribusi kosong menampilkan petunjuk dan link ke vendor', async ({ page }) => {
  await page.goto('/kontribusi');
  await expect(page.getByText('Belum ada pembayaran yang dibayar.')).toBeVisible();
  await page.getByRole('link', { name: 'Lihat vendor' }).click();
  await expect(page).toHaveURL(/\/vendor$/);
});

test('layout 375px tanpa scroll horizontal dan tap target 44px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const url = await vendorBooked();
  await page.goto(url);
  await tambahPembayaran(page, { jenis: 'DP', nominal: '2.550.000', status: 'Dibayar', pihak: 'Rendy' });
  await tambahPembayaran(page, { jenis: 'Pelunasan', nominal: '5.950.000', status: 'Terjadwal', jatuhTempo: '2026-12-15' });

  const cek = async () => {
    const lebih = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(lebih).toBe(false);
    const kecil = await page.evaluate(() =>
      [...document.querySelectorAll('main a, main button, main select, main input:not([type=hidden]), main summary')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < 44).length,
    );
    expect(kecil).toBe(0);
  };
  await cek();
  await pembayaran(page).getByRole('button', { name: 'Tambah pembayaran' }).click();
  await cek();
  await kontrak(page).getByRole('button', { name: 'Ubah harga per acara' }).click();
  await cek();
  await page.goto('/kontribusi');
  await page.locator('details summary').first().click();
  await cek();
});
