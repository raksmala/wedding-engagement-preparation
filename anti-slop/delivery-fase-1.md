# Delivery Gate Fase 1

**Status: LULUS untuk semua yang bisa dicek di project dev. Tinggal cek di produksi (`docs/deploy.md` langkah 10).**

Laporan pertama disusun 24 November 2026 (Task 14) tanpa menjalankan apa pun. Pada 25 November 2026 semua test dan checklist dijalankan terhadap project dev setelah `npx supabase db reset --linked`. Hasilnya:

- Test di bagian 4 semuanya PASS.
- Tabel elemen di bagian 3 terisi di 375px dan desktop, tanpa FAIL yang tersisa.
- Tiga FAIL baru ditemukan dan sudah diperbaiki, rinciannya di bagian 6.

Yang belum bisa dicek di dev:

- Pengalihan ke Google dan kembali lewat `/auth/callback`.
- Sesi yang bertahan lebih dari 1 jam.
- Ikon PWA.
- Kriteria PRD 3 dan 6, yang butuh data asli.

Gate ini lulus karena semua test di bagian 4 PASS, tabel elemen di bagian 3 terisi tanpa FAIL di 375px dan desktop, dan semua FAIL di bagian 6 sudah diperbaiki.

## 1. Hasil kontras (dihitung)

Rumus luminans relatif WCAG 2.x, dihitung dengan script node kecil. Batas 4.5:1 untuk teks normal, 3:1 untuk teks besar dan batas komponen UI. Tabel yang sama dengan penjelasan pemakaiannya ada di `DESIGN.md` bagian "Hasil cek kontras".

| Kombinasi | Rasio | Batas | Hasil | Catatan |
|---|---|---|---|---|
| `--teks` `#2b2325` di atas `--bg` `#f5efef` | 13.49 | 4.5 | PASS | |
| `--teks-lembut` `#4a3f41` di atas `--bg` | 8.89 | 4.5 | PASS | |
| `--primary` `#80172c` di atas `--bg` | 8.90 | 4.5 | PASS | Judul, link, tombol bahaya, status Terlambat |
| `--accent` `#60692d` di atas `--bg` | 5.20 | 4.5 | PASS | Status positif |
| `--teks` di atas `--surface` `#ecb6b6` | 8.71 | 4.5 | PASS | Kolom Paket Terpilih di Komparasi |
| `--teks-lembut` di atas `--surface` | 5.74 | 4.5 | PASS | Tidak dipakai saat ini |
| `--primary` di atas `--surface` | 5.75 | 4.5 | PASS | Tidak dipakai untuk teks saat ini |
| `--accent` di atas `--surface` | 3.36 | 4.5 | FAIL, tidak dipakai | Di kolom terpilih semua `.status-label` ditimpa jadi `--teks` (`.tabel-komparasi .kolom-dipilih .status-label`). Tercatat di `DESIGN.md` sebagai "jangan dipakai" |
| `--teks` di atas `#fff` (isian form) | 15.33 | 4.5 | PASS | |
| `--teks-lembut` di atas `#fff` | 10.10 | 4.5 | PASS | Placeholder isian (`::placeholder` dengan `opacity: 1`), diperbaiki di kode. Tampilan di Safari dan Firefox BELUM DIVERIFIKASI |
| `--primary` di atas `#fff` | 10.11 | 4.5 | PASS | Belum dipakai |
| `#fff` di atas `--primary` (`.tombol-utama`) | 10.11 | 4.5 | PASS | |
| `.tombol-utama:disabled` (opacity 0.7 di atas `--bg`) | 4.88 | 4.5 | PASS | |
| `.tombol-bahaya:disabled` (opacity 0.7) | 4.46 | 4.5 | Di bawah batas, dikecualikan | Kontrol nonaktif dikecualikan WCAG 1.4.3. Dicatat apa adanya |
| `.tombol-sekunder:disabled` (opacity 0.7, baru di commit ini) | 5.37 | 4.5 | PASS | |
| `--garis` `#8a7a7d` di atas `--bg` (batas kartu, tombol sekunder) | 3.58 | 3 | PASS | |
| `--garis` di atas `#fff` (batas isian) | 4.07 | 3 | PASS | |
| `--garis` di atas `--surface` (garis sel kolom terpilih) | 2.31 | 3 | Di bawah batas, dekoratif | Garis antar sel tabel bukan batas komponen yang wajib 3:1. Kolom dibedakan oleh latar dan label "Dipilih" |
| `--primary` di atas `--bg` (garis fokus, bingkai Terlambat, bingkai dialog) | 8.90 | 3 | PASS | |
| `--primary` di atas `--surface` (garis fokus di kolom terpilih) | 5.75 | 3 | PASS | |
| `--accent` di atas `--bg` (bingkai `.pesan-berhasil`) | 5.20 | 3 | PASS | |
| Bingkai dialog `--primary` di atas backdrop (`--teks` 50% di atas `--bg`) | 2.95 | 3 | Di bawah batas, info | Tepi dialog tetap terlihat dari latar dialog `--bg` terhadap backdrop: 3.01 (PASS) |
| `--garis` sebagai teks | 3.58 | 4.5 | FAIL, tidak dipakai | `grep` tidak menemukan `color: var(--garis)` |
| Placeholder bawaan Chromium `#757575` di atas `#fff` | 4.61 | 4.5 | PASS | Tidak dipakai lagi, ditimpa `::placeholder` |
| Placeholder bawaan WebKit `darkGray` `#a9a9a9` di atas `#fff` | 2.35 | 4.5 | FAIL, diperbaiki di kode | Sebelumnya berlaku di Safari. Sekarang ditimpa `::placeholder { color: var(--teks-lembut) }` (10.10). BELUM DIVERIFIKASI di iOS |
| Placeholder bawaan Firefox (teks 54%) di atas `#fff` | 3.49 | 4.5 | FAIL, diperbaiki di kode | Sekarang ditimpa `--teks-lembut` dengan `opacity: 1` (10.10). BELUM DIVERIFIKASI di Firefox |

Teks besar (judul Cormorant 1.375rem sampai 2rem) semuanya memakai `--primary` di atas `--bg` (8.90), jadi lolos batas teks normal sekalipun.

## 2. Pemeriksaan statis

| Cek | Hasil | Bukti |
|---|---|---|
| Tidak ada em dash di `src`, `tests`, `docs`, `DESIGN.md`, `CONTEXT.md`, migration, `public` | PASS | `grep -rn` untuk karakter em dash (U+2014) hanya menemukan `docs/plans/fase-1.md:24`, yaitu aturan yang menyebut karakternya. Tidak ada en dash. File baru di commit ini juga dicek: 0 hasil |
| Tidak ada em dash di pesan commit | PASS | `git log --format=%B` disaring dengan `grep -c` untuk U+2014: 0 |
| File proxy (refresh sesi) terbaca Next.js | **FAIL**, diperbaiki. PASS di build (25 Nov): output menyebut `Proxy (Middleware)`. Sesi lebih dari 1 jam dicek di produksi | `middleware.ts` ada di root, padahal aplikasi memakai `src/app`. Next.js hanya membaca file itu di `src/` (sejajar dengan `app/`), jadi refresh sesi tidak pernah berjalan. Dipindah ke `src/proxy.ts` dengan fungsi `proxy` (nama baru di Next.js 16), `config.matcher` sama. Helper `src/lib/supabase/middleware.ts` tidak diubah |
| Tidak ada `outline: none` tanpa pengganti | PASS | `grep -rn outline src` hanya menemukan `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }` dan `.navigasi-bawah :focus-visible { outline-offset: -4px }` |
| Setiap halaman data punya `loading.tsx` dan `error.tsx` | PASS | Lihat daftar di bawah. Boundary di folder induk berlaku untuk halaman di bawahnya |
| Halaman 404 berbahasa Indonesia | Diperbaiki. PASS (25 Nov, `tests/gate/interaksi.spec.ts`) | Sebelumnya FAIL: tidak ada `src/app/not-found.tsx`. Sekarang ada, berisi judul "Rendy & Dinar", pesan "Halaman tidak ditemukan.", dan link "Kembali ke dashboard" ke `/`. Halaman root ini hanya dipakai untuk URL yang tidak cocok dengan route mana pun (misalnya `/tidak-ada`). Dirender di layout root, jadi tanpa navigasi bawah, dengan judul tab "Halaman tidak ditemukan \| Rendy & Dinar". Setiap `notFound()` sekarang punya `not-found.tsx` sendiri di dalam `(app)`, jadi tampil dengan navigasi bawah: `acara/[id]` (baru, "Acara tidak ditemukan"), `vendor/[id]` (termasuk `vendor/[id]/ubah`), `vendor/[id]/paket`, dan `komparasi/[kategoriId]` |
| Tidak ada link ke route yang tidak ada | PASS | Semua `href`, `redirect()`, `router.push/replace`, dan `action` form dicocokkan ke `page.tsx`. Daftar di bawah |
| Kata dari daftar `_Avoid_` `CONTEXT.md` di teks UI | PASS setelah perbaikan | Dua teks memakai "tahap" (dihindari untuk Status Vendor), diperbaiki di commit ini. Sisanya positif palsu, lihat di bawah |
| Warna hanya dari token | PASS dengan catatan | `grep -rnoE "#[0-9a-fA-F]{3,8}"` di `src` dan `public`: selain token di `:root`, hanya `#fff` (6 kali di `globals.css`), `rgb(43 35 37 / 0.5)` untuk backdrop, serta `#80172c` dan `#f5efef` literal di `layout.tsx` (`themeColor`) dan `manifest.webmanifest`. Semuanya sekarang tercatat di `DESIGN.md` beserta alasan dan kontrasnya |
| Satu-satunya inline style | Dicatat | `src/app/login/page.tsx`: `padding: 2rem 1rem; maxWidth: 480; margin: 0 auto`. Nilainya dicatat di `DESIGN.md` bagian Layout |
| Tap target 44px untuk link yang berdiri sendiri | PASS setelah perbaikan (25 Nov: sapu `tests/gate` menemukan lebar "Ubah" dan "Lihat" 35 sampai 36px, diperbaiki dengan `min-width: 44px`) | Empat link tanpa class 44px diberi `tautan-aksi` di commit Task 14. Sisa terakhir, link alamat web vendor di `<dd>` detail Vendor (`vendor/[id]/page.tsx`), sekarang juga memakai `tautan-aksi`. URL panjang tetap bisa patah baris karena `.rincian dd` memakai `overflow-wrap: anywhere`. Cek di 375px |
| Tombol nonaktif terlihat nonaktif | Diperbaiki. PASS (25 Nov: "Simpan status", "Naik", "Turun" nonaktif di `tests/gate/interaksi.spec.ts` dan cek visual) | Sebelumnya `.tombol-sekunder` tidak punya gaya `:disabled`, sehingga "Simpan status", "Naik", dan "Turun" yang nonaktif terlihat sama dengan yang aktif. Ditambah `opacity: 0.7; cursor: not-allowed` di commit ini |
| `lang="id"` di `<html>` | PASS | `src/app/layout.tsx` |
| Nominal memakai `tabular-nums` | PASS | `.rupiah` dipakai di `Rupiah.tsx`, sel Harga Komparasi, dan Harga di daftar Paket |

### Halaman data dan boundary-nya

| Halaman | `loading.tsx` | `error.tsx` |
|---|---|---|
| `(app)/page.tsx` (Dashboard) | `(app)/loading.tsx` | `(app)/error.tsx` |
| `(app)/acara/page.tsx`, `(app)/acara/[id]/page.tsx` | `(app)/acara/loading.tsx` | `(app)/acara/error.tsx` |
| `(app)/vendor/page.tsx`, `vendor/baru`, `vendor/[id]`, `vendor/[id]/ubah` | `(app)/vendor/loading.tsx` | `(app)/vendor/error.tsx` |
| `(app)/vendor/[id]/paket/baru`, `vendor/[id]/paket/[paketId]/ubah` | `(app)/vendor/[id]/paket/loading.tsx` | `(app)/vendor/[id]/paket/error.tsx` |
| `(app)/komparasi/page.tsx`, `komparasi/[kategoriId]` | `(app)/komparasi/loading.tsx` | `(app)/komparasi/error.tsx` |
| `(app)/tugas/page.tsx` | `(app)/tugas/loading.tsx` | `(app)/tugas/error.tsx` |
| `(app)/kontribusi/page.tsx` | `(app)/kontribusi/loading.tsx` | `(app)/kontribusi/error.tsx` |
| `(app)/pengaturan/page.tsx` | `(app)/pengaturan/loading.tsx` | `(app)/pengaturan/error.tsx` |
| `(app)/pengaturan/komponen/page.tsx` | `(app)/pengaturan/komponen/loading.tsx` | `(app)/pengaturan/komponen/error.tsx` |
| `(app)/share/page.tsx` | `(app)/share/loading.tsx` | `(app)/share/error.tsx` |
| `s/[token]/page.tsx` (Pembaca) | `s/[token]/loading.tsx` | `s/[token]/error.tsx` |
| `login/page.tsx` | tidak ada | tidak ada |

`login/page.tsx` tidak membaca data (hanya `searchParams`), jadi tidak wajib. Error di `(app)/layout.tsx` sendiri tidak ditangkap `(app)/error.tsx` (perilaku Next.js), dan tidak ada `global-error.tsx`.

### Tujuan link dan route yang ada

| Tujuan | Route di `src/app` |
|---|---|
| `/` (juga dari "Kembali ke dashboard" di halaman 404) | `(app)/page.tsx` |
| `/login`, `/login?error=...` | `login/page.tsx` |
| `/acara`, `/acara/baru`, `/acara/{id}` | `(app)/acara/page.tsx`, `(app)/acara/[id]/page.tsx` (menangani `baru`) |
| `/vendor`, `/vendor?kategori=&status=&acara=` | `(app)/vendor/page.tsx` |
| `/vendor/baru` | `(app)/vendor/baru/page.tsx` |
| `/vendor/{id}`, `/vendor/{id}/ubah` | `(app)/vendor/[id]/page.tsx`, `(app)/vendor/[id]/ubah/page.tsx` |
| `/vendor/{id}/paket/baru`, `/vendor/{id}/paket/{paketId}/ubah` | `(app)/vendor/[id]/paket/baru/page.tsx`, `(app)/vendor/[id]/paket/[paketId]/ubah/page.tsx` |
| `/komparasi`, `/komparasi/{kategoriId}` | `(app)/komparasi/page.tsx`, `(app)/komparasi/[kategoriId]/page.tsx` |
| `/tugas`, `/tugas?pic=&acara=&vendor=&status=` | `(app)/tugas/page.tsx` |
| `/kontribusi` | `(app)/kontribusi/page.tsx` |
| `/pengaturan`, `/pengaturan/komponen?kategori=&ubah=` | `(app)/pengaturan/page.tsx`, `(app)/pengaturan/komponen/page.tsx` |
| `/share` | `(app)/share/page.tsx` |
| `/s/{token}` (disalin dari halaman Share Link) | `s/[token]/page.tsx` |
| `/auth/callback` (redirect OAuth) | `auth/callback/route.ts` |
| Link luar: `wa.me`, alamat web vendor, signed URL lampiran | Dibuka di tab baru dengan `rel="noopener noreferrer"`. Alamat web vendor hanya jadi link kalau diawali `http://` atau `https://` |

### Kata `_Avoid_` di teks UI

Kata yang dicari: admin, user, akun, payer, sponsor, viewer, penonton, public link, link publik, event, hari H, TBD, tentatif, supplier, rekanan, tipe, jenis vendor, tahap, stage, penawaran, opsi, pricelist, fitur, spesifikasi, atribut, perbandingan, compare, paket final, deal, chat, riwayat, histori, invoice, tagihan, rincian, split, porsi, transaksi, cicilan, pending, rencana bayar, paid, outstanding, utang, selesai bayar, sumbangan, budget, pagu, aktual, spending, todo, task, assignee, penanggung jawab, deadline, due date, overdue, telat, guest, invitation, konfirmasi, item, produk, mas kawin, kategori tamu, jatah.

| Temuan | Keputusan |
|---|---|
| "Kontrak dibuat saat paket dipilih, atau saat vendor masuk **tahap** Survei/Nego." (`SeksiKontrak.tsx`) | **Diperbaiki**: "...atau saat status vendor menjadi Survei/Nego." |
| "Kontrak hanya bisa dibuat untuk vendor di **tahap** Survei/Nego atau Booked." (`kontrak/actions.ts`) | **Diperbaiki**: "...untuk vendor berstatus Survei/Nego atau Booked." Tidak ada test yang memakai teks ini |
| "Pilih paket di halaman **Bandingkan**" (`SeksiKontrak.tsx`) | Bukan kata `_Avoid_`, tetapi tidak ada halaman bernama Bandingkan. **Diperbaiki** menjadi "halaman Komparasi" |
| "**Akun** ini tidak terdaftar sebagai Editor." (login) | Positif palsu. "Akun" di sini berarti akun Google, bukan Editor. Teksnya ditetapkan plan Task 3 dan diuji `login.spec.ts` |
| "Chat WhatsApp" | Positif palsu. Tombol membuka chat WhatsApp, bukan Log Kontak. Ditetapkan plan Task 5 |
| Placeholder "Contoh: cek revisi **pricelist**" | Positif palsu. Merujuk dokumen pricelist dari vendor, seperti di PRD ("PDF pricelist"), bukan Paket |
| "Sisa **Tagihan**" | Istilah glosarium sendiri |
| Label "**Tipe**" di form Komponen | Positif palsu. "Tipe" dihindari untuk Kategori Vendor, bukan untuk tipe Komponen |
| "Buat follow-up", "Follow-up dari log kontak" | Diizinkan. `CONTEXT.md` menyebut follow-up sebagai salah satu jenis Tugas |
| "Bandingkan", "Bandingkan paket di kategori ini" | Kata kerja, bukan "perbandingan" atau "compare". Diuji `komparasi.spec.ts` |
| admin, user, opsi, rincian, split, item | Nama variabel atau class CSS, bukan teks UI |

## 3. Checklist elemen per halaman

Dicek 25 November 2026 di `next dev` dengan data uji dari `tests/gate/data.ts` (5 Vendor, 3 Paket, Kontrak dengan 3 Pembayaran, Log Kontak, Tugas, dan 2 Share Link). Viewport 375x812 dan 1280x800. Kode bukti di kolom Catatan:

- **S**: `tests/gate/gate.spec.ts`, sapu 35 URL di kedua viewport (70 tampilan). Per tampilan dicek: tanpa scroll horizontal, semua target ketuk minimal 44x44 px di 375px (checkbox diukur dari label pembungkusnya), semua link internal membalas 200, link `target="_blank"` memakai `rel="noopener"`, setiap elemen yang bisa difokus lewat Tab punya outline yang terlihat, dan tanpa error di console. Hasil: 0 temuan, 932 titik fokus, 612 link.
- **I**: `tests/gate/interaksi.spec.ts`, klik dan keyboard sungguhan di kedua viewport.
- **G**: `tests/gate/galat.spec.ts`, galat dipaksa dengan mencabut grant sebentar di project dev.
- **E**: `tests/e2e/*.spec.ts` (Desktop Chrome 1280x720, beberapa juga 375px). Untuk baris yang perilakunya hanya diuji E, kolom 375px berisi PASS dari S (tata letak, target ketuk, link, fokus), dan perilakunya diuji di desktop.

Jalankan ulang: `npx playwright test -c playwright.gate.config.ts`.

| Halaman | Elemen | Aksi yang diharapkan | 375px | Desktop | Catatan |
|---|---|---|---|---|---|
| Semua halaman `(app)` | Navigasi "Dashboard" | Ke `/`. Aktif: garis atas 3px dan huruf tebal | PASS | PASS | S. E "navigasi bawah menandai halaman aktif..." |
| Semua halaman `(app)` | Navigasi "Vendor" | Ke `/vendor`. Aktif juga di semua `/vendor/...` | PASS | PASS | S. I "menu Lainnya": aktif di `/vendor/{id}` |
| Semua halaman `(app)` | Navigasi "Tugas" | Ke `/tugas` | PASS | PASS | S. E "navigasi bawah..." |
| Semua halaman `(app)` | Navigasi "Kontribusi" | Ke `/kontribusi` | PASS | PASS | S. I "menu Lainnya" |
| Semua halaman `(app)` | Navigasi "Lainnya" | Membuka menu. Tertutup lagi lewat Escape (fokus kembali ke "Lainnya"), ketukan di luar menu, atau pindah halaman. Ditandai aktif kalau halaman sekarang ada di menu | PASS | PASS | E (klik di luar, Escape, tanda aktif). I (fokus kembali ke "Lainnya" setelah Escape, menu tertutup setelah pindah halaman) |
| Semua halaman `(app)` | Menu Lainnya: "Acara", "Komparasi", "Pengaturan", "Share Link" | Ke `/acara`, `/komparasi`, `/pengaturan`, `/share` | PASS | PASS | S. E (keempat link membalas 200). I (Share Link) |
| Semua halaman `(app)` | "Coba lagi" di tampilan error | Mengambil ulang data dan memuat ulang bagian halaman | PASS | PASS | G. **Sempat FAIL**: semua `error.tsx` memanggil `reset()`, yang di Next.js 16 tidak mengambil ulang data server, jadi halaman tetap error walaupun galatnya sudah hilang. Diganti `retry()` di 11 file. G diuji di 1280px, tombolnya sama di 375px (S) |
| `/login` | "Masuk dengan Google" | Label jadi "Mengalihkan ke Google...", tombol nonaktif, lalu ke layar Google. Setelah login kembali lewat `/auth/callback` ke `/` | PASS sebagian | PASS sebagian | I: label dan status nonaktif. Pengalihan ke Google dan kembali lewat callback hanya bisa dicek dengan OAuth sungguhan (`docs/deploy.md` langkah 10) |
| `/login?error=bukan-editor` | Pesan galat | Tampil "Akun ini tidak terdaftar sebagai Editor." | PASS | PASS | I. E "email di luar allowlist..." |
| `/login?error=gagal-masuk` | Pesan galat | Tampil "Gagal masuk. Coba lagi." | PASS | PASS | I |
| `/` Dashboard | "Tambah vendor" (tampilan kosong) | Ke `/vendor/baru`. Hanya tampil kalau belum ada Vendor dan belum ada Tugas sama sekali | PASS | PASS | E "tanpa data sama sekali..." |
| `/` Dashboard | Item Pembayaran Terjadwal lewat Jatuh Tempo | Tampil di kelompok Terlambat dengan judul "{Jenis} {Vendor}", nominal, dan label Terlambat. Hitungan kelompok bertambah satu | PASS | PASS | E "pembayaran terjadwal yang lewat jatuh tempo...". S dengan Termin terlambat di data uji |
| `/` Dashboard | "Selesai" di item Tugas | Menandai Tugas selesai, item hilang, hitungan kelompok berkurang, fokus pindah ke judul kelompok | PASS | PASS | E "selesai di tugas terlambat...". I (fokus ke judul "Terlambat") |
| `/` Dashboard | "Tandai dibayar" di item Pembayaran | Membuka atau menutup form di dalam kartu | PASS | PASS | I (`aria-expanded`) |
| `/` Dashboard | Form tandai dibayar: "Simpan" | Tanpa Pihak: pesan galat. Dengan Pihak: item hilang, fokus ke judul kelompok | PASS | PASS | I (tanpa Pihak). E "tandai dibayar dari dashboard..." |
| `/` Dashboard | Form tandai dibayar: "Batal" | Form tertutup, fokus kembali ke "Tandai dibayar" | PASS | PASS | I |
| `/` Dashboard | Link nama Vendor dan nama Acara di item | Ke `/vendor/{id}` dan `/acara/{id}` | PASS | PASS | I (Vendor). S (kedua link membalas 200, target 44px) |
| `/acara` | "Tambah acara" (atas dan di tampilan kosong) | Ke `/acara/baru` | PASS | PASS | S, E. Tampilan kosong tidak dicek: 4 Acara default selalu ada |
| `/acara` | "Ubah" per kartu | Ke `/acara/{id}` | PASS | PASS | S. **Sempat FAIL** di 375px: lebar 36px. `.tautan-aksi` diberi `min-width: 44px` |
| `/acara/baru` | "Simpan" | Menyimpan Acara lalu kembali ke `/acara`. Nama kosong ditolak browser (`required`) | PASS | PASS | E "menambah dan menghapus Acara..." |
| `/acara/baru` | "Kembali ke daftar acara" | Ke `/acara` | PASS | PASS | I |
| `/acara/{id}` | "Simpan" | Menyimpan perubahan lalu kembali ke `/acara` | PASS | PASS | E "mengubah tanggal dan lokasi...". I |
| `/acara/{id}` | "Hapus acara" | Membuka dialog konfirmasi | PASS | PASS | E, I |
| `/acara/{id}` | Dialog: "Hapus" | Menghapus lalu ke `/acara`. Acara yang dipakai Vendor menampilkan pesan galat di dialog | PASS | PASS | E (hapus). I dan E vendor "menghapus Acara yang dipakai vendor..." (pesan galat) |
| `/acara/{id}` | Dialog: "Batal" | Dialog tertutup | PASS | PASS | I. E (Escape) |
| `/acara/{id}` | "Kembali ke daftar acara" | Ke `/acara` | PASS | PASS | S |
| `/vendor` | "Tambah vendor" | Ke `/vendor/baru` | PASS | PASS | S. E "tambah vendor..." |
| `/vendor` | Filter Kategori, Status, Acara, lalu "Terapkan" | Memuat `/vendor?kategori=&status=&acara=` dengan pilihan tetap terpilih | PASS | PASS | E "filter lewat form memakai query string". S dengan filter terisi |
| `/vendor` | Tampilan kosong: "Lihat semua vendor" atau "Tambah vendor" | Dengan filter: ke `/vendor`. Tanpa filter: ke `/vendor/baru` | PASS | PASS | E "filter tanpa hasil...". S (`?kategori=Katering&status=batal`) |
| `/vendor` | "Lihat" per kartu | Ke `/vendor/{id}` | PASS | PASS | S. **Sempat FAIL** di 375px: lebar 35px, diperbaiki bersama "Ubah" Acara |
| `/vendor/baru` | Isian WhatsApp | Nomor tidak dikenali menampilkan "Nomor WhatsApp tidak dikenali" saat mengetik | PASS | PASS | E "nomor WhatsApp tidak dikenali..." |
| `/vendor/baru` | "Simpan" | Menyimpan Vendor dan Acara-nya, lalu ke `/vendor/{id}`. Gagal: pesan galat, isian tetap | PASS | PASS | E "tambah vendor..." |
| `/vendor/baru` | "Kembali ke daftar vendor" | Ke `/vendor` | PASS | PASS | S |
| `/vendor/{id}` | "Ubah status" + "Simpan status" | Tombol nonaktif selama status belum diganti. Simpan mengubah label status | PASS | PASS | I. E "mengubah status..." |
| `/vendor/{id}` | Link alamat web vendor | Membuka tab baru, hanya untuk `http(s)://` | PASS | PASS | I (`target="_blank"`, `rel="noopener"`). S: URL 104 karakter terpotong rapi, halaman tidak melebar di 375px |
| `/vendor/{id}` | "Chat WhatsApp" | Membuka `https://wa.me/62...` di tab baru. Tidak tampil kalau nomor tidak dikenali | PASS | PASS | I (`081...` jadi `wa.me/6281...`, nomor `12345` tanpa tombol). E |
| `/vendor/{id}` | "Ubah vendor" | Ke `/vendor/{id}/ubah` | PASS | PASS | I, S |
| `/vendor/{id}` | "Bandingkan paket di kategori ini" | Ke `/komparasi/{kategoriId}` | PASS | PASS | I, S |
| `/vendor/{id}` Paket | "Tambah paket" (kosong dan di bawah daftar) | Ke `/vendor/{id}/paket/baru` | PASS | PASS | S. E "tambah Komponen dan Paket..." |
| `/vendor/{id}` Paket | "Ubah paket" | Ke `/vendor/{id}/paket/{paketId}/ubah` | PASS | PASS | S |
| `/vendor/{id}` Paket, Kontrak, bukti | Isian "Unggah lampiran ..." | Memilih JPG, PNG, WEBP, atau PDF maks 10 MB. Tampil "Memproses...", lalu file muncul di daftar. Tipe atau ukuran salah: pesan galat | PASS | PASS | I (Paket). E paket "lampiran: unggah PNG..., file salah ditolak". E pembayaran "lampiran kontrak dan bukti..." |
| `/vendor/{id}` Paket, Kontrak, bukti | Link nama file lampiran | Membuka signed URL di tab baru | PASS | PASS | I (tab baru ke `/storage/v1/object/sign/...`) |
| `/vendor/{id}` Paket, Kontrak, bukti | "Hapus" lampiran, lalu dialog "Hapus" atau "Batal" | Dialog konfirmasi dengan nama file. Hapus menghilangkan file, Batal menutup dialog | PASS | PASS | I (Batal, nama file di dialog). E (Hapus) |
| `/vendor/{id}` Kontrak (belum ada) | "Buat kontrak" | Membuka form harga per Acara. Tampil kalau status Survei/Nego atau Booked dan Vendor punya Acara | PASS | PASS | I. E "kontrak manual untuk vendor tanpa paket..." |
| `/vendor/{id}` Kontrak (belum ada) | Form: "Simpan kontrak" dan "Batal" | Simpan membuat Kontrak dan Vendor jadi Booked. Batal menutup form | PASS | PASS | E (Simpan). I (Batal) |
| `/vendor/{id}` Kontrak (belum ada) | "Hubungkan ke acara" | Ke `/vendor/{id}/ubah`. Tampil kalau Vendor belum punya Acara | PASS | PASS | I |
| `/vendor/{id}` Kontrak | "Ubah harga per acara", lalu "Simpan harga" atau "Batal" | Form harga per Acara. Simpan memperbarui Total. Semua kosong: "Isi harga untuk minimal satu acara." | PASS | PASS | E "ubah harga per acara mengubah total". I (semua kosong, Batal) |
| `/vendor/{id}` Kontrak | "Ubah data kontrak", lalu "Simpan data kontrak" atau "Batal" | Form tanggal kesepakatan dan catatan | PASS | PASS | I |
| `/vendor/{id}` Pembayaran | "Tambah pembayaran" | Membuka form. Status Dibayar memunculkan Tanggal bayar dan Dibayar oleh | PASS | PASS | E "DP dibayar..." |
| `/vendor/{id}` Pembayaran | Form: "Simpan pembayaran" dan "Batal" | Simpan menambah baris dan memperbarui Sisa Tagihan. Gagal: pesan galat, isian tetap | PASS | PASS | E "form pembayaran menahan isian saat gagal..." |
| `/vendor/{id}` Pembayaran | "Tandai dibayar" per baris Terjadwal, lalu "Simpan" atau "Batal" | Form tanggal bayar dan Pihak. Simpan mengubah status jadi Dibayar | PASS | PASS | E (Simpan). I (Batal) |
| `/vendor/{id}` Pembayaran | "Ubah" per baris | Mengganti kartu dengan form berisi data baris itu | PASS | PASS | I. E "ubah pembayaran dan hapus..." |
| `/vendor/{id}` Pembayaran | "Hapus" per baris, lalu dialog "Hapus" atau "Batal" | Dialog dengan fokus di Batal. Hapus menghilangkan baris | PASS | PASS | E "...hapus lewat konfirmasi dengan fokus di Batal" |
| `/vendor/{id}` Pembayaran | "Bukti transfer (n)" | Membuka atau menutup bagian unggah bukti | PASS | PASS | I |
| `/vendor/{id}` Log Kontak | "Tambah log kontak", lalu "Simpan log kontak" atau "Batal" | Form tanggal, saluran, isi | PASS | PASS | E tugas "log kontak whatsapp dan follow-up..." |
| `/vendor/{id}` Log Kontak | "Lihat semua tugas" | Ke `/tugas` | PASS | PASS | I, S |
| `/vendor/{id}` Log Kontak | "Buat follow-up", lalu "Simpan tugas" atau "Batal" | Form judul, Jatuh Tempo, PIC. Tugas tampil di bawah log dan di `/tugas` | PASS | PASS | E tugas "log kontak whatsapp dan follow-up..." |
| `/vendor/{id}` Log Kontak | "Hapus", lalu dialog "Hapus" atau "Batal" | Menghapus log. Tugas follow-up tetap ada | PASS | PASS | I |
| `/vendor/{id}` | "Kembali ke daftar vendor" | Ke `/vendor` | PASS | PASS | I |
| `/vendor/{id}` tidak ada | "Kembali ke daftar vendor" | Ke `/vendor` | PASS | PASS | S |
| `/vendor/{id}/ubah` | "Simpan" | Menyimpan lalu ke `/vendor/{id}` | PASS | PASS | I "pelengkap" |
| `/vendor/{id}/ubah` | "Kembali ke detail vendor" | Ke `/vendor/{id}` | PASS | PASS | I "pelengkap" |
| `/vendor/{id}/paket/baru` dan `/ubah` | "Atur Komponen" | Ke `/pengaturan/komponen?kategori={id}` | PASS | PASS | I "pelengkap", S. Isian form yang belum disimpan tetap hilang saat pindah halaman (bagian 6) |
| `/vendor/{id}/paket/baru` dan `/ubah` | "Simpan paket" | Menyimpan Paket dan nilai Komponen, lalu ke `/vendor/{id}`. Harga tidak terbaca: pesan galat, isian tetap | PASS | PASS | E paket "tambah Komponen dan Paket...", "harga yang tidak bisa dibaca..." |
| `/vendor/{id}/paket/baru` dan `/ubah` | "Kembali ke detail vendor" | Ke `/vendor/{id}` | PASS | PASS | I "pelengkap", S |
| `/vendor/{id}/paket/...` tidak ada | "Kembali ke daftar vendor" | Ke `/vendor` | PASS | PASS | S |
| `/komparasi` | "Lihat vendor" (tampilan kosong) | Ke `/vendor` | PASS | PASS | E pembayaran "kontribusi kosong..." memakai pola yang sama. Tampilan kosong `/komparasi` sendiri tidak dicek: data uji selalu punya Paket |
| `/komparasi` | "Bandingkan" per kategori | Ke `/komparasi/{kategoriId}` | PASS | PASS | E "daftar kategori menampilkan jumlah paket...". S |
| `/komparasi/{kategoriId}` | Filter Acara, "Tampilkan vendor batal", "Terapkan" | Memuat `?acara=&batal=1` | PASS | PASS | E "filter acara dan toggle vendor batal". S |
| `/komparasi/{kategoriId}` | Tabel geser | Hanya tabel yang bergeser, kolom label menempel di kiri, halaman tidak melebar. Bisa digeser dengan keyboard setelah difokus | PASS | PASS | E 375px. I (fokus, panah kanan menggeser di 375px). S |
| `/komparasi/{kategoriId}` | Link nama Vendor di kepala kolom | Ke `/vendor/{id}` | PASS | PASS | S |
| `/komparasi/{kategoriId}` | "Pilih paket ini" | Membuka dialog. Vendor beberapa Acara: isian nominal per Acara. Tanpa Acara: penjelasan, tombol Pilih nonaktif | PASS | PASS | E "vendor satu acara...", "vendor dua acara..." |
| `/komparasi/{kategoriId}` | Dialog: "Pilih paket" dan "Batal" | Pilih menjadikan Paket Dipilih, Vendor Booked, Paket lain Tidak dipilih. Batal (fokus awal) menutup dialog | PASS | PASS | E (Pilih). I (fokus awal di Batal) |
| `/komparasi/{kategoriId}` | Tampilan kosong: "Lihat semua paket" atau "Lihat vendor" | Ke `/komparasi/{kategoriId}` atau `/vendor` | PASS | PASS | I "pelengkap" (keduanya) |
| `/komparasi/{kategoriId}` | "Kembali ke daftar kategori" | Ke `/komparasi` | PASS | PASS | I |
| `/komparasi/{kategoriId}` tidak ada | "Kembali ke komparasi" | Ke `/komparasi` | PASS | PASS | S |
| `/tugas` | Filter PIC, Acara, Vendor, Status, "Terapkan" | Memuat `/tugas?pic=&acara=&vendor=&status=` dengan pilihan tetap terpilih. Default status "Belum selesai". Id yang bukan uuid diabaikan | PASS | PASS | E "filter vendor...", "filter acara..., id tidak valid diabaikan". S dengan filter terisi |
| `/tugas` | Filter Acara | Hanya Tugas yang terkait Acara itu. Urutan pilihan sama dengan filter Vendor (tanggal, lalu nama) | PASS | PASS | E "filter acara..." |
| `/tugas` | Filter Vendor | Hanya Tugas yang terkait Vendor itu. Pilihan diurutkan per nama | PASS | PASS | E "filter vendor..." |
| `/tugas` | "Tambah tugas", lalu "Simpan tugas" atau "Batal" | Form di atas daftar. Judul kosong ditolak dengan pesan | PASS | PASS | E "...form menolak judul kosong" |
| `/tugas` | "Selesai" atau "Buka lagi" per Tugas | Mengubah status Tugas | PASS | PASS | E "tugas tanpa jatuh tempo, selesai, lalu dibuka lagi" |
| `/tugas` | "Ubah" per Tugas | Mengganti kartu dengan form. Tugas follow-up: Vendor terkunci | PASS | PASS | I |
| `/tugas` | "Hapus", lalu dialog "Hapus" atau "Batal" | Menghapus Tugas | PASS | PASS | I (fokus awal di Batal, Batal, Hapus) |
| `/tugas` | Link nama Vendor dan nama Acara | Ke `/vendor/{id}` dan `/acara/{id}` | PASS | PASS | S |
| `/tugas` | "Hapus filter" (tampilan kosong dengan filter) | Ke `/tugas` | PASS | PASS | I |
| `/kontribusi` | "Lihat vendor" (tampilan kosong) | Ke `/vendor` | PASS | PASS | E "kontribusi kosong menampilkan petunjuk dan link ke vendor" |
| `/kontribusi` | Ringkasan per Pihak | Membuka atau menutup rincian per Vendor | PASS | PASS | I |
| `/kontribusi` | Link nama Vendor di rincian | Ke `/vendor/{id}` | PASS | PASS | I |
| `/pengaturan` | "Ubah nama", lalu "Simpan nama" atau "Batal" | Form nama di dalam kartu, fokus langsung ke isian. Setelah ditutup fokus kembali ke "Ubah nama" | PASS | PASS | I (fokus). E "ganti nama Pihak..." (Simpan) |
| `/pengaturan` | "Arsipkan" atau "Aktifkan lagi" | Mengubah status arsip, label "Diarsipkan" muncul atau hilang | PASS | PASS | E "arsipkan Kategori..." |
| `/pengaturan` | "Hapus", lalu dialog "Hapus" atau "Batal" | Hanya untuk item yang belum dipakai. Setelah dihapus fokus ke judul section | PASS | PASS | E "...yang dipakai tidak bisa dihapus...". I (fokus ke judul section, Kategori) |
| `/pengaturan` | "Tambah pihak" dan "Tambah kategori" | Menambah item. Nama ganda ditolak dengan pesan | PASS | PASS | E (Pihak, nama ganda). I "pelengkap" (Kategori) |
| `/pengaturan` | "Atur komponen pembanding" | Ke `/pengaturan/komponen` | PASS | PASS | E "tautan Komponen pembanding..." |
| `/pengaturan/komponen` | Pilih Kategori, lalu "Pilih" | Memuat `?kategori={id}` | PASS | PASS | E paket "tambah Komponen..." |
| `/pengaturan/komponen` | "Naik" dan "Turun" | Menggeser urutan. Nonaktif di baris pertama dan terakhir | PASS | PASS | E "urutan Komponen bisa digeser...". I (nonaktif di ujung) |
| `/pengaturan/komponen` | "Ubah" per Komponen | Ke `?kategori={id}&ubah={komponenId}`, form berisi data Komponen | PASS | PASS | I |
| `/pengaturan/komponen` | "Hapus", lalu dialog "Hapus" atau "Batal" | Dialog menyebut jumlah Paket yang nilainya ikut terhapus | PASS | PASS | I ("2 paket"). E "menghapus Komponen yang sudah berisi..." |
| `/pengaturan/komponen` | "Simpan komponen" dan "Batal ubah" | Simpan menambah atau mengubah. Batal ubah ke `?kategori={id}` | PASS | PASS | E (Simpan). I (Batal ubah) |
| `/pengaturan/komponen` | "Kembali ke pengaturan" | Ke `/pengaturan` | PASS | PASS | I |
| `/share` | "Buat link" | Membuat Share Link. Keuangan tidak tercentang secara default. Nama kosong atau tanpa bagian ditolak dengan pesan | PASS | PASS | E "share link default tanpa keuangan...", "form menolak nama link kosong dan tanpa bagian" |
| `/share` | Kotak link | Teks terpilih saat difokus | PASS | PASS | I (diketuk sungguhan, seluruh teks terpilih) |
| `/share` | "Salin link" | Menyalin alamat lengkap, tampil "Link disalin". Clipboard ditolak: teks dipilih dan pesan salin manual | PASS | PASS | E "salin link menampilkan 'Link disalin'". Jalur clipboard ditolak tidak dipaksa terpisah |
| `/share` | "Cabut", lalu dialog "Cabut" atau "Batal" | Link jadi "Dicabut", kotak link hilang, fokus ke judul kartu | PASS | PASS | E "...lalu dicabut". I (fokus ke judul kartu) |
| `/s/{token}` | (tidak ada tombol atau link) | Menampilkan label dan bagian yang dicentang saja. Token dicabut atau tidak ada: "Link ini sudah tidak aktif." | PASS | PASS | E share. S (link aktif dan dicabut, tanpa sesi) |
| `/s/{token}` | "Coba lagi" di tampilan error | Mengambil ulang data | PASS | PASS | G. Sempat FAIL, diperbaiki bersama baris "Coba lagi" di atas |
| URL yang tidak cocok dengan route mana pun | "Kembali ke dashboard" | Halaman 404 Indonesia tanpa navigasi bawah, judul tab "Halaman tidak ditemukan \| Rendy & Dinar". Link ke `/`. Belum login: `(app)/layout.tsx` mengalihkan ke `/login` | PASS | PASS | I (judul tab, tanpa navigasi, link). S |
| `/acara/{id}` tidak ada | "Kembali ke daftar acara" | "Acara tidak ditemukan" dengan navigasi bawah. Link ke `/acara` | PASS | PASS | I, S |

Route tanpa tampilan: `/auth/callback` (menukar code, memanggil `pastikan_editor()`, lalu ke `/` atau `/login?error=...`) dan `/api/dev-login` (404 di produksi). Keduanya dicek lewat langkah 10 di `docs/deploy.md`.

Cek visual di browser pane (375px: `/`, `/vendor`, `/vendor/{id}`; desktop: `/komparasi/{kategoriId}`): tidak ada yang terpotong atau bertumpuk. Kotak pilih file memakai teks bawaan browser ("Choose Files" di Chrome berbahasa Inggris). Di HP dengan bahasa Indonesia teks ini ikut bahasa perangkat, jadi tidak dianggap FAIL.

## 4. Test yang dijalankan

Dijalankan 25 November 2026 dengan `.env.local` berisi key project dev dan CLI ter-link ke project dev (`rendy-dinar-dev`).

| Perintah | Isi | Hasil | Status |
|---|---|---|---|
| `npx supabase db reset --linked` | Migration `0001` sampai `0006` | Tanpa error. Data default: 5 Pihak, 4 Acara, 13 Kategori Vendor, bucket `lampiran` | PASS |
| `npx supabase gen types typescript --linked` | Types dari skema terbaru | Sama persis dengan `src/lib/database.types.ts` (`diff -w` kosong), tidak perlu commit | PASS |
| `npx tsc --noEmit` | Seluruh project | 0 error | PASS |
| `npm run lint` | ESLint | 0 error | PASS |
| `npx vitest run` | 18 file, 149 test (`tests/unit` dan `tests/db`) | 149 PASS | PASS |
| `npx playwright test` | 11 file, 61 test | 61 PASS. Sebagian lulus di retry kedua, semuanya karena rate limit Supabase Auth di project dev (bagian 6) | PASS |
| `npx playwright test -c playwright.gate.config.ts` | `tests/gate`: sapu 35 URL, 34 test interaksi, 2 test galat | 39 PASS | PASS |
| `npm run build` | Build produksi | Sukses, tanpa warning TypeScript, output menyebut `Proxy (Middleware)` | PASS |

Dua test di `tests/` diperbaiki sebelum lulus (commit `5b863d3`). Penyebabnya ada di test, bukan aplikasi:

- `tests/db/agenda.test.ts`: bulk insert supabase-js mengirim kolom yang tidak diisi sebagai `null`, sehingga default `status` tidak terpakai. Ditambah `{ defaultToNull: false }`.
- `tests/e2e/acara.spec.ts`: `allTextContents()` tidak menunggu, sehingga bisa terbaca saat `loading.tsx` masih tampil. Diganti `toHaveText()`.

## 5. Kriteria selesai Fase 1 (PRD)

| No | Kriteria | Implementasi (commit dan file) | Test yang mencakup | Status |
|---|---|---|---|---|
| 1 | Rendy dan Dinar bisa login dari HP masing-masing dan melihat data yang sama | `7ff0ea9`, `975fb7c`. `supabase/migrations/0001_dasar.sql` (`is_editor()`, `pastikan_editor()`, RLS), `src/app/login/*`, `src/app/auth/callback/route.ts`, `src/proxy.ts` (dulu `middleware.ts` di root, tidak terbaca), `src/lib/supabase/*`, `src/app/(app)/layout.tsx`. Semua data dibaca lewat RLS yang sama untuk kedua Editor | `tests/db/akses.test.ts`, `tests/e2e/login.spec.ts` ("setelah dev-login..."). E2E memakai `/api/dev-login`, bukan Google sungguhan | PASS di dev (dev-login, RLS sama untuk kedua Editor). Login Google asli dan sesi lebih dari 1 jam dicek di produksi (`docs/deploy.md` langkah 10) |
| 2 | Email Google lain ditolak | Sama dengan nomor 1. Callback memanggil `signOut()` lalu ke `/login?error=bukan-editor` | `tests/db/akses.test.ts` ("orang luar tidak bisa membaca apa pun", "email di allowlist tapi belum terkonfirmasi bukan editor", "anon tidak bisa memanggil pastikan_editor"), `tests/e2e/login.spec.ts` ("email di luar allowlist ditolak dengan pesan") | PASS di dev (`tests/db/akses.test.ts`, `tests/e2e/login.spec.ts`). Penolakan akun Google asli dicek di produksi |
| 3 | Semua vendor Lamaran yang sudah ada bisa diinput lengkap dengan Kontrak dan Pembayarannya | `28b8b18`, `f865d47`, `5f870ee`, `0274cf3`, `217e632`, `6798fa1`, `c7dc219`, `13dd3f3`. Migration `0002_vendor.sql`, `0003_keuangan.sql`, halaman `src/app/(app)/vendor/**` | `tests/e2e/vendor.spec.ts`, `paket.spec.ts`, `pembayaran.spec.ts`, `tests/db/vendor.test.ts`, `paket.test.ts`, `keuangan.test.ts`, `kontrak-fungsi.test.ts` | PASS untuk alurnya (test di kolom sebelah dan `tests/gate`). Input data vendor Lamaran asli dikerjakan Rendy |
| 4 | Komparasi menampilkan minimal tiga Paket dari Vendor berbeda secara sejajar per Komponen, dan terbaca di layar HP | `481ee0f`. `src/app/(app)/komparasi/[kategoriId]/page.tsx`, `.tabel-geser` dan `.tabel-komparasi` di `globals.css` | `tests/e2e/komparasi.spec.ts` ("375px: baris berurutan, sel kosong, geser horizontal hanya di tabel, label tetap terlihat", memakai Paket A, B, C) | PASS. Tiga Paket dari tiga Vendor sejajar di 375px dan desktop (E komparasi 375px, `tests/gate`) |
| 5 | Pembayaran Terjadwal yang lewat Jatuh Tempo muncul di kelompok Terlambat | `fded50d`, `bf9ae6a`. View `agenda` di `0004_tugas.sql`, `kelompokJatuhTempo()` di `src/lib/tanggal.ts`, `src/app/(app)/page.tsx` | `tests/unit/tanggal.test.ts` ("mengelompokkan tanggal jatuh tempo"), `tests/db/agenda.test.ts` ("pembayaran terjadwal tampil..."), `tests/e2e/dashboard.spec.ts` ("pembayaran terjadwal yang lewat jatuh tempo masuk kelompok terlambat": Pelunasan dengan Jatuh Tempo kemarin, tanggal Jakarta, tampil di Terlambat dengan judul "Pelunasan Uji Venue Agenda" dan "Rp 5.000.000"). Celah sebelumnya (e2e Terlambat hanya memakai Tugas) sudah ditutup di kode | PASS (unit, db, e2e, dan Termin terlambat di data uji `tests/gate`) |
| 6 | Rekap Kontribusi per Pihak sama dengan hasil hitung manual | `c7dc219`. View `kontribusi_pihak` dan `kontribusi_pihak_vendor` di `0003_keuangan.sql`, `src/app/(app)/kontribusi/page.tsx` | `tests/db/keuangan.test.ts` ("kontribusi per pihak"), `tests/e2e/pembayaran.spec.ts` ("DP dibayar, ... dan kontribusi") | PASS untuk hitungan di test. Pembandingan dengan hitungan manual dari data asli dikerjakan Rendy |
| 7 | Share Link tanpa centang Keuangan tidak memuat nominal apa pun, termasuk di response API | `5e311f7`, `957ce5e`, `1279d4f`. `baca_share_link()` di `0005_share_link.sql`, `src/app/s/[token]/page.tsx`, `src/lib/supabase/anon.ts` | `tests/db/share.test.ts` ("tanpa keuangan...", "kunci hasil persis sesuai bagian"), `tests/e2e/share.spec.ts` ("share link default tanpa keuangan...", mengecek teks halaman dan response mentah tidak memuat "Rp") | PASS (`tests/db/share.test.ts`, `tests/e2e/share.spec.ts`, termasuk response mentah tanpa "Rp") |
| 8 | Lolos Delivery Gate antislop | Laporan ini | Bagian 1 sampai 4 | LULUS untuk semua yang bisa dicek di dev (bagian 3, 4, 6) |

## 6. Risiko dan catatan

### Temuan Delivery Gate 25 November 2026 (sudah diperbaiki dan diverifikasi)

1. **"Coba lagi" tidak memulihkan halaman.** Semua `error.tsx` (11 file) memanggil `reset()`. Di Next.js 16, `reset()` hanya merender ulang tanpa mengambil ulang data server, jadi setelah galat sementara (jaringan, Supabase) halaman tetap menampilkan pesan error. Dibuktikan di `tests/gate/galat.spec.ts`: grant dicabut, halaman error, grant dikembalikan, lalu "Coba lagi" tetap gagal. Diganti `retry()` (stabil sejak Next.js 16.3), test sekarang PASS untuk halaman Editor dan Pembaca.
2. **Target ketuk "Ubah" (Acara) dan "Lihat" (Vendor) hanya selebar 35 sampai 36px.** Tingginya sudah 44px, dan test e2e lama hanya mengukur tinggi. `.tautan-aksi` diberi `min-width: 44px`. Sapu `tests/gate` sekarang mengukur lebar dan tinggi.
3. **Test yang salah, bukan aplikasi:** `tests/db/agenda.test.ts` dan `tests/e2e/acara.spec.ts` (bagian 4).

### Catatan dari Delivery Gate 25 November 2026

- **Rate limit Supabase Auth di project dev.** Setiap test e2e login ulang lewat `/api/dev-login`, yang memanggil `verifyOtp`. Setelah sekitar 4 login berturut-turut, Supabase membalas `429 over_request_rate_limit`, route membalas 404, dan test menunggu sampai timeout lalu lulus di retry. Ini penyebab test e2e "flaky". Pilihan: naikkan batas "token verifications" di Authentication > Rate Limits project dev, atau pakai ulang sesi login (`storageState`) per file test. Aplikasi produksi tidak terpengaruh, karena satu login Google hanya satu verifikasi.
- **Teks kotak pilih file** mengikuti bahasa browser ("Choose Files" di Chrome berbahasa Inggris). Di HP berbahasa Indonesia teksnya ikut bahasa perangkat.
- **Clipboard ditolak** pada "Salin link" tidak dipaksa terpisah. Jalur "Link disalin" dicek E dan I.
- **Tampilan kosong `/acara` dan `/komparasi`** tidak dicek: 4 Acara default selalu ada, dan data uji selalu punya Paket.



### FAIL yang ditemukan dan belum diperbaiki

Tidak ada. Semua temuan sudah diperbaiki dan diverifikasi pada 25 November 2026, kecuali yang hanya bisa dicek di produksi.

### FAIL dan celah dari 24 November 2026 (sekarang terverifikasi)

Diperbaiki di commit "fix: tutup celah delivery gate fase 1". Pada 25 November 2026 semuanya diverifikasi lewat test dan checklist bagian 3, kecuali sesi lebih dari 1 jam (nomor 5) dan tampilan placeholder di Safari dan Firefox (nomor 6), yang dicek di produksi.

1. **Halaman 404 bawaan Next.js berbahasa Inggris.** Ditambah `src/app/not-found.tsx`: judul "Rendy & Dinar", pesan "Halaman tidak ditemukan.", link "Kembali ke dashboard" ke `/`. Memakai class baru `.halaman-mandiri` (lebar dan padding sama dengan `.halaman-pembaca`), tanpa navigasi bawah. `not-found.tsx` yang sudah ada di `vendor/[id]`, `vendor/[id]/paket`, dan `komparasi/[kategoriId]` tidak diubah. Di commit kedua `/acara/{id}` mendapat `not-found.tsx` sendiri (lihat nomor 7), jadi halaman root hanya untuk URL yang tidak cocok dengan route mana pun.
2. **Filter Tugas belum sesuai PRD.** `/tugas` sekarang punya filter PIC, Acara, Vendor, dan Status (`?pic=&acara=&vendor=&status=`). Id Acara dan Vendor dicek dengan `adalahUuid()`, nilai lain diabaikan. Keduanya ikut dihitung di `adaFilter`, jadi tampilan kosong menawarkan "Hapus filter". Pilihan Acara diurutkan per tanggal lalu nama, Vendor per nama, sama dengan form Tugas. Class `.filter-dua` diganti `.filter-empat`: satu kolom di bawah 560px, dua kolom di atasnya dengan "Terapkan" di baris sendiri. Test baru di `tugas.spec.ts`: "filter vendor..." dan "filter acara...".
3. **E2E Pembayaran Terjadwal di kelompok Terlambat.** `dashboard.spec.ts` menambah kasus Pelunasan dengan Jatuh Tempo kemarin (tanggal Jakarta). Helper `pelunasanHariIni()` diganti `pelunasanTerjadwal(geserHari = 0)`, hitungan dasar dan pembersihan memakai cara yang sudah ada.
4. **Tap target link alamat web vendor.** Diberi `tautan-aksi` di `vendor/[id]/page.tsx`.

Diperbaiki di commit "fix: pindahkan proxy ke src dan rapikan panduan deploy", juga hanya dicek sintaksnya:

5. **Refresh sesi tidak pernah berjalan.** `middleware.ts` ada di root, padahal aplikasi memakai `src/app`. Next.js hanya membaca file middleware atau proxy di `src/` kalau folder `src` dipakai, jadi file itu diabaikan dan token Supabase tidak di-refresh di setiap request. Server Component tidak bisa menulis cookie, jadi sesi kemungkinan besar putus setelah access token kedaluwarsa (bawaan 1 jam). Dipindah dengan `git mv` ke `src/proxy.ts`, fungsi diganti nama menjadi `proxy` sesuai konvensi Next.js 16 (runtime Node.js), `config.matcher` dan perilakunya sama, tetap memanggil `updateSession()` dari `src/lib/supabase/middleware.ts`. `docs/deploy.md` langkah 10 menambah cek "tetap login lebih dari 1 jam". Komentar di `src/lib/supabase/server.ts` dan struktur file di `docs/plans/fase-1.md` ikut diperbarui.
6. **Kontras placeholder bergantung browser.** `globals.css` sekarang punya `::placeholder { color: var(--teks-lembut); opacity: 1; }`. `opacity: 1` menimpa opacity bawaan Firefox. Rasio 10.10:1 di atas `#fff`, sama di semua browser. Tampilan di Safari dan Firefox, dan apakah placeholder masih terlihat berbeda dari isian asli (`--teks`), BELUM DIVERIFIKASI.
7. **`/acara/{id}` tidak ada.** Ditambah `(app)/acara/[id]/not-found.tsx` yang sama dengan versi Vendor: judul "Acara tidak ditemukan", "Acara ini tidak ada atau sudah dihapus.", dan `tautan-aksi` "Kembali ke daftar acara" ke `/acara`. Navigasi bawah tetap tampil.
8. **Judul tab halaman 404.** `src/app/not-found.tsx` mengekspor `metadata` dengan judul "Halaman tidak ditemukan | Rendy & Dinar". Ditulis lengkap karena layout root memakai judul biasa tanpa template.
9. **Angka kontras tombol nonaktif.** Dihitung ulang: `.tombol-utama:disabled` 4.88 (sebelumnya tertulis 4.87) dan `.tombol-bahaya:disabled` 4.46 (sebelumnya 4.45). Kesimpulannya tidak berubah.
10. **Panduan deploy.** Urutan `docs/deploy.md` diubah: project Vercel dibuat dulu untuk mendapat domain (langkah 3), lalu link, `db push`, dan link kembali ke dev (langkah 4), data Editor dan cek Storage (5 dan 6), Google OAuth (7), URL Auth Supabase (8), lalu env dan deploy ulang (9). Catatan "pastikan langkah 3 dan 4 memakai domain yang sama" dihapus karena domain sudah pasti sejak awal. Penjelasan Redirect URL yang hilang dikoreksi: pengguna kembali ke `/login` tanpa pesan apa pun, bukan "Gagal masuk. Coba lagi."

### Perbaikan kecil di commit Task 14 (`5155149`)

- `SeksiKontrak.tsx`: "tahap Survei/Nego" menjadi "status vendor menjadi Survei/Nego", dan "halaman Bandingkan" menjadi "halaman Komparasi".
- `kontrak/actions.ts`: pesan galat "di tahap Survei/Nego atau Booked" menjadi "berstatus Survei/Nego atau Booked".
- `acara/[id]/page.tsx`: dua link "Kembali ke daftar acara" diberi `tautan-aksi` (tap target 44px).
- `tugas/DaftarTugas.tsx`: link nama Vendor dan nama Acara diberi `tautan-aksi`, sama dengan item dashboard.
- `globals.css`: `.tombol-sekunder:disabled` diberi `opacity: 0.7; cursor: not-allowed`, supaya "Simpan status", "Naik", dan "Turun" yang nonaktif terlihat nonaktif.

Semuanya ikut dicek di tabel bagian 3 dan test bagian 4 pada 25 November 2026: PASS.

### Risiko teknis

- **`src/lib/database.types.ts` sempat diedit tangan.** Sudah dicek 25 November 2026 setelah `db reset`: hasil `gen types` sama persis dengan file ini. Tetap generate ulang setiap ada migration baru.
- **Klien Supabase tanpa generic `Database`.** `src/lib/supabase/server.ts` dan `browser.ts` memanggil `createServerClient(...)` dan `createBrowserClient(...)` tanpa `<Database>`, jadi hampir semua query di aplikasi tidak dicek tipe (hasilnya `any`). Hanya `src/lib/supabase/anon.ts` yang memakai `Database`. Saran: tambahkan `createServerClient<Database>(...)` dan `createBrowserClient<Database>(...)` setelah types digenerate ulang, lalu perbaiki semua yang dilaporkan `npx tsc --noEmit`. Kemungkinan besar akan ada error baru, misalnya di embed relasi dan kolom view yang nullable.
- **Migration diubah di tempat.** Project dev sudah di-`db reset --linked` pada 25 November 2026, `0001` sampai `0006` berjalan tanpa error, dan semua test lulus terhadap skema itu. Setelah deploy pertama, perubahan hanya lewat migration baru (`docs/deploy.md` langkah 11).
- **`db reset --linked` setelah link ke produksi akan menghapus data asli.** `docs/deploy.md` meminta link kembali ke dev setelah `db push` dan mengecek `supabase/.temp/project-ref`.
- **Env Preview di Vercel.** Kalau key produksi juga diisi untuk Preview, branch preview menulis ke data asli. `docs/deploy.md` meminta env hanya untuk Production.
- **`SUPABASE_SERVICE_ROLE_KEY` tidak dibutuhkan di produksi.** Di kode aplikasi key ini hanya dibaca `src/app/api/dev-login/route.ts`, yang sudah 404 di produksi (`NODE_ENV === 'production'`) sebelum key dipakai. Pemakaian lain hanya di `tests/db/helpers.ts`.
- **PWA belum punya ikon.** `manifest.webmanifest` sengaja tanpa ikon (plan Task 1, menunggu keputusan logo, R-23). Chrome Android biasanya baru menawarkan install kalau manifest punya ikon, jadi "PWA yang bisa di-install" perlu dicek di HP.
- **Proxy refresh sesi.** `src/proxy.ts` sekarang terbaca (build menyebut `Proxy (Middleware)`) dan semua test e2e lulus dengan proxy aktif. Sesi yang bertahan lebih dari 1 jam baru bisa dicek di produksi (`docs/deploy.md` langkah 10 nomor 9).
- **Link "Atur Komponen" di form Paket** membuka halaman lain, jadi isian Paket yang belum disimpan hilang.
- **Commit `4c8e934` bernama "initial commit"** di tengah riwayat dan tidak mengikuti format Conventional Commits. Hanya catatan.
