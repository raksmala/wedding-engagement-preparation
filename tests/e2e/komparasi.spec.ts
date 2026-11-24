import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { bersihkanTest, buatEditorTest } from '../db/helpers';
import { masukSebagaiEditor } from './helpers';

const EMAIL = 'komparasi@test.local';
let editor: SupabaseClient;
let kategoriId: string;
let lamaranId: string;
let akadId: string;

async function bersihkan() {
  const { error } = await editor.from('vendor').delete().like('nama', 'Uji %');
  if (error) throw error;
  const { error: e2 } = await editor.from('komponen').delete().like('nama', 'Uji %');
  if (e2) throw e2;
}

async function buatVendor(nama: string, acara: string[], status = 'kandidat') {
  const { data, error } = await editor
    .from('vendor')
    .insert({ nama, kategori_vendor_id: kategoriId, status: status as 'kandidat' })
    .select('id')
    .single();
  if (error) throw error;
  const { error: e2 } = await editor
    .from('vendor_acara')
    .insert(acara.map((acara_id) => ({ vendor_id: data.id, acara_id })));
  if (e2) throw e2;
  return data.id as string;
}

async function buatPaket(vendorId: string, nama: string, harga: number, nilai: Record<string, string>) {
  const { data, error } = await editor
    .from('paket')
    .insert({ vendor_id: vendorId, nama, harga, syarat_dp: nama === 'Uji Paket C' ? null : 'DP 30%' })
    .select('id')
    .single();
  if (error) throw error;
  for (const [komponen_id, isi] of Object.entries(nilai)) {
    const { error: e2 } = await editor
      .from('nilai_komponen')
      .insert({ paket_id: data.id, komponen_id, nilai: isi });
    if (e2) throw e2;
  }
}

// A dan B melayani Lamaran, C melayani Lamaran dan Akad, D batal. Paket C tidak mengisi Album.
async function siapkan() {
  const { data: durasi, error: e1 } = await editor
    .from('komponen')
    .insert({ kategori_vendor_id: kategoriId, nama: 'Uji Durasi', tipe: 'angka', satuan: 'jam', urutan: 9001 })
    .select('id')
    .single();
  if (e1) throw e1;
  const { data: album, error: e2 } = await editor
    .from('komponen')
    .insert({ kategori_vendor_id: kategoriId, nama: 'Uji Album', tipe: 'ya_tidak', urutan: 9002 })
    .select('id')
    .single();
  if (e2) throw e2;
  const a = await buatVendor('Uji Foto A', [lamaranId]);
  const b = await buatVendor('Uji Foto B', [lamaranId]);
  const c = await buatVendor('Uji Foto C', [lamaranId, akadId]);
  const d = await buatVendor('Uji Foto D', [lamaranId], 'batal');
  await buatPaket(a, 'Uji Paket A', 5_000_000, { [durasi.id]: '6', [album.id]: 'ya' });
  await buatPaket(b, 'Uji Paket B', 6_000_000, { [durasi.id]: '8', [album.id]: 'tidak' });
  await buatPaket(c, 'Uji Paket C', 9_000_000, { [durasi.id]: '10' });
  await buatPaket(d, 'Uji Paket D', 4_000_000, { [durasi.id]: '4' });
  return { a, b, c, d };
}

test.beforeAll(async () => {
  editor = await buatEditorTest(EMAIL);
  const { data: k, error } = await editor.from('kategori_vendor').select('id').eq('nama', 'Foto & Video').single();
  if (error) throw error;
  kategoriId = k.id;
  const { data: a, error: ea } = await editor.from('acara').select('id, nama').in('nama', ['Lamaran', 'Akad']);
  if (ea) throw ea;
  lamaranId = a.find((r) => r.nama === 'Lamaran')!.id;
  akadId = a.find((r) => r.nama === 'Akad')!.id;
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

function kolom(page: Page, nama: string) {
  return page.getByRole('columnheader', { name: new RegExp(nama) });
}

test('375px: baris berurutan, sel kosong, geser horizontal hanya di tabel, label tetap terlihat', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await siapkan();
  await page.goto(`/komparasi/${kategoriId}`);

  const label = await page.locator('tbody th[scope=row]').allInnerTexts();
  const dikenal = label.map((t) => t.trim()).filter((t) => t !== '' && t !== 'Aksi');
  const urut = dikenal.filter((t) => ['Harga', 'Uji Durasi', 'Uji Album', 'Syarat DP', 'Lain-lain'].includes(t));
  expect(urut).toEqual(['Harga', 'Uji Durasi', 'Uji Album', 'Syarat DP', 'Lain-lain']);

  await expect(page.getByText('Belum diisi').first()).toBeVisible();
  // Album kosong di Paket C, Syarat DP kosong di Paket C, Lain-lain kosong di ketiganya.
  await expect(page.getByText('Belum diisi')).toHaveCount(5);

  const ukuran = await page.evaluate(() => {
    const t = document.querySelector('[data-testid=tabel-geser]') as HTMLElement;
    return {
      halaman: document.documentElement.scrollWidth,
      scroll: t.scrollWidth,
      klien: t.clientWidth,
    };
  });
  expect(ukuran.halaman).toBeLessThanOrEqual(375);
  expect(ukuran.scroll).toBeGreaterThan(ukuran.klien);

  await page.evaluate(() => {
    (document.querySelector('[data-testid=tabel-geser]') as HTMLElement).scrollLeft = 400;
  });
  const hargaLabel = page.locator('tbody th[scope=row]', { hasText: 'Harga' });
  const kotak = await hargaLabel.boundingBox();
  const wadah = await page.locator('[data-testid=tabel-geser]').boundingBox();
  expect(kotak!.x).toBeGreaterThanOrEqual(wadah!.x - 1);
  expect(kotak!.x).toBeLessThan(wadah!.x + 20);
  await expect(hargaLabel).toBeInViewport();

  const kecil = await page.evaluate(
    () =>
      [...document.querySelectorAll('main a, main button, main select')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < 44).length,
  );
  expect(kecil).toBe(0);
});

test('vendor satu acara: pilih paket menjadikannya Booked dan paket lain Tidak dipilih', async ({ page }) => {
  await siapkan();
  await page.goto(`/komparasi/${kategoriId}`);
  await page.getByRole('button', { name: 'Pilih paket ini: Uji Paket A dari Uji Foto A' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Batal' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Pilih paket', exact: true }).click();
  await expect(dialog).toBeHidden();

  await expect(kolom(page, 'Uji Paket A')).toContainText('Dipilih');
  await expect(kolom(page, 'Uji Paket A')).toContainText('Booked');
  await expect(kolom(page, 'Uji Paket B')).toContainText('Tidak dipilih');
  await expect(kolom(page, 'Uji Paket C')).toContainText('Tidak dipilih');
  // Paket yang sudah dipilih tidak punya tombol pilih lagi.
  await expect(page.getByRole('button', { name: /Uji Paket A/ })).toHaveCount(0);

  await page.goto('/vendor');
  await page.getByRole('link', { name: 'Lihat Uji Foto A' }).click();
  await expect(page.getByTestId('status-vendor')).toHaveText('Booked');
  await page.getByRole('link', { name: 'Bandingkan paket di kategori ini' }).click();
  await expect(page).toHaveURL(new RegExp(`/komparasi/${kategoriId}$`));
});

test('vendor dua acara: dialog minta nominal per acara, simpan nonaktif sampai lengkap, Escape menutup', async ({
  page,
}) => {
  await siapkan();
  await page.goto(`/komparasi/${kategoriId}`);
  const tombol = page.getByRole('button', { name: 'Pilih paket ini: Uji Paket C dari Uji Foto C' });
  await tombol.click();
  const dialog = page.getByRole('dialog');
  const simpan = dialog.getByRole('button', { name: 'Pilih paket', exact: true });
  await expect(dialog.getByLabel('Nominal Lamaran')).toHaveValue('');
  await expect(dialog.getByLabel('Nominal Akad')).toHaveValue('');
  await expect(simpan).toBeDisabled();
  await dialog.getByLabel('Nominal Lamaran').fill('3.000.000');
  await expect(simpan).toBeDisabled();
  await dialog.getByLabel('Nominal Akad').fill('abc');
  await expect(simpan).toBeDisabled();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(kolom(page, 'Uji Paket C')).not.toContainText('Dipilih');

  await tombol.click();
  await dialog.getByLabel('Nominal Lamaran').fill('3.000.000');
  await dialog.getByLabel('Nominal Akad').fill('6.000.000');
  await expect(simpan).toBeEnabled();
  await simpan.click();
  await expect(dialog).toBeHidden();
  await expect(kolom(page, 'Uji Paket C')).toContainText('Dipilih');
  await expect(kolom(page, 'Uji Paket A')).toContainText('Tidak dipilih');
});

test('filter acara dan toggle vendor batal', async ({ page }) => {
  await siapkan();
  await page.goto(`/komparasi/${kategoriId}`);
  await expect(kolom(page, 'Uji Paket A')).toBeVisible();
  await expect(kolom(page, 'Uji Paket D')).toHaveCount(0);

  await page.getByLabel('Tampilkan vendor batal').check();
  await page.getByRole('button', { name: 'Terapkan' }).click();
  await expect(page).toHaveURL(/batal=1/);
  await expect(kolom(page, 'Uji Paket D')).toBeVisible();
  await expect(kolom(page, 'Uji Paket D')).toContainText('Batal');

  await page.goto(`/komparasi/${kategoriId}`);
  await page.locator('select[name=acara]').selectOption({ label: 'Akad' });
  await page.getByRole('button', { name: 'Terapkan' }).click();
  await expect(page).toHaveURL(/acara=/);
  await expect(kolom(page, 'Uji Paket C')).toBeVisible();
  await expect(kolom(page, 'Uji Paket A')).toHaveCount(0);
  await expect(kolom(page, 'Uji Paket B')).toHaveCount(0);

  // UUID tidak valid diabaikan.
  await page.goto(`/komparasi/${kategoriId}?acara=bukan-uuid`);
  await expect(kolom(page, 'Uji Paket A')).toBeVisible();
});

test('daftar kategori menampilkan jumlah paket dan menuju tabel', async ({ page }) => {
  await siapkan();
  await page.goto('/komparasi');
  const kartu = page.getByRole('listitem').filter({ hasText: 'Foto & Video' });
  await expect(kartu).toContainText(/\d+ paket/);
  await kartu.getByRole('link', { name: 'Bandingkan' }).click();
  await expect(page).toHaveURL(new RegExp(`/komparasi/${kategoriId}$`));
  await page.goto('/komparasi/bukan-uuid');
  await expect(page.getByText('Kategori tidak ditemukan.')).toBeVisible();
});
