import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, hapusDataUji } from '../db/helpers';
import { masukSebagaiEditor } from './helpers';

const EMAIL = 'agenda@test.local';
let editor: SupabaseClient;
let picId: string;

// Tanggal Asia/Jakarta digeser n hari, berformat YYYY-MM-DD. Sama dengan hariIniJakarta() di src/lib/tanggal.ts.
const formatJakarta = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
function tanggalJakarta(geserHari = 0): string {
  const d = new Date(`${formatJakarta.format(new Date())}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + geserHari);
  return d.toISOString().slice(0, 10);
}

test.beforeAll(async () => {
  editor = await buatEditorTest(EMAIL);
  const { data, error } = await editor.rpc('editor_saat_ini');
  if (error) throw error;
  picId = data as string;
});

test.beforeEach(async ({ page }) => {
  await hapusDataUji();
  await masukSebagaiEditor(page, EMAIL);
});

test.afterAll(async () => {
  try {
    await hapusDataUji();
  } finally {
    await bersihkanTest();
  }
});

async function idByNama(tabel: string, nama: string): Promise<string> {
  const { data, error } = await editor.from(tabel).select('id').eq('nama', nama).single();
  if (error) throw error;
  return data.id;
}

// Jumlah item agenda per kelompok yang bukan data test ini, supaya hitungan tetap benar di DB dev bersama.
async function dasarKelompok(): Promise<{ terlambat: number; hariIni: number; tujuhHari: number }> {
  const { data, error } = await admin.from('agenda').select('jatuh_tempo');
  if (error) throw error;
  const hariIni = tanggalJakarta();
  const batas = tanggalJakarta(7);
  const tanggal = (data ?? []).map((r) => r.jatuh_tempo as string);
  return {
    terlambat: tanggal.filter((t) => t < hariIni).length,
    hariIni: tanggal.filter((t) => t === hariIni).length,
    tujuhHari: tanggal.filter((t) => t > hariIni && t <= batas).length,
  };
}

async function buatTugas(judul: string, geserHari: number): Promise<void> {
  const { error } = await editor.from('tugas').insert({ judul, pic_id: picId, jatuh_tempo: tanggalJakarta(geserHari) });
  if (error) throw error;
}

// Vendor Booked lewat pilih_paket dengan total Rp 8.500.000, lalu Pelunasan Rp 5.000.000 Terjadwal hari ini.
async function pelunasanHariIni(): Promise<string> {
  const { data: v, error } = await editor
    .from('vendor')
    .insert({ nama: 'Uji Venue Agenda', kategori_vendor_id: await idByNama('kategori_vendor', 'Venue') })
    .select('id')
    .single();
  if (error) throw error;
  const { error: e2 } = await editor
    .from('vendor_acara')
    .insert({ vendor_id: v.id, acara_id: await idByNama('acara', 'Resepsi') });
  if (e2) throw e2;
  const { data: paket, error: e3 } = await editor
    .from('paket')
    .insert({ vendor_id: v.id, nama: 'Uji Paket Agenda', harga: 8500000 })
    .select('id')
    .single();
  if (e3) throw e3;
  const { error: e4 } = await editor.rpc('pilih_paket', { p_paket_id: paket.id });
  if (e4) throw e4;
  const { data: k, error: e5 } = await editor.from('kontrak').select('id').eq('vendor_id', v.id).single();
  if (e5) throw e5;
  const { error: e6 } = await editor.from('pembayaran').insert({
    kontrak_id: k.id,
    jenis: 'pelunasan',
    nominal: 5000000,
    status: 'terjadwal',
    jatuh_tempo: tanggalJakarta(),
  });
  if (e6) throw e6;
  return v.id;
}

const kelompok = (page: Page, nama: RegExp) => page.getByRole('region', { name: nama });
const item = (page: Page, judul: string) => page.getByRole('listitem').filter({ hasText: judul });

test('dashboard mengelompokkan terlambat, hari ini, dan 7 hari ke depan', async ({ page }) => {
  const dasar = await dasarKelompok();
  await buatTugas('Uji Lewat Tempo', -2);
  await pelunasanHariIni();
  await buatTugas('Uji Lima Hari', 5);
  await buatTugas('Uji Sepuluh Hari', 10);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  const judul = page.getByRole('heading', { level: 2 });
  await expect(judul.nth(0)).toHaveText(`Terlambat (${dasar.terlambat + 1})`);
  await expect(judul.nth(1)).toHaveText(`Hari ini (${dasar.hariIni + 1})`);
  await expect(judul.nth(2)).toHaveText(`7 hari ke depan (${dasar.tujuhHari + 1})`);

  await expect(kelompok(page, /^Terlambat/).getByText('Uji Lewat Tempo')).toBeVisible();
  await expect(item(page, 'Uji Lewat Tempo')).toContainText('Terlambat');
  const pelunasan = kelompok(page, /^Hari ini/).getByRole('listitem').filter({ hasText: 'Pelunasan Uji Venue Agenda' });
  await expect(pelunasan).toContainText('Rp 5.000.000');
  await expect(pelunasan.getByRole('link', { name: 'Uji Venue Agenda' })).toBeVisible();
  await expect(kelompok(page, /^7 hari ke depan/).getByText('Uji Lima Hari')).toBeVisible();
  await expect(page.getByText('Uji Sepuluh Hari')).toHaveCount(0);
});

test('selesai di tugas terlambat menghilangkan item dan mengurangi hitungan terlambat', async ({ page }) => {
  const dasar = await dasarKelompok();
  await buatTugas('Uji Lewat Tempo', -1);

  await page.goto('/');
  const terlambat = kelompok(page, /^Terlambat/);
  const judul = terlambat.getByRole('heading');
  await expect(judul).toHaveText(`Terlambat (${dasar.terlambat + 1})`);
  await item(page, 'Uji Lewat Tempo').getByRole('button', { name: /Tandai selesai/ }).click();
  await expect(page.getByText('Uji Lewat Tempo')).toHaveCount(0);
  await expect(judul).toHaveText(`Terlambat (${dasar.terlambat})`);
  // Fokus keyboard pindah ke judul kelompok, tidak jatuh ke body.
  await expect(judul).toBeFocused();
  // Pesan kosong hanya bisa dicek kalau DB dev tidak punya item terlambat lain.
  if (dasar.terlambat === 0) {
    await expect(terlambat.getByText('Tidak ada yang terlambat.')).toBeVisible();
  }

  const { data } = await admin.from('tugas').select('status').eq('judul', 'Uji Lewat Tempo').single();
  expect(data?.status).toBe('selesai');
});

test('tandai dibayar dari dashboard menghilangkan item dan mengurangi sisa tagihan', async ({ page }) => {
  const vendorId = await pelunasanHariIni();
  const sisa = page.getByRole('region', { name: 'Kontrak' }).locator('dl.ringkasan div', { hasText: 'Sisa Tagihan' });
  await page.goto(`/vendor/${vendorId}`);
  await expect(sisa).toContainText('Rp 8.500.000');

  await page.goto('/');
  const pelunasan = item(page, 'Pelunasan Uji Venue Agenda');
  await pelunasan.getByRole('button', { name: /Tandai dibayar/ }).click();
  const form = pelunasan.getByRole('form', { name: 'Tandai dibayar: Pelunasan Uji Venue Agenda' });
  await expect(form.getByLabel('Tanggal bayar')).toHaveValue(tanggalJakarta());
  await form.getByLabel('Dibayar oleh').selectOption({ label: 'Rendy' });
  await form.getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByText('Pelunasan Uji Venue Agenda')).toHaveCount(0);
  await expect(kelompok(page, /^Hari ini/).getByRole('heading')).toBeFocused();

  await page.goto(`/vendor/${vendorId}`);
  await expect(sisa).toContainText('Rp 3.500.000');
});

test('tanpa data sama sekali, dashboard mengajak menambah vendor', async ({ page }) => {
  const [vendor, tugas] = await Promise.all([
    admin.from('vendor').select('id', { count: 'exact', head: true }),
    admin.from('tugas').select('id', { count: 'exact', head: true }),
  ]);
  if (vendor.error) throw vendor.error;
  if (tugas.error) throw tugas.error;
  // DB dev dipakai bersama. Tampilan kosong hanya muncul kalau benar-benar tidak ada vendor dan tugas.
  test.skip(
    (vendor.count ?? 0) > 0 || (tugas.count ?? 0) > 0,
    `Tampilan kosong tidak bisa dites: setelah data Uji dihapus, DB dev masih punya ${vendor.count ?? 0} vendor dan ${tugas.count ?? 0} tugas`,
  );

  await page.goto('/');
  await expect(page.getByText('Belum ada jadwal yang perlu dikerjakan.')).toBeVisible();
  const tambah = page.getByRole('link', { name: 'Tambah vendor' });
  await expect(tambah).toHaveAttribute('href', '/vendor/baru');
  await tambah.click();
  await expect(page).toHaveURL(/\/vendor\/baru$/);
});

test('navigasi bawah menandai halaman aktif dan menu lainnya hanya berisi halaman yang ada', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Tugas' })).not.toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'Tugas' }).click();
  await expect(page).toHaveURL(/\/tugas$/);
  await expect(nav.getByRole('link', { name: 'Tugas' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page');

  const acara = nav.getByRole('link', { name: 'Acara' });
  const ringkasLainnya = nav.locator('summary');
  await expect(ringkasLainnya).not.toContainText('(halaman ini)');
  await expect(acara).toBeHidden();
  await nav.getByText('Lainnya').click();
  await expect(acara).toBeVisible();
  // Klik di luar menu menutupnya.
  await page.getByRole('heading', { level: 1 }).click();
  await expect(acara).toBeHidden();
  await nav.getByText('Lainnya').click();
  await expect(acara).toBeVisible();
  const lainnya = nav.locator('.menu-lainnya a');
  await expect(lainnya).toHaveText(['Acara', 'Komparasi', 'Pengaturan', 'Share Link']);
  for (const a of await lainnya.all()) {
    const href = await a.getAttribute('href');
    expect((await page.request.get(href!, { maxRedirects: 0 })).status()).toBe(200);
  }

  await acara.click();
  await expect(page).toHaveURL(/\/acara$/);
  await expect(nav.getByRole('link', { name: 'Acara' })).toBeHidden();
  await expect(ringkasLainnya).toContainText('(halaman ini)');
  await nav.getByText('Lainnya').click();
  await expect(nav.getByRole('link', { name: 'Acara' })).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
  await expect(nav.getByRole('link', { name: 'Acara' })).toBeHidden();
});

test('dashboard 375px tanpa scroll horizontal, tap target 44px, dan isi tidak tertutup navigasi', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await buatTugas('Uji Lewat Tempo Dengan Judul Yang Cukup Panjang Untuk Layar Sempit', -1);
  await pelunasanHariIni();
  await buatTugas('Uji Lima Hari', 5);
  await page.goto('/');

  const cek = async () => {
    const lebih = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(lebih).toBe(false);
    const kecil = await page.evaluate(() =>
      [...document.querySelectorAll('main a, main button, main select, main input, nav a, nav summary')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < 44).length,
    );
    expect(kecil).toBe(0);
  };
  await cek();
  await item(page, 'Pelunasan Uji Venue Agenda').getByRole('button', { name: /Tandai dibayar/ }).click();
  await cek();
  await page.getByRole('navigation', { name: 'Navigasi utama' }).getByText('Lainnya').click();
  await cek();

  // Item terakhir bisa digulir sampai di atas navigasi bawah.
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const bawahIsi = await page.locator('main').evaluate((el) => {
    const terakhir = el.lastElementChild?.getBoundingClientRect();
    return terakhir ? terakhir.bottom : 0;
  });
  const atasNav = await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(bawahIsi).toBeLessThanOrEqual(atasNav);
});
