# Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendy dan Dinar bisa mencatat Acara, Vendor, Paket, Komparasi, Kontrak, Pembayaran, Kontribusi, Tugas, Log Kontak, dashboard, dan Share Link dari HP, sebelum Lamaran Desember 2026.

**Architecture:** Next.js App Router dengan Server Components untuk membaca data dan Server Actions untuk menulis. Semua aturan data (akses Editor, audit, pilih Paket, nilai turunan) ada di Postgres Supabase lewat RLS, trigger, function, dan view, sehingga UI tidak bisa melewatinya. Logika murni yang dipakai UI (format Rupiah, kelompok Jatuh Tempo, link WhatsApp) ada di `src/lib` dan dites dengan Vitest.

**Tech Stack:** Next.js (App Router, TypeScript strict), `@supabase/supabase-js` v2, `@supabase/ssr`, Supabase CLI, Vitest, Playwright, Vercel.

**Lingkungan development:** tidak ada Docker, jadi tidak ada Supabase lokal. Semua test database dan e2e berjalan terhadap project Supabase cloud khusus development (`rendy-dinar-dev`). Project ini hanya berisi data test dan boleh di-reset kapan saja. Data asli nanti ada di project produksi terpisah yang dibuat di Task 14.

| Perintah lokal (dokumen lama) | Pengganti di plan ini |
|---|---|
| `npx supabase start` | tidak ada |
| `npx supabase db reset` | `npx supabase db reset --linked` (project dev) |
| `npx supabase gen types typescript --local` | `npx supabase gen types typescript --linked` |

**Spec:** [docs/PRD.md](../PRD.md), [docs/data-model.md](../data-model.md), [DESIGN.md](../../DESIGN.md), [CONTEXT.md](../../CONTEXT.md). Baca keempatnya sebelum Task 1.

## Global Constraints

- Semua teks UI berbahasa Indonesia dan memakai istilah dari `CONTEXT.md`, termasuk menghindari kata di daftar `_Avoid_`.
- Tidak ada em dash (`—`) di teks UI, komentar, atau commit (antislop R-02).
- Nominal Rupiah tampil dengan format `Rp 1.500.000` dan `font-variant-numeric: tabular-nums`.
- Nominal disimpan sebagai `bigint` Rupiah penuh. Di TypeScript bertipe `number`.
- "Hari ini" selalu dihitung dalam zona `Asia/Jakarta`, bukan zona server.
- Hanya mode terang. Warna hanya dari token di `DESIGN.md`: `--bg #f5efef`, `--primary #80172c`, `--surface #ecb6b6`, `--accent #60692d`, ditambah warna netral yang dicatat ke `DESIGN.md` beserta hasil cek kontrasnya.
- Font: Cormorant Garamond untuk judul dan wordmark, Source Sans 3 untuk isi. Keduanya lewat `next/font/google`.
- Layout dirancang dari lebar 375px. Tidak boleh ada scroll horizontal di level halaman. Tap target minimal 44px.
- Setiap halaman yang menampilkan data punya `loading.tsx`, `error.tsx`, dan tampilan kosong dengan aksi yang jelas.
- Setiap tombol dan link punya aksi nyata. Navigasi hanya ke halaman yang sudah ada (antislop R-24, R-26).
- Fokus keyboard selalu terlihat. Dilarang `outline: none` tanpa pengganti.
- Email Editor asli tidak boleh masuk repo. Email diisi manual ke tabel `editor_diizinkan` di Supabase.
- `.env.local` berisi key project dev, ditulis oleh Rendy sendiri, dan ada di `.gitignore`. Key tidak pernah ditulis ke file lain, log, atau output test.
- Test database membuat data dengan awalan email `@test.local` dan menghapus datanya sendiri di `afterAll`, karena project dev dipakai bersama oleh semua test.
- Semua tabel memakai RLS. Akses hanya untuk `is_editor()`, kecuali lewat `baca_share_link()`.
- Semua tabel memakai kolom audit dari `data-model.md`, diisi trigger `isi_audit()`, bukan oleh aplikasi.
- Halaman detail Vendor, Kontrak, Pembayaran, dan Tugas menampilkan "Terakhir diubah oleh {nama Editor}, {tanggal jam WIB}".
- Migration boleh diubah langsung selama belum ada deploy pertama. Setelah Task 14, perubahan skema wajib lewat migration baru.
- Commit kecil per step "Commit", format Conventional Commits.

## Review Focus

1. **Batas hari di zona WIB.** Pembayaran dengan Jatuh Tempo 25 November dibuka pukul 00:30 WIB tanggal 25 (masih 24 November di UTC). Item itu harus masuk "Hari ini", bukan "7 hari ke depan". Dites di Task 2.
2. **Kelebihan bayar.** Pembayaran Dibayar melebihi total Kontrak harus berstatus Lunas dan tampil "Kelebihan bayar Rp X", bukan sisa negatif. Dites di Task 7 dan Task 9.
3. **Input nominal dari HP.** Orang mengetik `1.500.000`, `Rp 1.500.000`, atau `1500000`, dan ketiganya harus terbaca sama. Input `1,5jt` atau kosong harus ditolak dengan pesan, bukan disimpan sebagai 0. Dites di Task 2.
4. **Kebocoran nominal lewat Share Link.** Link tanpa bagian `keuangan` tidak boleh memuat harga, nominal, atau path bukti di response mentahnya. Link yang dicabut harus tidak mengembalikan data sama sekali. Dites di Task 12.
5. **Komparasi di HP dengan data tidak lengkap.** Tiga Paket atau lebih dengan Komponen yang sebagian kosong harus tampil sebagai sel "Belum diisi" di dalam container yang bisa digeser. Halamannya sendiri tidak boleh ikut melebar. Dites di Task 8.

---

## File Structure

```
supabase/
  config.toml
  migrations/
    0001_dasar.sql          editor_diizinkan, editor, pihak, acara, audit, is_editor(), pastikan_editor()
    0002_vendor.sql         kategori_vendor, komponen, vendor, vendor_acara, paket, nilai_komponen, log_kontak
    0003_keuangan.sql       kontrak, alokasi_acara, pembayaran, view ringkasan & kontribusi, pilih_paket()
    0004_tugas.sql          tugas, view agenda
    0005_share_link.sql     share_link, baca_share_link()
    0006_storage.sql        bucket lampiran + policy
  seed.sql                  data lokal untuk test saja
src/
  app/
    layout.tsx              font, token, shell
    globals.css             token warna, motif garis ganda, fokus
    login/page.tsx
    auth/callback/route.ts
    api/dev-login/route.ts  hanya aktif untuk Supabase lokal
    (app)/
      layout.tsx            cek sesi, navigasi bawah
      page.tsx              dashboard
      acara/...
      vendor/...
      komparasi/...
      tugas/...
      kontribusi/...
      pengaturan/...
      share/...
    s/[token]/page.tsx      tampilan Pembaca
  components/               komponen UI bersama (Rupiah, StatusLabel, Kosong, JudulHalaman)
  lib/
    supabase/server.ts      createClient() untuk Server Component & Action
    supabase/browser.ts     createClient() untuk upload dari browser
    supabase/middleware.ts  refresh sesi
    database.types.ts       hasil `supabase gen types`
    rupiah.ts
    tanggal.ts
    whatsapp.ts
  proxy.ts                  refresh sesi tiap request (Next.js 16, dulu middleware.ts di root)
tests/
  unit/                     Vitest, logika murni
  db/                       Vitest, terhadap Supabase lokal
  e2e/                      Playwright, terhadap `next dev` + Supabase lokal
```

Halaman per fitur berisi `page.tsx`, `actions.ts` (Server Actions), `loading.tsx`, dan `error.tsx` di foldernya sendiri.

---

### Task 1: Setup project dan shell visual

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/components/JudulHalaman.tsx`, `public/manifest.webmanifest`
- Create: `supabase/config.toml` (via `supabase init`)
- Test: `tests/e2e/shell.spec.ts`

**Interfaces:**
- Produces: `<JudulHalaman judul: string />` yang merender `<h1>` Cormorant Garamond dengan motif garis ganda `--primary` di bawahnya. Class CSS `.rupiah` untuk angka tabular.

- [ ] **Step 1:** `git init`, buat app Next.js TypeScript App Router di root repo tanpa Tailwind, lalu `npx supabase init`. `.env.example` berisi nama variabel tanpa nilai: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DEV_PROJECT_REF`, `DEV_LOGIN`. `.gitignore` mencakup `.env*.local` dan `supabase/.temp`.
- [ ] **Step 2: Tulis test e2e yang gagal**

```ts
test('shell menampilkan wordmark dan tidak melebar di 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/login');
  await expect(page.getByText('Rendy & Dinar')).toBeVisible();
  const lebar = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(lebar).toBeLessThanOrEqual(375);
});
```

- [ ] **Step 3:** Jalankan `npx playwright test tests/e2e/shell.spec.ts`. Expected: FAIL, halaman `/login` belum ada.
- [ ] **Step 4:** Isi `globals.css` dengan token dari `DESIGN.md`, `body { background: var(--bg) }`, style fokus `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }`, dan class `.rupiah`. Muat dua font di `layout.tsx`. Buat `JudulHalaman` dan `login/page.tsx` sementara yang menampilkan wordmark. Tambahkan `manifest.webmanifest` dengan `name: "Rendy & Dinar"`, `theme_color: "#80172c"`, `background_color: "#f5efef"`, `display: "standalone"`, dan tanpa ikon gambar dulu (ikon menunggu keputusan logo, antislop R-23).
- [ ] **Step 5:** Jalankan test lagi. Expected: PASS. Jalankan `npm run build`. Expected: build sukses.
- [ ] **Step 6: Commit** `chore: setup next.js, supabase, dan shell visual`

---

### Task 2: Util Rupiah, tanggal, dan WhatsApp

**Files:**
- Create: `src/lib/rupiah.ts`, `src/lib/tanggal.ts`, `src/lib/whatsapp.ts`
- Test: `tests/unit/rupiah.test.ts`, `tests/unit/tanggal.test.ts`, `tests/unit/whatsapp.test.ts`

**Interfaces:**
- Produces:
  - `formatRupiah(nilai: number): string`
  - `parseRupiah(input: string): number | null`
  - `hariIniJakarta(sekarang?: Date): string` (format `YYYY-MM-DD`)
  - `kelompokJatuhTempo(jatuhTempo: string | null, hariIni: string): 'terlambat' | 'hari_ini' | 'tujuh_hari' | null`
  - `linkWhatsApp(nomor: string): string | null`

- [ ] **Step 1: Tulis test yang gagal**

```ts
// rupiah
expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
expect(formatRupiah(0)).toBe('Rp 0');
expect(parseRupiah('1.500.000')).toBe(1500000);
expect(parseRupiah('Rp 1.500.000')).toBe(1500000);
expect(parseRupiah(' 1500000 ')).toBe(1500000);
expect(parseRupiah('1,5jt')).toBeNull();
expect(parseRupiah('')).toBeNull();
expect(parseRupiah('-5000')).toBeNull();

// tanggal
expect(hariIniJakarta(new Date('2026-11-24T17:30:00Z'))).toBe('2026-11-25'); // 00:30 WIB
expect(kelompokJatuhTempo('2026-11-24', '2026-11-25')).toBe('terlambat');
expect(kelompokJatuhTempo('2026-11-25', '2026-11-25')).toBe('hari_ini');
expect(kelompokJatuhTempo('2026-12-02', '2026-11-25')).toBe('tujuh_hari');
expect(kelompokJatuhTempo('2026-12-03', '2026-11-25')).toBeNull();
expect(kelompokJatuhTempo(null, '2026-11-25')).toBeNull();

// whatsapp
expect(linkWhatsApp('0812-3456-7890')).toBe('https://wa.me/6281234567890');
expect(linkWhatsApp('+62 812 3456 7890')).toBe('https://wa.me/6281234567890');
expect(linkWhatsApp('6281234567890')).toBe('https://wa.me/6281234567890');
expect(linkWhatsApp('12345')).toBeNull();
```

- [ ] **Step 2:** `npx vitest run tests/unit`. Expected: FAIL, modul belum ada.
- [ ] **Step 3:** Implementasi. `formatRupiah` memakai `Intl.NumberFormat('id-ID')` lalu ditambah awalan `Rp `. `parseRupiah` hanya menerima angka, titik ribuan, dan awalan `Rp` opsional. `hariIniJakarta` memakai `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })`. `tujuh_hari` berarti besok sampai hari ini + 7, inklusif. `linkWhatsApp` menerima nomor dengan awalan `0`, `62`, atau `+62`, dan total 10 sampai 13 digit setelah `62`.
- [ ] **Step 4:** `npx vitest run tests/unit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: util rupiah, tanggal jakarta, dan link whatsapp`

---

### Task 3: Skema dasar, login Google, dan allowlist Editor

**Files:**
- Create: `supabase/migrations/0001_dasar.sql`, `supabase/seed.sql`
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/middleware.ts`, `src/proxy.ts` (awalnya `middleware.ts` di root, dipindah karena tidak terbaca)
- Create: `src/app/login/page.tsx` (ganti versi Task 1), `src/app/auth/callback/route.ts`, `src/app/api/dev-login/route.ts`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx` (placeholder dashboard)
- Create: `tests/db/helpers.ts`
- Test: `tests/db/akses.test.ts`, `tests/e2e/login.spec.ts`

**Interfaces:**
- Produces (SQL):
  - Tabel `editor_diizinkan(email text primary key)`, `editor`, `pihak`, `acara` sesuai `data-model.md`.
  - `is_editor() returns boolean`: `security definer`, true kalau `lower(auth.jwt()->>'email')` ada di `editor_diizinkan`.
  - `editor_saat_ini() returns uuid`: `editor.id` milik `auth.uid()`.
  - `pastikan_editor() returns uuid`: membuat baris `editor` saat login pertama kalau email diizinkan. Kalau tidak diizinkan, raise exception dengan message `bukan_editor`.
  - Trigger `isi_audit()` di setiap tabel data: isi `dibuat_oleh` dan `diubah_oleh` dengan `editor_saat_ini()`, serta `dibuat_pada` dan `diubah_pada`.
  - Data default di migration: Pihak (Rendy, Dinar, Keluarga Pria, Keluarga Wanita, Lainnya) dan Acara (Lamaran, Akad, Resepsi, Ngunduh Mantu) dengan `tanggal` null.
- Produces (TS):
  - `tests/db/helpers.ts`: `buatEditorTest(email: string): Promise<SupabaseClient>` yang membuat user lewat admin API project dev (`email_confirm: true`, password acak per run), memasukkan email ke `editor_diizinkan`, login dengan password, lalu memanggil `pastikan_editor()`. Juga `buatOrangLuar(email: string): Promise<SupabaseClient>` dan `bersihkanTest(): Promise<void>` yang menghapus user `@test.local` beserta datanya.
  - `/api/dev-login?email=` mengembalikan 404 kecuali tiga syarat terpenuhi: `NODE_ENV !== 'production'`, `DEV_LOGIN=1`, dan `NEXT_PUBLIC_SUPABASE_URL` mengandung `SUPABASE_DEV_PROJECT_REF`. Email harus berakhiran `@test.local`. Dipakai Playwright untuk login sebagai Editor test.

- [ ] **Step 1: Tulis test DB yang gagal**

```ts
test('editor bisa membaca acara default', async () => {
  const rendy = await buatEditorTest('rendy@test.local');
  const { data } = await rendy.from('acara').select('nama').order('nama');
  expect(data?.map(a => a.nama)).toEqual(['Akad', 'Lamaran', 'Ngunduh Mantu', 'Resepsi']);
});
test('orang luar tidak bisa membaca apa pun', async () => {
  const luar = await buatOrangLuar('luar@test.local');
  const { data } = await luar.from('acara').select('id');
  expect(data).toEqual([]);
  const { error } = await luar.rpc('pastikan_editor');
  expect(error?.message).toContain('bukan_editor');
});
test('audit terisi otomatis', async () => {
  const dinar = await buatEditorTest('dinar@test.local');
  const { data } = await dinar.from('acara').insert({ nama: 'Pengajian', jenis: 'lainnya' }).select('dibuat_oleh, diubah_oleh').single();
  expect(data?.dibuat_oleh).not.toBeNull();
  expect(data?.diubah_oleh).toBe(data?.dibuat_oleh);
});
```

- [ ] **Step 2:** Pastikan project sudah di-link (`supabase/.temp/project-ref` ada), lalu `npx vitest run tests/db/akses.test.ts`. Expected: FAIL, tabel belum ada.
- [ ] **Step 3:** Tulis `0001_dasar.sql`. Aktifkan RLS di semua tabel dengan policy `using (is_editor()) with check (is_editor())`. `seed.sql` dibiarkan kosong kecuali komentar bahwa user test dibuat oleh helper.
- [ ] **Step 4:** `npx supabase db reset --linked` lalu jalankan test lagi. Expected: PASS. Di task berikutnya, setiap "`db reset`" berarti perintah ini.
- [ ] **Step 5:** Buat klien Supabase dengan `@supabase/ssr`, middleware refresh sesi, halaman login dengan tombol "Masuk dengan Google" (`signInWithOAuth({ provider: 'google' })`), dan callback yang menukar code lalu memanggil `pastikan_editor()`. Kalau gagal, callback melakukan `signOut()` dan redirect ke `/login?error=bukan-editor`, dan halaman login menampilkan "Akun ini tidak terdaftar sebagai Editor." `(app)/layout.tsx` redirect ke `/login` kalau tidak ada sesi.
- [ ] **Step 6: Tulis test e2e**: tanpa sesi, `/` redirect ke `/login`. Setelah `/api/dev-login?email=rendy@test.local`, `/` menampilkan judul "Dashboard".
- [ ] **Step 7:** `npx playwright test tests/e2e/login.spec.ts`. Expected: PASS.
- [ ] **Step 8:** `npx supabase gen types typescript --linked > src/lib/database.types.ts`. Di task berikutnya, "generate ulang types" berarti perintah ini.
- [ ] **Step 9: Commit** `feat: skema dasar, rls editor, dan login google`

---

### Task 4: Halaman Acara

**Files:**
- Create: `src/app/(app)/acara/page.tsx`, `acara/[id]/page.tsx`, `acara/actions.ts`, `acara/loading.tsx`, `acara/error.tsx`
- Create: `src/components/Kosong.tsx`
- Test: `tests/e2e/acara.spec.ts`

**Interfaces:**
- Consumes: `createClient()` dari `src/lib/supabase/server.ts`.
- Produces: `simpanAcara(formData: FormData): Promise<{ error?: string }>`, `hapusAcara(id: string): Promise<{ error?: string }>`. `<Kosong pesan: string aksi?: { label: string; href: string } />`.

- [ ] **Step 1: Tulis test e2e yang gagal**: daftar menampilkan 4 Acara default dengan label "Tanggal belum pasti". Ubah Lamaran dengan tanggal `2026-12-20` dan lokasi, lalu daftar menampilkan "20 Desember 2026". Isi `perkiraan` "pertengahan 2027" di Resepsi, lalu label berubah jadi "Perkiraan: pertengahan 2027".
- [ ] **Step 2:** Jalankan. Expected: FAIL.
- [ ] **Step 3:** Implementasi daftar (urut berdasarkan tanggal, yang null di akhir), form tambah/ubah, dan hapus dengan konfirmasi. Menghapus Acara yang masih dipakai Vendor ditolak oleh foreign key, dan UI menampilkan "Acara ini masih dipakai vendor. Lepas vendornya dulu."
- [ ] **Step 4:** Jalankan. Expected: PASS.
- [ ] **Step 5: Commit** `feat: halaman acara`

---

### Task 5: Vendor dan Kategori Vendor

**Files:**
- Create: `supabase/migrations/0002_vendor.sql` (bagian `kategori_vendor`, `vendor`, `vendor_acara`, `log_kontak`)
- Create: `src/app/(app)/vendor/page.tsx`, `vendor/baru/page.tsx`, `vendor/[id]/page.tsx`, `vendor/actions.ts`, `loading.tsx`, `error.tsx`
- Create: `src/components/StatusLabel.tsx`
- Test: `tests/db/vendor.test.ts`, `tests/e2e/vendor.spec.ts`

**Interfaces:**
- Consumes: `linkWhatsApp()` dari Task 2.
- Produces:
  - SQL: 13 Kategori Vendor default dari PRD. Enum `status_vendor` (`kandidat`, `survei_nego`, `booked`, `selesai`, `batal`).
  - `simpanVendor(formData: FormData): Promise<{ id?: string; error?: string }>` yang menyimpan vendor beserta daftar `acara_id` ke `vendor_acara`.
  - `ubahStatusVendor(id: string, status: StatusVendor): Promise<{ error?: string }>`.
  - `<StatusLabel status: StatusVendor | 'lunas' | 'terlambat' | ... />` selalu merender teks. Warna `--accent` untuk Booked, Selesai, dan Lunas. Warna `--primary` untuk Terlambat dan Belum bayar.
  - `/vendor/[id]` punya slot section untuk Paket (Task 6), Kontrak dan Pembayaran (Task 9), dan Log Kontak (Task 10).

- [ ] **Step 1: Tulis test DB yang gagal**: kategori default berjumlah 13. Vendor bisa dihubungkan ke Lamaran dan Resepsi sekaligus. Menghapus kategori yang dipakai Vendor ditolak.
- [ ] **Step 2: Tulis test e2e yang gagal**: tambah vendor "Foto A" di Foto & Video untuk Lamaran dengan WhatsApp `0812-3456-7890`, maka tombol "Chat WhatsApp" punya `href="https://wa.me/6281234567890"`. Filter Status Kandidat menampilkan Foto A. Filter Status Booked menampilkan tampilan kosong.
- [ ] **Step 3:** Jalankan keduanya. Expected: FAIL.
- [ ] **Step 4:** Tulis migration, `db reset`, generate ulang types, lalu buat halaman. Filter disimpan di query string (`?kategori=&status=&acara=`).
- [ ] **Step 5:** Jalankan keduanya. Expected: PASS.
- [ ] **Step 6: Commit** `feat: vendor, kategori, dan filter`

---

### Task 6: Paket dan Komponen

**Files:**
- Modify: `supabase/migrations/0002_vendor.sql` (tambah `komponen`, `paket`, `nilai_komponen`)
- Create: `supabase/migrations/0006_storage.sql`
- Create: `src/app/(app)/vendor/[id]/paket/...`, `src/app/(app)/pengaturan/komponen/...`, `src/components/UnggahLampiran.tsx`
- Test: `tests/db/paket.test.ts`, `tests/e2e/paket.spec.ts`

**Interfaces:**
- Consumes: `parseRupiah()` dan `formatRupiah()` dari Task 2.
- Produces:
  - SQL: trigger yang menolak `nilai_komponen` kalau `komponen.kategori_vendor_id` berbeda dari kategori Vendor pemilik Paket, dengan message `komponen_beda_kategori`. Mengubah kategori Vendor yang Paketnya sudah punya `nilai_komponen` juga ditolak dengan message `kategori_terkunci`.
  - Bucket privat `lampiran`. Policy baca/tulis `is_editor()`. Path `{tabel}/{id}/{namaFile}`.
  - `simpanPaket(formData: FormData): Promise<{ id?: string; error?: string }>` yang menyimpan Paket dan semua nilai Komponennya sekaligus.
  - `simpanKomponen(formData: FormData)`, `urutkanKomponen(kategoriId: string, urutan: string[])`.
  - `<UnggahLampiran tabel: string id: string />` untuk upload dari browser, menampilkan file lewat signed URL berdurasi 1 jam.

- [ ] **Step 1: Tulis test DB yang gagal** untuk `komponen_beda_kategori` dan `kategori_terkunci`.
- [ ] **Step 2: Tulis test e2e yang gagal**: tambah Komponen "Durasi" (angka, jam) dan "Album" (ya_tidak) di Foto & Video. Tambah Paket "Gold" Rp 8.500.000 untuk Foto A dengan Durasi 8 dan Album Ya. Detail vendor menampilkan "Rp 8.500.000", "8 jam", dan "Ya". Input harga `1,5jt` menampilkan "Tulis nominal dengan angka, contoh 1.500.000".
- [ ] **Step 3:** Jalankan. Expected: FAIL.
- [ ] **Step 4:** Implementasi. Form Paket menampilkan field per Komponen sesuai `tipe`, ditambah `lain_lain` dan `syarat_dp`.
- [ ] **Step 5:** Jalankan. Expected: PASS.
- [ ] **Step 6: Commit** `feat: paket, komponen pembanding, dan lampiran`

---

### Task 7: Skema keuangan dan `pilih_paket()`

**Files:**
- Create: `supabase/migrations/0003_keuangan.sql`
- Test: `tests/db/keuangan.test.ts`

**Interfaces:**
- Produces (SQL):
  - Tabel `kontrak`, `alokasi_acara`, `pembayaran` sesuai `data-model.md`, dengan check constraint: `dibayar` wajib punya `tanggal_bayar` dan `pihak_id`, dan `terjadwal` wajib punya `jatuh_tempo`.
  - Trigger di `alokasi_acara` yang menolak `acara_id` di luar `vendor_acara` milik Vendor tersebut, dengan message `acara_bukan_milik_vendor`.
  - View `ringkasan_kontrak(kontrak_id, vendor_id, total, terbayar, sisa, lunas)` dengan `security_invoker = true`. `lunas` bernilai `sisa <= 0`.
  - View `kontribusi_pihak(pihak_id, nama, total)` dan `kontribusi_pihak_vendor(pihak_id, vendor_id, total)`, dari Pembayaran yang `dibayar`. Pihak tanpa Pembayaran tetap muncul dengan total 0.
  - `pilih_paket(p_paket_id uuid, p_alokasi jsonb default null) returns uuid` (id Kontrak), berjalan dalam satu transaksi:
    - Paket menjadi `dipilih`. Paket lain milik Vendor yang sama menjadi `tidak_dipilih`. Paket `aktif` milik Vendor lain juga menjadi `tidak_dipilih`, tetapi hanya Vendor di kategori yang sama yang berbagi minimal satu Acara dengan Vendor terpilih. Kandidat fotografer Resepsi tidak terpengaruh saat fotografer Lamaran dipilih.
    - Vendor menjadi `booked`.
    - Kontrak dibuat atau diperbarui dengan `paket_id`.
    - `alokasi_acara` diganti. Kalau Vendor punya satu Acara dan `p_alokasi` null, dibuat satu baris senilai `paket.harga`. Kalau Vendor punya lebih dari satu Acara dan `p_alokasi` null, raise `alokasi_wajib`.
    - Format `p_alokasi`: `[{"acara_id": "...", "nominal": 3000000}]`.

- [ ] **Step 1: Tulis test DB yang gagal**

```ts
test('vendor satu acara: alokasi otomatis senilai harga paket', ...)
  // expect ringkasan_kontrak.total === 8500000, vendor.status === 'booked', paket.status === 'dipilih'
test('vendor dua acara tanpa alokasi ditolak', ...)
  // expect error.message toContain 'alokasi_wajib'
test('vendor dua acara dengan alokasi: total = jumlah alokasi', ...)
  // alokasi Lamaran 3000000 + Resepsi 8000000, expect total === 11000000
test('paket lain di kategori dan acara yang sama jadi tidak_dipilih', ...)
test('paket vendor sekategori untuk acara lain tetap aktif', ...)
  // Foto A (Lamaran) dipilih, Foto C (hanya Resepsi) tetap 'aktif'
test('alokasi ke acara di luar vendor_acara ditolak', ...)
  // expect 'acara_bukan_milik_vendor'
test('pembayaran dibayar tanpa pihak ditolak', ...)
test('kelebihan bayar: lunas true, sisa negatif', ...)
  // total 8500000, dibayar 9000000, expect lunas === true, sisa === -500000
test('kontribusi per pihak', ...)
  // DP 2550000 oleh Rendy, pelunasan 5950000 oleh Keluarga Wanita, satu Terjadwal 1000000
  // expect Rendy 2550000, Keluarga Wanita 5950000, Dinar 0 (Terjadwal tidak dihitung)
```

- [ ] **Step 2:** `npx vitest run tests/db/keuangan.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Tulis migration, `db reset`, generate ulang types.
- [ ] **Step 4:** Jalankan. Expected: PASS.
- [ ] **Step 5: Commit** `feat: skema kontrak, alokasi acara, pembayaran, dan pilih_paket`

---

### Task 8: Halaman Komparasi

**Files:**
- Create: `src/app/(app)/komparasi/page.tsx` (pilih kategori), `komparasi/[kategoriId]/page.tsx`, `komparasi/actions.ts`, `loading.tsx`, `error.tsx`
- Test: `tests/e2e/komparasi.spec.ts`

**Interfaces:**
- Consumes: `pilih_paket()` dari Task 7, `formatRupiah()`.
- Produces: `pilihPaket(paketId: string, alokasi: { acara_id: string; nominal: number }[] | null): Promise<{ kontrakId?: string; error?: string }>`.

- [ ] **Step 1: Tulis test e2e yang gagal**
  - Siapkan 3 Paket dari 3 Vendor Foto & Video. Paket ketiga tidak mengisi Komponen "Album".
  - Di 375px: baris berurutan Harga, Durasi, Album, Syarat DP, Lain-lain. Sel kosong bertuliskan "Belum diisi". `document.documentElement.scrollWidth <= 375`, dan container tabel punya `scrollWidth` lebih besar dari `clientWidth`. Kolom label tetap terlihat setelah container digeser ke kanan.
  - Klik "Pilih paket ini" di Paket Vendor satu Acara, lalu konfirmasi. Vendor itu tampil Booked, dua Paket lain tampil "Tidak dipilih".
  - Untuk Vendor dua Acara, dialog meminta nominal per Acara. Tombol simpan nonaktif sampai semua terisi. Dialog bisa ditutup dengan Escape.
- [ ] **Step 2:** Jalankan. Expected: FAIL.
  - Filter `?acara=` hanya menampilkan Paket dari Vendor yang terhubung ke Acara tersebut.
- [ ] **Step 3:** Implementasi. Kolom label memakai `position: sticky; left: 0`. Paket `tidak_dipilih` tetap tampil tetapi diredupkan, dengan label teks. Vendor `batal` disembunyikan secara default, dengan toggle "Tampilkan vendor batal".
- [ ] **Step 4:** Jalankan. Expected: PASS.
- [ ] **Step 5: Commit** `feat: komparasi paket per kategori`

---

### Task 9: UI Kontrak, Pembayaran, dan Kontribusi

**Files:**
- Create: `src/app/(app)/vendor/[id]/kontrak/...` (section di detail Vendor), `src/app/(app)/kontribusi/page.tsx`, `loading.tsx`, `error.tsx`
- Create: `src/components/Rupiah.tsx`
- Test: `tests/e2e/pembayaran.spec.ts`

**Interfaces:**
- Consumes: view `ringkasan_kontrak`, `kontribusi_pihak`, `kontribusi_pihak_vendor` dari Task 7. `<UnggahLampiran>` dari Task 6.
- Produces:
  - `simpanAlokasi(kontrakId: string, alokasi: { acara_id: string; nominal: number }[])`.
  - `simpanPembayaran(formData: FormData)`.
  - `tandaiDibayar(pembayaranId: string, tanggalBayar: string, pihakId: string): Promise<{ error?: string }>`, dipakai juga oleh dashboard di Task 11.
  - `<Rupiah nilai: number />`.
  - Kontrak tanpa Paket bisa dibuat manual dari detail Vendor, dengan minimal satu Alokasi Acara.

- [ ] **Step 1: Tulis test e2e yang gagal**
  - Vendor Booked dengan total Rp 8.500.000. Tambah DP Rp 2.550.000 Dibayar oleh Rendy, maka "Sisa Rp 5.950.000".
  - Tambah Pelunasan Terjadwal dengan Jatuh Tempo, lalu tandai Dibayar oleh Keluarga Wanita, maka status "Lunas".
  - Tambah Pembayaran Rp 500.000 lagi, Dibayar oleh Keluarga Wanita, maka tampil "Lunas" dan "Kelebihan bayar Rp 500.000".
  - Halaman Kontribusi menampilkan Rendy Rp 2.550.000 dan Keluarga Wanita Rp 6.450.000, dengan rincian per Vendor saat baris diketuk.
  - Menandai Dibayar tanpa memilih Pihak menampilkan "Pilih siapa yang membayar".
- [ ] **Step 2:** Jalankan. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Jalankan. Expected: PASS.
- [ ] **Step 5: Commit** `feat: kontrak, pembayaran, dan rekap kontribusi`

---

### Task 10: Log Kontak dan Tugas

**Files:**
- Create: `supabase/migrations/0004_tugas.sql` (tabel `tugas`. View `agenda` ditambah di Task 11)
- Create: `src/app/(app)/vendor/[id]/log/...` (section di detail Vendor), `src/app/(app)/tugas/page.tsx`, `tugas/actions.ts`, `loading.tsx`, `error.tsx`
- Test: `tests/db/tugas.test.ts`, `tests/e2e/tugas.spec.ts`

**Interfaces:**
- Produces:
  - `simpanLogKontak(formData: FormData)`.
  - `buatTugasDariLog(logKontakId: string, judul: string, jatuhTempo: string, picId: string)` yang mengisi `vendor_id` dan `log_kontak_id`.
  - `simpanTugas(formData: FormData)`.
  - `selesaikanTugas(id: string): Promise<{ error?: string }>`, dipakai juga oleh dashboard. Mengisi `selesai_pada`.

- [ ] **Step 1: Tulis test DB yang gagal**: `tugas.pic_id` wajib diisi, dan `selesai_pada` terisi otomatis lewat trigger saat status menjadi `selesai`.
- [ ] **Step 2: Tulis test e2e yang gagal**
  - Di detail Foto A, tambah Log Kontak WhatsApp "Minta revisi pricelist". Klik "Buat follow-up", isi judul, Jatuh Tempo, dan PIC Dinar. Tugas tampil di `/tugas` dengan link ke Foto A.
  - Filter PIC Rendy menyembunyikan Tugas itu.
  - Tugas tanpa Jatuh Tempo tampil dengan label "Tanpa jatuh tempo".
- [ ] **Step 3:** Jalankan keduanya. Expected: FAIL.
- [ ] **Step 4:** Implementasi.
- [ ] **Step 5:** Jalankan keduanya. Expected: PASS.
- [ ] **Step 6: Commit** `feat: log kontak dan tugas follow-up`

---

### Task 11: Dashboard

**Files:**
- Modify: `supabase/migrations/0004_tugas.sql` (tambah view `agenda`)
- Modify: `src/app/(app)/page.tsx`
- Create: `src/app/(app)/loading.tsx`, `src/app/(app)/error.tsx`, `src/components/NavigasiBawah.tsx`
- Test: `tests/e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: `hariIniJakarta()`, `kelompokJatuhTempo()`, `selesaikanTugas()`, `tandaiDibayar()`.
- Produces: view `agenda(jenis text, id uuid, judul text, jatuh_tempo date, pic_id uuid, vendor_id uuid, acara_id uuid, nominal bigint)`, gabungan Tugas `belum` dan Pembayaran `terjadwal` yang punya `jatuh_tempo`. Judul Pembayaran berformat `"{jenis} {nama vendor}"`, misalnya "Pelunasan Foto A".
- `<NavigasiBawah />` berisi Dashboard, Vendor, Tugas, Kontribusi, dan Lainnya. Lainnya berisi Acara, Komparasi, Share Link, dan Pengaturan. Hanya halaman yang sudah ada yang ditampilkan.

- [ ] **Step 1: Tulis test e2e yang gagal**
  - Satu Tugas lewat Jatuh Tempo, satu Pembayaran jatuh tempo hari ini, satu Tugas 5 hari lagi, satu Tugas 10 hari lagi.
  - Dashboard menampilkan Terlambat (1), Hari ini (1), 7 hari ke depan (1). Tugas 10 hari lagi tidak tampil.
  - Klik "Selesai" di Tugas Terlambat, maka kelompok Terlambat tampil kosong dengan pesan "Tidak ada yang terlambat."
  - Klik "Tandai dibayar" di Pembayaran, pilih Pihak, simpan. Item hilang dari dashboard dan Sisa Tagihan vendor berkurang.
  - Tanpa data sama sekali, dashboard menampilkan tampilan kosong dengan link "Tambah vendor" ke `/vendor/baru`.
- [ ] **Step 2:** Jalankan. Expected: FAIL.
- [ ] **Step 3:** Implementasi. Kelompok dihitung di server dengan `hariIniJakarta()`. Terlambat jadi titik fokus layar, dan tampil paling atas walaupun kosong.
- [ ] **Step 4:** Jalankan. Expected: PASS.
- [ ] **Step 5: Commit** `feat: dashboard agenda dan navigasi`

---

### Task 12: Share Link

**Files:**
- Create: `supabase/migrations/0005_share_link.sql`
- Create: `src/app/(app)/share/page.tsx`, `share/actions.ts`, `src/app/s/[token]/page.tsx`, `s/[token]/loading.tsx`, `s/[token]/error.tsx`
- Test: `tests/db/share.test.ts`, `tests/e2e/share.spec.ts`

**Interfaces:**
- Produces:
  - Tabel `share_link` sesuai `data-model.md`. Token dibuat dengan `encode(gen_random_bytes(32), 'hex')`.
  - `baca_share_link(p_token text) returns jsonb`: `security definer`, bisa dipanggil `anon`. Mengembalikan `null` kalau token tidak ada atau sudah dicabut. Kalau valid, mengembalikan `{ label, acara?, vendor?, tugas?, keuangan? }` sesuai `bagian`:
    - `acara`: nama, tanggal, perkiraan, lokasi.
    - `vendor`: nama, kategori, status, nama acara. Tanpa harga, kontak, atau catatan.
    - `tugas`: judul, nama PIC, jatuh tempo, status.
    - `keuangan`: total, terbayar, dan sisa per Vendor, plus Kontribusi per Pihak.
    - Tidak pernah memuat `bukti`, `lampiran`, nomor WhatsApp, atau `catatan`.
  - `buatShareLink(label: string, bagian: string[])`, `cabutShareLink(id: string)`.

- [ ] **Step 1: Tulis test DB yang gagal**

```ts
test('tanpa keuangan, response tidak memuat nominal', async () => {
  // link dengan bagian ['acara','vendor','tugas']
  const raw = JSON.stringify(data);
  expect(raw).not.toMatch(/"(total|terbayar|sisa|nominal|harga)"/);
  expect(raw).not.toContain('lampiran/');
});
test('dengan keuangan, tetap tanpa bukti dan lampiran', ...)
test('link dicabut mengembalikan null', ...)
test('token acak yang tidak ada mengembalikan null', ...)
test('anon tidak bisa select share_link langsung', ...)
```

- [ ] **Step 2: Tulis test e2e yang gagal**: buat link "Keluarga Dinar" dengan centang default (Keuangan tidak tercentang). Buka `/s/{token}` tanpa sesi, maka Acara dan Vendor tampil dan tidak ada teks "Rp". Cabut link, maka halaman menampilkan "Link ini sudah tidak aktif."
- [ ] **Step 3:** Jalankan keduanya. Expected: FAIL.
- [ ] **Step 4:** Implementasi. Halaman `/s/[token]` memakai klien anon dan hanya memanggil `baca_share_link`. Tombol "Salin link" memakai `navigator.clipboard` dan menampilkan "Link disalin".
- [ ] **Step 5:** Jalankan keduanya. Expected: PASS.
- [ ] **Step 6: Commit** `feat: share link read-only untuk keluarga`

---

### Task 13: Pengaturan Pihak dan Kategori

**Files:**
- Create: `src/app/(app)/pengaturan/page.tsx`, `pengaturan/actions.ts`, `loading.tsx`, `error.tsx` (halaman Komponen dari Task 6 ditautkan dari sini)
- Test: `tests/e2e/pengaturan.spec.ts`

**Interfaces:**
- Produces: `simpanPihak(formData)`, `arsipkanPihak(id)`, `simpanKategori(formData)`, `arsipkanKategori(id)`. Item yang sudah dipakai tidak punya tombol hapus, hanya "Arsipkan". Item yang diarsipkan hilang dari pilihan form tetapi tetap tampil di data lama.

- [ ] **Step 1: Tulis test e2e yang gagal**: ganti label "Lainnya" menjadi "Om Budi", maka form Pembayaran menampilkan "Om Budi". Arsipkan Kategori "Hiburan", maka kategori itu hilang dari form Vendor baru.
- [ ] **Step 2:** Jalankan. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Jalankan. Expected: PASS.
- [ ] **Step 5: Commit** `feat: pengaturan pihak dan kategori`

---

### Task 14: Deploy dan Delivery Gate

**Files:**
- Create: `docs/deploy.md`
- Modify: `DESIGN.md` (catat warna netral, radius, dan jarak yang dipakai beserta alasannya)

- [ ] **Step 1:** Tulis `docs/deploy.md` berisi langkah yang hanya bisa dilakukan Rendy sendiri: membuat project Supabase, membuat OAuth Client Google dan mendaftarkan redirect URL, mengisi env di Vercel, `npx supabase db push`, dan memasukkan dua email Editor ke `editor_diizinkan` lewat SQL editor Supabase.
- [ ] **Step 2:** Jalankan semua test: `npx vitest run` dan `npx playwright test`. Expected: semua PASS.
- [ ] **Step 3:** `npm run build`. Expected: sukses, tanpa warning TypeScript.
- [ ] **Step 4:** Jalankan Delivery Gate antislop. Klik setiap tombol dan link di 375px dan desktop, lalu catat hasilnya elemen per elemen. Cek kontras semua kombinasi teks yang dipakai. Tulis laporan PASS/FAIL ke `anti-slop/delivery-fase-1.md`. Ada satu FAIL berarti perbaiki dulu, lalu ulangi step ini.
- [ ] **Step 5:** Cek kriteria selesai Fase 1 di `docs/PRD.md` satu per satu, dan tulis buktinya di laporan yang sama.
- [ ] **Step 6: Commit** `docs: panduan deploy dan laporan delivery fase 1`
