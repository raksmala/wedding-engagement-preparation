// Delivery Gate: interaksi di checklist bagian 3 yang belum dicakup tests/e2e.
// Setiap test berjalan di 375px dan desktop, dengan data uji baru dari seed().
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { masukSebagaiEditor } from '../e2e/helpers';
import { EMAIL, NOL, bersihkanGate, editor, id, seed } from './data';

const PNG = path.join(__dirname, '..', 'e2e', 'fixtures', 'pricelist.png');
const VIEWPORT = {
  '375px': { width: 375, height: 812 },
  desktop: { width: 1280, height: 800 },
} as const;

const fokusDi = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return (el?.getAttribute('aria-label') || el?.innerText || el?.tagName || '').trim();
  });

test.afterAll(async () => {
  if (process.env.GATE_KEEP !== '1') await bersihkanGate();
});

for (const [viewport, ukuran] of Object.entries(VIEWPORT)) {
  test.describe(viewport, () => {
    test.beforeAll(async () => {
      await seed();
    });

    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(ukuran);
      await masukSebagaiEditor(page, EMAIL);
    });

    test('menu Lainnya: Escape mengembalikan fokus, pindah halaman menutup menu', async ({ page }) => {
      const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
      const ringkas = nav.locator('summary');
      await ringkas.focus();
      await page.keyboard.press('Enter');
      await expect(nav.getByRole('link', { name: 'Komparasi' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(nav.getByRole('link', { name: 'Komparasi' })).toBeHidden();
      await expect(ringkas).toBeFocused();

      await ringkas.click();
      await nav.getByRole('link', { name: 'Share Link' }).click();
      await expect(page).toHaveURL(/\/share$/);
      await expect(nav.getByRole('link', { name: 'Share Link' })).toBeHidden();

      await page.goto(`/vendor/${id.alpha}`);
      await expect(nav.getByRole('link', { name: 'Vendor' })).toHaveAttribute('aria-current', 'page');
      await nav.getByRole('link', { name: 'Kontribusi' }).click();
      await expect(page).toHaveURL(/\/kontribusi$/);
      await expect(nav.getByRole('link', { name: 'Kontribusi' })).toHaveAttribute('aria-current', 'page');
    });

    test('login: pesan galat dan tombol Google berganti label', async ({ browser }) => {
      const tamu = await browser.newPage({ viewport: ukuran });
      await tamu.goto('/login?error=gagal-masuk');
      await expect(tamu.getByText('Gagal masuk. Coba lagi.')).toBeVisible();
      await tamu.goto('/login?error=bukan-editor');
      await expect(tamu.getByText('Akun ini tidak terdaftar sebagai Editor.')).toBeVisible();
      // Supabase Auth dijawab 204 supaya navigasi batal dan tidak benar-benar pergi ke Google.
      await tamu.route('**/auth/v1/authorize**', (r) => r.fulfill({ status: 204 }));
      const tombol = tamu.getByRole('button', { name: /Google/ });
      await tombol.click();
      await expect(tombol).toHaveText('Mengalihkan ke Google...');
      await expect(tombol).toBeDisabled();
      await tamu.close();
    });

    test('dashboard: form tandai dibayar, Batal, tanpa Pihak, dan Selesai memindah fokus', async ({ page }) => {
      await page.goto('/');
      const tombolBayar = page.getByRole('button', { name: 'Tandai dibayar: Termin Uji Gate Venue Alpha' });
      await tombolBayar.click();
      await expect(tombolBayar).toHaveAttribute('aria-expanded', 'true');
      await page.getByRole('button', { name: 'Batal' }).click();
      await expect(tombolBayar).toHaveAttribute('aria-expanded', 'false');
      await expect(tombolBayar).toBeFocused();

      await tombolBayar.click();
      await page.getByRole('button', { name: 'Simpan' }).click();
      await expect(page.getByRole('alert')).toBeVisible();

      const terlambat = page.getByRole('heading', { name: /^Terlambat \(\d+\)$/ });
      const sebelum = await terlambat.innerText();
      await page.getByRole('button', { name: 'Tandai selesai: Uji Gate Tugas Terlambat' }).click();
      await expect(terlambat).not.toHaveText(sebelum);
      await expect(terlambat).toBeFocused();

      await page.getByRole('link', { name: 'Uji Gate Venue Alpha' }).first().click();
      await expect(page).toHaveURL(new RegExp(`/vendor/${id.alpha}$`));
    });

    test('acara: dialog hapus Batal, acara terpakai ditolak, Simpan kembali ke daftar', async ({ page }) => {
      await page.goto(`/acara/${id.Resepsi}`);
      await page.getByRole('button', { name: 'Hapus acara' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Batal' }).click();
      await expect(dialog).toBeHidden();
      await page.getByRole('button', { name: 'Hapus acara' }).click();
      await dialog.getByRole('button', { name: 'Hapus' }).click();
      await expect(dialog.getByRole('alert')).toBeVisible();
      await dialog.getByRole('button', { name: 'Batal' }).click();

      await page.getByRole('button', { name: 'Simpan' }).click();
      await expect(page).toHaveURL(/\/acara$/);
      await page.goto('/acara/baru');
      await page.getByRole('link', { name: 'Kembali ke daftar acara' }).click();
      await expect(page).toHaveURL(/\/acara$/);
      await page.goto(`/acara/${NOL}`);
      await expect(page.getByRole('heading', { name: 'Acara tidak ditemukan' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible();
    });

    test('vendor: link web, WhatsApp, status, dan link kembali', async ({ page }) => {
      await page.goto(`/vendor/${id.alpha}`);
      const web = page.getByRole('link', { name: /contoh-venue-alpha/ });
      await expect(web).toHaveAttribute('target', '_blank');
      await expect(web).toHaveAttribute('rel', /noopener/);
      await expect(page.getByRole('link', { name: 'Chat WhatsApp' })).toHaveAttribute(
        'href',
        /^https:\/\/wa\.me\/6281234567890/,
      );
      await expect(page.getByRole('link', { name: 'Ubah vendor' })).toHaveAttribute('href', `/vendor/${id.alpha}/ubah`);
      await expect(page.getByRole('link', { name: /Bandingkan paket/ })).toHaveAttribute('href', `/komparasi/${id.Venue}`);

      const simpanStatus = page.getByRole('button', { name: 'Simpan status' });
      await expect(simpanStatus).toBeDisabled();
      await page.getByLabel('Ubah status').selectOption('selesai');
      await expect(simpanStatus).toBeEnabled();
      await simpanStatus.click();
      await expect(simpanStatus).toBeDisabled();

      await page.goto(`/vendor/${id.beta}`);
      await expect(page.getByRole('link', { name: 'Chat WhatsApp' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Kembali ke daftar vendor' }).click();
      await expect(page).toHaveURL(/\/vendor$/);
    });

    test('lampiran paket: unggah, buka lewat signed URL, dialog hapus Batal', async ({ page }) => {
      await page.goto(`/vendor/${id.alpha}`);
      const paket = page.getByRole('region', { name: 'Paket' });
      await paket.getByLabel(/Unggah lampiran/).first().setInputFiles(PNG);
      const berkas = paket.getByRole('link', { name: 'pricelist.png' });
      // Unggah ke Supabase Storage bisa lebih dari 5 detik.
      await expect(berkas).toBeVisible({ timeout: 20_000 });
      await expect(berkas).toHaveAttribute('target', '_blank');
      const tab = page.waitForEvent('popup');
      await berkas.click();
      const baru = await tab;
      await baru.waitForLoadState();
      expect(baru.url()).toMatch(/\/storage\/v1\/object\/sign\//);
      await baru.close();
      await paket.getByRole('button', { name: /Hapus.*pricelist\.png/ }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('pricelist.png');
      await dialog.getByRole('button', { name: 'Batal' }).click();
      await expect(dialog).toBeHidden();
      await expect(berkas).toBeVisible();
    });

    test('kontrak: buat kontrak, hubungkan acara, ubah harga kosong, ubah data', async ({ page }) => {
      await page.goto(`/vendor/${id.delta}`);
      const kontrak = page.getByRole('region', { name: 'Kontrak' });
      await kontrak.getByRole('button', { name: 'Buat kontrak' }).click();
      await expect(page.getByRole('form', { name: 'Form buat kontrak' })).toBeVisible();
      await page.getByRole('form', { name: 'Form buat kontrak' }).getByRole('button', { name: 'Batal' }).click();
      await expect(page.getByRole('form', { name: 'Form buat kontrak' })).toHaveCount(0);

      await page.goto(`/vendor/${id.epsilon}`);
      await expect(kontrak.getByRole('link', { name: 'Hubungkan ke acara' })).toHaveAttribute(
        'href',
        `/vendor/${id.epsilon}/ubah`,
      );

      await page.goto(`/vendor/${id.alpha}`);
      await kontrak.getByRole('button', { name: 'Ubah harga per acara' }).click();
      const harga = page.getByRole('form', { name: 'Form harga per acara' });
      for (const isian of await harga.getByRole('textbox').all()) await isian.fill('');
      await harga.getByRole('button', { name: 'Simpan harga' }).click();
      await expect(harga.getByText('Isi harga untuk minimal satu acara.')).toBeVisible();
      await harga.getByRole('button', { name: 'Batal' }).click();
      await expect(harga).toHaveCount(0);

      await kontrak.getByRole('button', { name: 'Ubah data kontrak' }).click();
      const data = page.getByRole('form', { name: 'Form data kontrak' });
      await data.getByLabel(/Catatan/).fill('Uji catatan kontrak');
      await data.getByRole('button', { name: 'Simpan data kontrak' }).click();
      await expect(data).toHaveCount(0);
      await expect(kontrak.getByText('Uji catatan kontrak')).toBeVisible();
    });

    test('pembayaran: bukti transfer, tandai dibayar Batal, ubah per baris', async ({ page }) => {
      await page.goto(`/vendor/${id.alpha}`);
      const bayar = page.getByRole('region', { name: 'Pembayaran' });
      const bukti = bayar.locator('summary', { hasText: 'Bukti transfer' }).first();
      await bukti.click();
      await expect(bayar.getByLabel('Unggah bukti transfer').first()).toBeVisible();
      await bukti.click();

      const tandai = bayar.getByRole('button', { name: /^Tandai dibayar: Termin/ });
      await tandai.click();
      await expect(bayar.getByLabel(/Dibayar oleh/)).toBeVisible();
      await bayar.getByRole('button', { name: 'Batal' }).click();
      await expect(bayar.getByLabel(/Dibayar oleh/)).toHaveCount(0);

      await bayar.getByRole('button', { name: /^Ubah pembayaran Termin/ }).click();
      const form = page.getByRole('form', { name: 'Form pembayaran' });
      await expect(form.getByLabel('Nominal')).toHaveValue(/30/);
      await form.getByRole('button', { name: 'Batal' }).click();
      await expect(form).toHaveCount(0);
    });

    test('log kontak: lihat semua tugas, hapus log tidak menghapus follow-up', async ({ page }) => {
      await page.goto(`/vendor/${id.alpha}`);
      const log = page.getByRole('region', { name: 'Log Kontak' });
      await expect(log.getByRole('link', { name: 'Lihat semua tugas' })).toHaveAttribute('href', '/tugas');
      await log.getByRole('button', { name: /^Hapus log kontak/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Hapus' }).click();
      await expect(log.getByText('Uji tanya ketersediaan tanggal.')).toHaveCount(0);
      await page.goto('/tugas');
      await expect(page.getByText('Uji Gate Follow-up Alpha')).toBeVisible();
    });

    test('tugas: follow-up mengunci Vendor, hapus Batal, Hapus filter', async ({ page }) => {
      const { data } = await editor.from('tugas').select('id').eq('judul', 'Uji Gate Follow-up Alpha').single();
      await editor.from('log_kontak').insert({ vendor_id: id.alpha, tanggal: '2026-11-20', saluran: 'telepon', isi: 'Uji' });
      const { data: log } = await editor.from('log_kontak').select('id').eq('isi', 'Uji').limit(1).single();
      await editor.from('tugas').update({ log_kontak_id: log!.id }).eq('id', data!.id);

      await page.goto('/tugas');
      await page.getByRole('button', { name: 'Ubah tugas Uji Gate Follow-up Alpha' }).click();
      const form = page.getByRole('form', { name: 'Form tugas' });
      await expect(form.getByText('Vendor mengikuti log kontak asal tugas ini.')).toBeVisible();
      await expect(form.locator('select[name=vendor_id]')).toHaveCount(0);
      await form.getByRole('button', { name: 'Batal' }).click();

      await page.getByRole('button', { name: 'Hapus tugas Uji Gate Tugas Minggu Ini' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('button', { name: 'Batal' })).toBeFocused();
      await dialog.getByRole('button', { name: 'Batal' }).click();
      await expect(dialog).toBeHidden();

      await page.goto(`/tugas?vendor=${id.gamma}`);
      await page.getByRole('link', { name: 'Hapus filter' }).click();
      await expect(page).toHaveURL(/\/tugas$/);
    });

    test('kontribusi: ringkasan per Pihak membuka rincian Vendor', async ({ page }) => {
      await page.goto('/kontribusi');
      const ringkas = page.locator('summary', { hasText: 'Rendy' });
      const vendor = page.getByRole('link', { name: 'Uji Gate Venue Alpha' });
      await expect(vendor).toBeHidden();
      await ringkas.click();
      await expect(vendor).toBeVisible();
      await vendor.click();
      await expect(page).toHaveURL(new RegExp(`/vendor/${id.alpha}$`));
    });

    test('pengaturan: fokus ubah nama, hapus item belum dipakai', async ({ page }) => {
      await page.goto('/pengaturan');
      const ubah = page.getByRole('button', { name: 'Ubah nama Rendy' });
      await ubah.click();
      await expect(page.getByRole('form', { name: 'Ubah nama Rendy' }).getByRole('textbox')).toBeFocused();
      await page.getByRole('form', { name: 'Ubah nama Rendy' }).getByRole('button', { name: 'Batal' }).click();
      await expect(ubah).toBeFocused();

      const tambah = page.getByRole('form', { name: 'Tambah pihak' });
      await tambah.getByRole('textbox').fill('Uji Gate Pihak');
      await tambah.getByRole('button').click();
      await page.getByRole('button', { name: 'Hapus Uji Gate Pihak' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Hapus' }).click();
      await expect(page.getByRole('heading', { name: 'Uji Gate Pihak' })).toHaveCount(0);
      expect(await fokusDi(page)).toMatch(/Pihak/);
    });

    test('komponen: Naik dan Turun nonaktif di ujung, ubah, batal ubah, hapus menyebut jumlah paket', async ({ page }) => {
      await page.goto(`/pengaturan/komponen?kategori=${id.Venue}`);
      await expect(page.getByRole('button', { name: 'Naik Uji Kapasitas' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Turun Uji Parkir Luas' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Turun Uji Kapasitas' })).toBeEnabled();
      await page.getByRole('link', { name: 'Ubah Uji Kapasitas' }).click();
      await expect(page).toHaveURL(new RegExp(`ubah=${id.kapasitas}`));
      await expect(page.getByLabel('Nama')).toHaveValue('Uji Kapasitas');
      await page.getByRole('link', { name: 'Batal ubah' }).click();
      await expect(page).toHaveURL(new RegExp(`\\?kategori=${id.Venue}$`));
      await page.getByRole('button', { name: 'Hapus Uji Kapasitas' }).click();
      await expect(page.getByRole('dialog')).toContainText(/2 paket/i);
      await page.getByRole('dialog').getByRole('button', { name: 'Batal' }).click();
      await page.getByRole('link', { name: 'Kembali ke pengaturan' }).click();
      await expect(page).toHaveURL(/\/pengaturan$/);
    });

    test('share: kotak link terpilih saat diketuk, cabut memindah fokus ke judul kartu', async ({ page }) => {
      await page.goto('/share');
      const kotak = page.getByRole('textbox', { name: 'Link', exact: true }).first();
      // Ketukan sungguhan, bukan focus() lewat script, karena mouseup bisa membatalkan pilihan.
      await kotak.click();
      const terpilih = await kotak.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!);
      expect(terpilih).toBe((await kotak.inputValue()).length);

      await page.getByRole('button', { name: 'Salin link Uji Gate Keluarga' }).click();
      await expect(page.getByText(/Link disalin|salin manual/i)).toBeVisible();

      await page.getByRole('button', { name: 'Cabut Uji Gate Keluarga' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Cabut' }).click();
      await expect(page.getByRole('heading', { name: 'Uji Gate Keluarga' })).toBeFocused();
      await expect(page.getByRole('button', { name: 'Cabut Uji Gate Keluarga' })).toHaveCount(0);
    });

    test('komparasi: tabel bisa digeser dengan keyboard, dialog pilih paket fokus di Batal', async ({ page }) => {
      await page.goto(`/komparasi/${id.Venue}`);
      const geser = page.getByRole('region', { name: /Tabel komparasi paket/ });
      await geser.focus();
      await expect(geser).toBeFocused();
      if (viewport === '375px') {
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await expect.poll(() => geser.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      }
      await page.getByRole('button', { name: /Pilih paket ini: Uji Paket Beta Silver/ }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('button', { name: 'Batal' })).toBeFocused();
      await dialog.getByRole('button', { name: 'Batal' }).click();
      await expect(dialog).toBeHidden();
      await page.getByRole('link', { name: 'Kembali ke daftar kategori' }).click();
      await expect(page).toHaveURL(/\/komparasi$/);
    });

    test('pelengkap: ubah vendor, form paket, komparasi kosong, hapus tugas, tambah kategori', async ({ page }) => {
      await page.goto(`/vendor/${id.gamma}/ubah`);
      await page.getByLabel('Catatan').fill('Uji catatan gamma');
      await page.getByRole('button', { name: 'Simpan' }).click();
      await expect(page).toHaveURL(new RegExp(`/vendor/${id.gamma}$`));
      await expect(page.getByText('Uji catatan gamma')).toBeVisible();
      await page.goto(`/vendor/${id.gamma}/ubah`);
      await page.getByRole('link', { name: 'Kembali ke detail vendor' }).click();
      await expect(page).toHaveURL(new RegExp(`/vendor/${id.gamma}$`));

      await page.goto(`/vendor/${id.alpha}/paket/baru`);
      await expect(page.getByRole('link', { name: 'Atur Komponen' })).toHaveAttribute(
        'href',
        `/pengaturan/komponen?kategori=${id.Venue}`,
      );
      await page.getByRole('link', { name: 'Kembali ke detail vendor' }).click();
      await expect(page).toHaveURL(new RegExp(`/vendor/${id.alpha}$`));

      await page.goto(`/komparasi/${id.Venue}?acara=${id.Lamaran}`);
      await page.getByRole('link', { name: 'Lihat semua paket' }).click();
      await expect(page).toHaveURL(new RegExp(`/komparasi/${id.Venue}$`));
      await page.goto(`/komparasi/${id.Katering}`);
      await page.getByRole('link', { name: 'Lihat vendor' }).click();
      await expect(page).toHaveURL(/\/vendor$/);

      await page.goto('/tugas');
      await page.getByRole('button', { name: 'Hapus tugas Uji Gate Tugas Tanpa Tanggal' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Hapus' }).click();
      await expect(page.getByText('Uji Gate Tugas Tanpa Tanggal')).toHaveCount(0);

      await page.goto('/pengaturan');
      const tambah = page.getByRole('form', { name: 'Tambah kategori' });
      await tambah.getByRole('textbox').fill('Uji Gate Kategori');
      await tambah.getByRole('button').click();
      await expect(page.getByRole('heading', { name: 'Uji Gate Kategori' })).toBeVisible();
      await page.getByRole('button', { name: 'Hapus Uji Gate Kategori' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Hapus' }).click();
      await expect(page.getByRole('heading', { name: 'Uji Gate Kategori' })).toHaveCount(0);
    });

    test('404: judul tab dan link kembali', async ({ page }) => {
      await page.goto('/halaman-yang-tidak-ada');
      await expect(page).toHaveTitle('Halaman tidak ditemukan | Rendy & Dinar');
      await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Kembali ke dashboard' }).click();
      await expect(page).toHaveURL(/\/$/);
    });
  });
}
