import { test, expect, type Locator, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, hapusDataUji } from '../db/helpers';
import { masukSebagaiEditor } from './helpers';

const EMAIL = 'pengaturan@test.local';
// Service role tidak bisa menulis pihak dan kategori (trigger audit butuh sesi Editor), jadi pakai klien Editor.
let editor: SupabaseClient;
// Baris default yang diubah test ini. DB dev dipakai bersama, jadi keduanya selalu dipulihkan di afterAll.
let lainnyaId: string;
let hiburanId: string;

async function idByNama(tabel: string, nama: string): Promise<string> {
  const { data, error } = await editor.from(tabel).select('id').eq('nama', nama).single();
  if (error) throw error;
  return data.id;
}

async function pulihkanDefault() {
  const { error: e1 } = await editor.from('pihak').update({ nama: 'Lainnya' }).eq('id', lainnyaId);
  if (e1) throw e1;
  const { error: e2 } = await editor.from('kategori_vendor').update({ arsip: false }).eq('id', hiburanId);
  if (e2) throw e2;
}

async function bersihkan() {
  // Pembayaran milik Vendor "Uji " dihapus lebih dulu, baru Pihak uji yang dipakainya.
  await hapusDataUji();
  const { error: e1 } = await admin.from('pihak').delete().like('nama', 'Uji %');
  if (e1) throw e1;
  // komponen.kategori_vendor_id memakai on delete restrict, jadi Komponen di Kategori uji dihapus lebih dulu.
  const { data: kategori, error: e2 } = await admin.from('kategori_vendor').select('id').like('nama', 'Uji %');
  if (e2) throw e2;
  const ids = (kategori ?? []).map((k) => k.id);
  if (ids.length > 0) {
    const { error: e3 } = await admin.from('komponen').delete().in('kategori_vendor_id', ids);
    if (e3) throw e3;
  }
  const { error: e4 } = await admin.from('kategori_vendor').delete().like('nama', 'Uji %');
  if (e4) throw e4;
}

test.beforeAll(async () => {
  editor = await buatEditorTest(EMAIL);
  // Run sebelumnya yang terhenti bisa meninggalkan nama "Om Budi".
  const { data, error } = await editor.from('pihak').select('id, nama').in('nama', ['Lainnya', 'Om Budi']);
  if (error) throw error;
  const lainnya = data.find((p) => p.nama === 'Lainnya') ?? data.find((p) => p.nama === 'Om Budi');
  if (!lainnya) throw new Error('Pihak default "Lainnya" tidak ditemukan');
  lainnyaId = lainnya.id;
  hiburanId = await idByNama('kategori_vendor', 'Hiburan');
  await pulihkanDefault();
});

test.beforeEach(async ({ page }) => {
  await bersihkan();
  await masukSebagaiEditor(page, EMAIL);
});

test.afterAll(async () => {
  try {
    await pulihkanDefault();
  } finally {
    try {
      await bersihkan();
    } finally {
      await bersihkanTest();
    }
  }
});

// Vendor Booked lewat pilih_paket, supaya halaman detailnya punya Kontrak dan form Pembayaran.
async function vendorBooked(nama: string): Promise<{ id: string; kontrakId: string }> {
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
    .insert({ vendor_id: data.id, nama: 'Uji Paket Pengaturan', harga: 5000000 })
    .select('id')
    .single();
  if (e3) throw e3;
  const { error: e4 } = await editor.rpc('pilih_paket', { p_paket_id: paket.id });
  if (e4) throw e4;
  const { data: k, error: e5 } = await editor.from('kontrak').select('id').eq('vendor_id', data.id).single();
  if (e5) throw e5;
  return { id: data.id, kontrakId: k.id };
}

const bagian = (page: Page, nama: 'Pihak' | 'Kategori Vendor') =>
  page.getByRole('region', { name: nama, exact: true });
const baris = (seksi: Locator, nama: string) =>
  seksi.getByRole('listitem').filter({ has: seksi.page().getByRole('heading', { name: nama, exact: true }) });

test('ganti nama Pihak "Lainnya" menjadi "Om Budi" tampil di form Pembayaran', async ({ page }) => {
  const vendor = await vendorBooked('Uji Venue Pengaturan');

  await page.goto('/pengaturan');
  await expect(page.getByRole('heading', { level: 1, name: 'Pengaturan' })).toBeVisible();
  const pihak = bagian(page, 'Pihak');
  await pihak.getByRole('button', { name: 'Ubah nama Lainnya' }).click();
  const form = pihak.getByRole('form', { name: 'Ubah nama Lainnya' });
  await expect(form.getByLabel('Nama baru')).toBeFocused();
  await form.getByLabel('Nama baru').fill('Om Budi');
  await form.getByRole('button', { name: 'Simpan nama' }).click();
  await expect(baris(pihak, 'Om Budi')).toBeVisible();
  await expect(baris(pihak, 'Lainnya')).toHaveCount(0);
  // Kategori Vendor "Lainnya" tidak ikut berubah.
  await expect(baris(bagian(page, 'Kategori Vendor'), 'Lainnya')).toBeVisible();

  await page.goto(`/vendor/${vendor.id}`);
  const pembayaran = page.getByRole('region', { name: 'Pembayaran' });
  await pembayaran.getByRole('button', { name: 'Tambah pembayaran' }).click();
  const formBayar = page.getByRole('form', { name: 'Form pembayaran' });
  await formBayar.getByLabel('Status').selectOption({ label: 'Dibayar' });
  const dibayarOleh = formBayar.getByLabel('Dibayar oleh');
  await expect(dibayarOleh.locator('option', { hasText: 'Om Budi' })).toHaveCount(1);
  await expect(dibayarOleh.locator('option', { hasText: 'Lainnya' })).toHaveCount(0);
});

test('arsipkan Kategori "Hiburan" hilang dari form Vendor baru, tetap tampil di vendor lama, lalu aktifkan lagi', async ({
  page,
}) => {
  const { data: lama, error } = await editor
    .from('vendor')
    .insert({ nama: 'Uji Hiburan Lama', kategori_vendor_id: hiburanId })
    .select('id')
    .single();
  if (error) throw error;

  await page.goto('/pengaturan');
  const kategori = bagian(page, 'Kategori Vendor');
  const hiburan = baris(kategori, 'Hiburan');
  await expect(hiburan).toContainText(/Dipakai: \d+ vendor/);
  // Kategori yang sudah dipakai hanya bisa diarsipkan.
  await expect(hiburan.getByRole('button', { name: /^Hapus/ })).toHaveCount(0);
  await hiburan.getByRole('button', { name: 'Arsipkan Hiburan' }).click();
  await expect(hiburan).toContainText('Diarsipkan');
  await expect(hiburan.getByRole('button', { name: 'Aktifkan lagi Hiburan' })).toBeFocused();

  await page.goto('/vendor/baru');
  const pilihan = page.getByLabel('Kategori');
  await expect(pilihan.locator('option', { hasText: 'Hiburan' })).toHaveCount(0);
  await expect(pilihan.locator('option', { hasText: 'Venue' })).toHaveCount(1);

  // Vendor lama tetap memakai kategorinya, dan form ubahnya tetap menampilkan kategori itu.
  await page.goto(`/vendor/${lama.id}/ubah`);
  await expect(page.getByLabel('Kategori').locator('option:checked')).toHaveText('Hiburan');

  await page.goto('/pengaturan');
  await baris(bagian(page, 'Kategori Vendor'), 'Hiburan').getByRole('button', { name: 'Aktifkan lagi Hiburan' }).click();
  await expect(baris(bagian(page, 'Kategori Vendor'), 'Hiburan')).not.toContainText('Diarsipkan');
  await page.goto('/vendor/baru');
  await expect(page.getByLabel('Kategori').locator('option', { hasText: 'Hiburan' })).toHaveCount(1);
});

test('tambah Pihak, nama kosong dan ganda ditolak, yang dipakai tidak bisa dihapus, yang belum dipakai bisa', async ({
  page,
}) => {
  const vendor = await vendorBooked('Uji Venue Pihak Terpakai');
  const { data: terpakai, error } = await editor
    .from('pihak')
    .insert({ nama: 'Uji Pihak Terpakai', urutan: 99 })
    .select('id')
    .single();
  if (error) throw error;
  const { error: e2 } = await editor.from('pembayaran').insert({
    kontrak_id: vendor.kontrakId,
    jenis: 'dp',
    nominal: 500000,
    status: 'dibayar',
    tanggal_bayar: '2026-06-01',
    pihak_id: terpakai.id,
  });
  if (e2) throw e2;

  await page.goto('/pengaturan');
  const pihak = bagian(page, 'Pihak');
  const dipakai = baris(pihak, 'Uji Pihak Terpakai');
  await expect(dipakai).toContainText('Dipakai: 1 pembayaran');
  await expect(dipakai.getByRole('button', { name: /^Hapus/ })).toHaveCount(0);
  await expect(dipakai.getByRole('button', { name: 'Arsipkan Uji Pihak Terpakai' })).toBeVisible();

  const form = pihak.getByRole('form', { name: 'Tambah pihak' });
  const nama = form.getByLabel('Nama pihak baru');
  await nama.fill('   ');
  await form.getByRole('button', { name: 'Tambah pihak' }).click();
  await expect(form.getByRole('alert')).toHaveText('Nama pihak wajib diisi.');

  await nama.fill('Uji Pihak Baru');
  await form.getByRole('button', { name: 'Tambah pihak' }).click();
  const baru = baris(pihak, 'Uji Pihak Baru');
  await expect(baru).toContainText('Belum dipakai');
  await expect(nama).toHaveValue('');

  await nama.fill('uji pihak baru');
  await form.getByRole('button', { name: 'Tambah pihak' }).click();
  await expect(form.getByRole('alert')).toHaveText('Pihak dengan nama itu sudah ada.');
  await expect(nama).toHaveValue('uji pihak baru');

  // Ganti nama ke nama yang sudah dipakai juga ditolak.
  await baru.getByRole('button', { name: 'Ubah nama Uji Pihak Baru' }).click();
  const ubah = pihak.getByRole('form', { name: 'Ubah nama Uji Pihak Baru' });
  await ubah.getByLabel('Nama baru').fill('Uji Pihak Terpakai');
  await ubah.getByRole('button', { name: 'Simpan nama' }).click();
  await expect(ubah.getByRole('alert')).toHaveText('Pihak dengan nama itu sudah ada.');
  await ubah.getByRole('button', { name: 'Batal' }).click();
  await expect(baru.getByRole('button', { name: 'Ubah nama Uji Pihak Baru' })).toBeFocused();

  await baru.getByRole('button', { name: 'Hapus Uji Pihak Baru' }).click();
  const dialog = page.getByRole('dialog', { name: 'Hapus Uji Pihak Baru?' });
  await expect(dialog.getByRole('button', { name: 'Batal' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Hapus' }).click();
  await expect(baris(pihak, 'Uji Pihak Baru')).toHaveCount(0);
  // Tombol Hapus ikut hilang, jadi fokus pindah ke judul section.
  await expect(page.getByRole('heading', { level: 2, name: 'Pihak', exact: true })).toBeFocused();
  const { data: sisa } = await admin.from('pihak').select('id').eq('nama', 'Uji Pihak Baru');
  expect(sisa).toEqual([]);
});

test('tautan Komponen pembanding membuka halaman Komponen, dan Pengaturan ada di menu Lainnya', async ({ page }) => {
  await page.goto('/pengaturan');
  await page.getByRole('link', { name: 'Atur komponen pembanding' }).click();
  await expect(page).toHaveURL(/\/pengaturan\/komponen$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Komponen pembanding' })).toBeVisible();
  await page.getByRole('link', { name: 'Kembali ke pengaturan' }).click();
  await expect(page).toHaveURL(/\/pengaturan$/);

  const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
  await nav.getByText('Lainnya').click();
  await expect(nav.getByRole('link', { name: 'Pengaturan' })).toHaveAttribute('aria-current', 'page');
});

test('pengaturan 375px tanpa scroll horizontal dan tap target 44px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/pengaturan');

  const cek = async () => {
    const lebih = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(lebih).toBe(false);
    const kecil = await page.evaluate(() =>
      [...document.querySelectorAll('main a, main button, main select, main input')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < 44).length,
    );
    expect(kecil).toBe(0);
  };
  await cek();
  await bagian(page, 'Kategori Vendor').getByRole('button', { name: 'Ubah nama Hiburan' }).click();
  await cek();
});
