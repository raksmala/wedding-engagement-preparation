// Delivery Gate: sapu semua halaman di 375px dan desktop.
// Per halaman dicek: tanpa error console, tanpa scroll horizontal, tap target 44px (375px),
// semua link internal membalas 200, link eksternal aman, dan fokus keyboard selalu terlihat.
// Hasil ditulis ke test-results/gate.json. GATE_KEEP=1 membiarkan data uji untuk cek manual.
import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { EMAIL, NOL, bersihkanGate, id, seed } from './data';
import { masukSebagaiEditor } from '../e2e/helpers';

const VIEWPORT = {
  '375px': { width: 375, height: 812 },
  desktop: { width: 1280, height: 800 },
} as const;
function rute(): { path: string; publik?: boolean }[] {
  return [
    { path: '/' },
    { path: '/acara' },
    { path: '/acara/baru' },
    { path: `/acara/${id.Resepsi}` },
    { path: `/acara/${NOL}` },
    { path: '/vendor' },
    { path: `/vendor?kategori=${id.Venue}&status=survei_nego&acara=${id.Resepsi}` },
    { path: `/vendor?kategori=${id.Katering}&status=batal` },
    { path: '/vendor/baru' },
    { path: `/vendor/${id.alpha}` },
    { path: `/vendor/${id.beta}` },
    { path: `/vendor/${id.delta}` },
    { path: `/vendor/${id.epsilon}` },
    { path: `/vendor/${NOL}` },
    { path: `/vendor/${id.alpha}/ubah` },
    { path: `/vendor/${id.alpha}/paket/baru` },
    { path: `/vendor/${id.alpha}/paket/${id.paketAlpha}/ubah` },
    { path: `/vendor/${id.alpha}/paket/${NOL}/ubah` },
    { path: '/komparasi' },
    { path: `/komparasi/${id.Venue}` },
    { path: `/komparasi/${id.Venue}?acara=${id.Akad}&batal=1` },
    { path: `/komparasi/${NOL}` },
    { path: '/tugas' },
    { path: `/tugas?pic=${id.editor}&acara=${id.Lamaran}&status=belum` },
    { path: '/tugas?status=semua' },
    { path: '/kontribusi' },
    { path: '/pengaturan' },
    { path: `/pengaturan/komponen?kategori=${id.Venue}` },
    { path: '/share' },
    { path: `/s/${id.tokenAktif}`, publik: true },
    { path: `/s/${id.tokenCabut}`, publik: true },
    { path: '/halaman-yang-tidak-ada' },
    { path: '/login', publik: true },
    { path: '/login?error=bukan-editor', publik: true },
    { path: '/login?error=gagal-masuk', publik: true },
  ];
}

type Temuan = { path: string; viewport: string; jenis: string; detail: string };
const temuan: Temuan[] = [];
const dicek: { path: string; viewport: string; judul: string; tautan: number; fokus: number }[] = [];

async function periksa(page: Page, path: string, viewport: keyof typeof VIEWPORT) {
  const galat: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') galat.push(m.text());
  });
  page.on('pageerror', (e) => galat.push(e.message));
  await page.setViewportSize(VIEWPORT[viewport]);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  const catat = (jenis: string, detail: string) => temuan.push({ path, viewport, jenis, detail });

  const lebar = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, w: window.innerWidth }));
  if (lebar.s > lebar.w) catat('scroll-horizontal', `scrollWidth ${lebar.s} > ${lebar.w}`);

  if (viewport === '375px') {
    const kecil = await page.evaluate(() =>
      [...document.querySelectorAll('a, button, select, input:not([type=hidden]), textarea, summary')]
        // Checkbox di dalam label: yang diketuk labelnya, jadi label itu yang diukur.
        .map((el) => ((el as HTMLInputElement).type === 'checkbox' && el.closest('label')) || el)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.height > 0 && s.visibility !== 'hidden' && (r.height < 44 || (r.width < 44 && el.tagName !== 'INPUT'));
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          const label = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('name') || '').trim();
          return `${el.tagName.toLowerCase()}${el.getAttribute('type') ? `[${el.getAttribute('type')}]` : ''} "${label.slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`;
        }),
    );
    for (const k of kecil) catat('tap-target', k);
  }

  const tautan = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')].map((a) => ({
      href: (a as HTMLAnchorElement).href,
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel') ?? '',
      teks: (a as HTMLElement).innerText.trim().slice(0, 40),
    })),
  );
  const asal = new URL(page.url()).origin;
  for (const t of tautan) {
    const u = new URL(t.href);
    if (u.origin === asal) {
      const r = await page.request.get(t.href, { maxRedirects: 0 });
      if (r.status() !== 200) catat('link-rusak', `"${t.teks}" ${u.pathname}${u.search} -> ${r.status()}`);
    } else if (t.target === '_blank' && !/noopener|noreferrer/.test(t.rel)) {
      catat('link-eksternal', `"${t.teks}" ${t.href} tanpa rel noopener`);
    }
  }

  // Tab melewati semua elemen fokus, setiap elemen harus punya outline terlihat.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  let fokus = 0;
  const sudah = new Set<string>();
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      // Overlay dev Next.js, tidak ada di produksi.
      if (el.tagName === 'NEXTJS-PORTAL') return { kunci: 'portal', label: '', terlihat: true };
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        kunci: `${el.tagName}|${el.innerText?.slice(0, 30)}|${Math.round(r.top + window.scrollY)}|${Math.round(r.left)}`,
        label: `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.innerText || el.getAttribute('name') || '').trim().slice(0, 40)}"`,
        terlihat: (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || s.boxShadow !== 'none',
      };
    });
    if (!info || sudah.has(info.kunci)) break;
    sudah.add(info.kunci);
    fokus++;
    if (!info.terlihat) catat('fokus-tak-terlihat', info.label);
  }

  for (const g of galat) {
    // 404 dari halaman "tidak ditemukan" memang disengaja.
    if (/404/.test(g) && /tidak-ada|00000000/.test(path)) continue;
    catat('console-error', g.slice(0, 200));
  }
  await page.screenshot({ path: `test-results/gate/${viewport}${path.replace(/[/?&=]/g, '_').slice(0, 80)}.png`, fullPage: true });
  dicek.push({ path, viewport, judul: await page.title(), tautan: tautan.length, fokus });
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(15 * 60_000);

test.beforeAll(async () => {
  await seed();
});

test.afterAll(async () => {
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/gate.json', JSON.stringify({ dicek, temuan }, null, 2));
  if (process.env.GATE_KEEP !== '1') await bersihkanGate();
});

for (const viewport of Object.keys(VIEWPORT) as (keyof typeof VIEWPORT)[]) {
  test(`sapu semua halaman di ${viewport}`, async ({ browser }) => {
    const masuk = await browser.newContext();
    const halaman = await masuk.newPage();
    await masukSebagaiEditor(halaman, EMAIL);
    const tamu = await browser.newContext();
    for (const r of rute()) {
      const page = r.publik ? await tamu.newPage() : await masuk.newPage();
      await periksa(page, r.path, viewport);
      await page.close();
    }
    await masuk.close();
    await tamu.close();
  });
}

test('tidak ada temuan di semua viewport', () => {
  expect(temuan, JSON.stringify(temuan, null, 2)).toEqual([]);
});
