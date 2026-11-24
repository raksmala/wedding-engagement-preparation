import { test, expect } from '@playwright/test';

test('shell menampilkan wordmark dan tidak melebar di 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/login');
  await expect(page.getByText('Rendy & Dinar')).toBeVisible();
  const lebar = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(lebar).toBeLessThanOrEqual(375);
});
