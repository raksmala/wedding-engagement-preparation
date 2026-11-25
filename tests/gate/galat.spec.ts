// Delivery Gate: "Coba lagi" di tampilan error memulihkan halaman setelah galat sementara.
// Galat dipaksa dengan mencabut grant sebentar di project dev, lalu grant dikembalikan sebelum "Coba lagi".
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { loadEnv } from 'vite';
import { masukSebagaiEditor } from '../e2e/helpers';
import { EMAIL, bersihkanGate, id, seed } from './data';

function sql(perintah: string) {
  const ref = fs.readFileSync('supabase/.temp/project-ref', 'utf8').trim();
  if (ref !== loadEnv('test', process.cwd(), '').SUPABASE_DEV_PROJECT_REF) {
    throw new Error('CLI tidak ter-link ke project dev');
  }
  const berkas = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gate-')), 'q.sql');
  fs.writeFileSync(berkas, perintah);
  execFileSync('npx', ['supabase', 'db', 'query', '--linked', '--yes', '-f', berkas], { shell: true, stdio: 'ignore' });
}

const PULIH = [
  'grant select on acara to authenticated;',
  'grant execute on function baca_share_link(text) to anon;',
].join('\n');

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await seed();
});

test.afterAll(async () => {
  sql(PULIH);
  if (process.env.GATE_KEEP !== '1') await bersihkanGate();
});

test('halaman Editor: Coba lagi memuat ulang data setelah galat sementara', async ({ page }) => {
  await masukSebagaiEditor(page, EMAIL);
  sql('revoke select on acara from authenticated;');
  try {
    await page.goto('/acara');
    await expect(page.getByText('Acara belum bisa dimuat.')).toBeVisible();
  } finally {
    sql('grant select on acara to authenticated;');
  }
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByRole('heading', { name: 'Resepsi' })).toBeVisible();
  await expect(page.getByText('Acara belum bisa dimuat.')).toHaveCount(0);
});

test('halaman Pembaca: Coba lagi memuat ulang data setelah galat sementara', async ({ page }) => {
  sql('revoke execute on function baca_share_link(text) from anon;');
  try {
    await page.goto(`/s/${id.tokenAktif}`);
    await expect(page.getByText('Halaman ini belum bisa dimuat.')).toBeVisible();
  } finally {
    sql('grant execute on function baca_share_link(text) to anon;');
  }
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByText('Halaman ini belum bisa dimuat.')).toHaveCount(0);
  await expect(page.getByText('Resepsi').first()).toBeVisible();
});
