import { test, expect } from '@playwright/test';
import { admin, bersihkanTest } from '../db/helpers';

const EMAIL = 'rendy@test.local';

test.beforeAll(async () => {
  const { error } = await admin.from('editor_diizinkan').upsert({ email: EMAIL });
  if (error) throw error;
});

test.afterAll(async () => {
  await bersihkanTest();
});

test('tanpa sesi, / mengalihkan ke /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Masuk dengan Google' })).toBeVisible();
});

test('setelah dev-login, / menampilkan Dashboard', async ({ page }) => {
  await page.goto(`/api/dev-login?email=${EMAIL}`);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
});

test('dev-login menolak email di luar @test.local', async ({ request }) => {
  const res = await request.get('/api/dev-login?email=orang@example.com', { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});

test('email di luar allowlist ditolak dengan pesan', async ({ page }) => {
  await page.goto('/api/dev-login?email=luar@test.local');
  await expect(page).toHaveURL(/\/login\?error=bukan-editor/);
  await expect(page.getByText('Akun ini tidak terdaftar sebagai Editor.')).toBeVisible();
});
