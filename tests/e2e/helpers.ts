import type { Page } from '@playwright/test';
import { admin } from '../db/helpers';

export async function masukSebagaiEditor(page: Page, email: string): Promise<void> {
  const { error } = await admin.from('editor_diizinkan').upsert({ email });
  if (error) throw error;
  await page.goto(`/api/dev-login?email=${email}`);
  await page.waitForURL(/\/$/);
}
