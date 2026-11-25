import { defineConfig } from '@playwright/test';
import dasar from './playwright.config';

// Delivery Gate: `npx playwright test -c playwright.gate.config.ts`
export default defineConfig({ ...dasar, testDir: './tests/gate', retries: 0 });
