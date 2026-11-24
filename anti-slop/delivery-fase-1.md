# Delivery Gate Fase 1

**Status: BELUM LULUS: menunggu verifikasi manual Rendy**

Laporan ini disusun pada 24 November 2026 (Task 14) tanpa menjalankan apa pun: tidak ada `node_modules`, tidak ada akses ke Supabase atau Vercel, dan tidak ada browser. Yang ditandai PASS atau FAIL di bawah hanya yang benar-benar dicek, yaitu hitungan kontras dan pemeriksaan statis lewat `grep` dan membaca kode. Semua yang butuh aplikasi berjalan ditandai BELUM DICEK, BELUM DIJALANKAN, atau BELUM DIVERIFIKASI.

Pembaruan (commit "fix: tutup celah delivery gate fase 1"): halaman 404 Indonesia, filter Acara dan Vendor di Tugas, test e2e Pembayaran Terjadwal di kelompok Terlambat, dan tap target link alamat web vendor sudah diperbaiki di kode. Semuanya baru dicek sintaksnya, belum dijalankan di browser atau lewat test, jadi tetap BELUM DIVERIFIKASI. Rinciannya di bagian 6.

Gate ini baru lulus kalau semua test di bagian 4 PASS, tabel elemen di bagian 3 terisi tanpa FAIL di 375px dan desktop, dan temuan FAIL di bagian 6 sudah diperbaiki atau diputuskan Rendy.

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
| `--teks-lembut` di atas `#fff` | 10.10 | 4.5 | PASS | Belum dipakai |
| `--primary` di atas `#fff` | 10.11 | 4.5 | PASS | Belum dipakai |
| `#fff` di atas `--primary` (`.tombol-utama`) | 10.11 | 4.5 | PASS | |
| `.tombol-utama:disabled` (opacity 0.7 di atas `--bg`) | 4.87 | 4.5 | PASS | |
| `.tombol-bahaya:disabled` (opacity 0.7) | 4.45 | 4.5 | Di bawah batas, dikecualikan | Kontrol nonaktif dikecualikan WCAG 1.4.3. Dicatat apa adanya |
| `.tombol-sekunder:disabled` (opacity 0.7, baru di commit ini) | 5.37 | 4.5 | PASS | |
| `--garis` `#8a7a7d` di atas `--bg` (batas kartu, tombol sekunder) | 3.58 | 3 | PASS | |
| `--garis` di atas `#fff` (batas isian) | 4.07 | 3 | PASS | |
| `--garis` di atas `--surface` (garis sel kolom terpilih) | 2.31 | 3 | Di bawah batas, dekoratif | Garis antar sel tabel bukan batas komponen yang wajib 3:1. Kolom dibedakan oleh latar dan label "Dipilih" |
| `--primary` di atas `--bg` (garis fokus, bingkai Terlambat, bingkai dialog) | 8.90 | 3 | PASS | |
| `--primary` di atas `--surface` (garis fokus di kolom terpilih) | 5.75 | 3 | PASS | |
| `--accent` di atas `--bg` (bingkai `.pesan-berhasil`) | 5.20 | 3 | PASS | |
| Bingkai dialog `--primary` di atas backdrop (`--teks` 50% di atas `--bg`) | 2.95 | 3 | Di bawah batas, info | Tepi dialog tetap terlihat dari latar dialog `--bg` terhadap backdrop: 3.01 (PASS) |
| `--garis` sebagai teks | 3.58 | 4.5 | FAIL, tidak dipakai | `grep` tidak menemukan `color: var(--garis)` |
| Placeholder bawaan Chromium `#757575` di atas `#fff` | 4.61 | 4.5 | PASS | Warna placeholder tidak diatur di CSS |
| Placeholder bawaan WebKit `darkGray` `#a9a9a9` di atas `#fff` | 2.35 | 4.5 | **FAIL** | Berlaku kalau Safari memakai nilai bawaan ini. Nilai pasti di iOS belum dicek |
| Placeholder bawaan Firefox (teks 54%) di atas `#fff` | 3.49 | 4.5 | **FAIL** | |

Teks besar (judul Cormorant 1.375rem sampai 2rem) semuanya memakai `--primary` di atas `--bg` (8.90), jadi lolos batas teks normal sekalipun.

## 2. Pemeriksaan statis

| Cek | Hasil | Bukti |
|---|---|---|
| Tidak ada em dash di `src`, `tests`, `docs`, `DESIGN.md`, `CONTEXT.md`, migration, `public` | PASS | `grep -rn` untuk karakter em dash (U+2014) hanya menemukan `docs/plans/fase-1.md:24`, yaitu aturan yang menyebut karakternya. Tidak ada en dash. File baru di commit ini juga dicek: 0 hasil |
| Tidak ada em dash di pesan commit | PASS | `git log --format=%B` disaring dengan `grep -c` untuk U+2014: 0 |
| Tidak ada `outline: none` tanpa pengganti | PASS | `grep -rn outline src` hanya menemukan `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }` dan `.navigasi-bawah :focus-visible { outline-offset: -4px }` |
| Setiap halaman data punya `loading.tsx` dan `error.tsx` | PASS | Lihat daftar di bawah. Boundary di folder induk berlaku untuk halaman di bawahnya |
| Halaman 404 berbahasa Indonesia | Diperbaiki, BELUM DIVERIFIKASI | Sebelumnya FAIL: tidak ada `src/app/not-found.tsx`. Sekarang ada, berisi judul "Rendy & Dinar", pesan "Halaman tidak ditemukan.", dan link "Kembali ke dashboard" ke `/`. Halaman ini menangani URL yang tidak ada dan `notFound()` di `/acara/[id]`. Dirender di layout root, jadi tanpa navigasi bawah. `vendor/[id]` (termasuk `vendor/[id]/ubah`), `vendor/[id]/paket`, dan `komparasi/[kategoriId]` tetap memakai `not-found.tsx` sendiri |
| Tidak ada link ke route yang tidak ada | PASS | Semua `href`, `redirect()`, `router.push/replace`, dan `action` form dicocokkan ke `page.tsx`. Daftar di bawah |
| Kata dari daftar `_Avoid_` `CONTEXT.md` di teks UI | PASS setelah perbaikan | Dua teks memakai "tahap" (dihindari untuk Status Vendor), diperbaiki di commit ini. Sisanya positif palsu, lihat di bawah |
| Warna hanya dari token | PASS dengan catatan | `grep -rnoE "#[0-9a-fA-F]{3,8}"` di `src` dan `public`: selain token di `:root`, hanya `#fff` (6 kali di `globals.css`), `rgb(43 35 37 / 0.5)` untuk backdrop, serta `#80172c` dan `#f5efef` literal di `layout.tsx` (`themeColor`) dan `manifest.webmanifest`. Semuanya sekarang tercatat di `DESIGN.md` beserta alasan dan kontrasnya |
| Satu-satunya inline style | Dicatat | `src/app/login/page.tsx`: `padding: 2rem 1rem; maxWidth: 480; margin: 0 auto`. Nilainya dicatat di `DESIGN.md` bagian Layout |
| Tap target 44px untuk link yang berdiri sendiri | PASS setelah perbaikan, BELUM DIVERIFIKASI | Empat link tanpa class 44px diberi `tautan-aksi` di commit Task 14. Sisa terakhir, link alamat web vendor di `<dd>` detail Vendor (`vendor/[id]/page.tsx`), sekarang juga memakai `tautan-aksi`. URL panjang tetap bisa patah baris karena `.rincian dd` memakai `overflow-wrap: anywhere`. Cek di 375px |
| Tombol nonaktif terlihat nonaktif | PASS setelah perbaikan | `.tombol-sekunder` tidak punya gaya `:disabled`, sehingga "Simpan status", "Naik", dan "Turun" yang nonaktif terlihat sama dengan yang aktif. Ditambah `opacity: 0.7; cursor: not-allowed` di commit ini |
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

Kolom "Aksi yang diharapkan" diisi dari kode. Kolom 375px dan Desktop diisi Rendy setelah mengklik setiap elemen di `next dev` (atau produksi): tulis PASS atau FAIL dan catatannya.

| Halaman | Elemen | Aksi yang diharapkan | 375px | Desktop | Catatan |
|---|---|---|---|---|---|
| Semua halaman `(app)` | Navigasi "Dashboard" | Ke `/`. Aktif: garis atas 3px dan huruf tebal | BELUM DICEK | BELUM DICEK | |
| Semua halaman `(app)` | Navigasi "Vendor" | Ke `/vendor`. Aktif juga di semua `/vendor/...` | BELUM DICEK | BELUM DICEK | |
| Semua halaman `(app)` | Navigasi "Tugas" | Ke `/tugas` | BELUM DICEK | BELUM DICEK | |
| Semua halaman `(app)` | Navigasi "Kontribusi" | Ke `/kontribusi` | BELUM DICEK | BELUM DICEK | |
| Semua halaman `(app)` | Navigasi "Lainnya" | Membuka menu. Tertutup lagi lewat Escape (fokus kembali ke "Lainnya"), ketukan di luar menu, atau pindah halaman. Ditandai aktif kalau halaman sekarang ada di menu | BELUM DICEK | BELUM DICEK | |
| Semua halaman `(app)` | Menu Lainnya: "Acara", "Komparasi", "Pengaturan", "Share Link" | Ke `/acara`, `/komparasi`, `/pengaturan`, `/share` | BELUM DICEK | BELUM DICEK | |
| Semua halaman `(app)` | "Coba lagi" di tampilan error | Memanggil `reset()` dan memuat ulang bagian halaman | BELUM DICEK | BELUM DICEK | Perlu memaksa error, misalnya mematikan jaringan |
| `/login` | "Masuk dengan Google" | Label jadi "Mengalihkan ke Google...", tombol nonaktif, lalu ke layar Google. Setelah login kembali lewat `/auth/callback` ke `/` | BELUM DICEK | BELUM DICEK | Hanya bisa dicek dengan OAuth sungguhan |
| `/login?error=bukan-editor` | Pesan galat | Tampil "Akun ini tidak terdaftar sebagai Editor." | BELUM DICEK | BELUM DICEK | |
| `/login?error=gagal-masuk` | Pesan galat | Tampil "Gagal masuk. Coba lagi." | BELUM DICEK | BELUM DICEK | |
| `/` Dashboard | "Tambah vendor" (tampilan kosong) | Ke `/vendor/baru`. Hanya tampil kalau belum ada Vendor dan belum ada Tugas sama sekali | BELUM DICEK | BELUM DICEK | |
| `/` Dashboard | Item Pembayaran Terjadwal lewat Jatuh Tempo | Tampil di kelompok Terlambat dengan judul "{Jenis} {Vendor}", nominal, dan label Terlambat. Hitungan kelompok bertambah satu | BELUM DICEK | BELUM DICEK | Baru diuji e2e di `dashboard.spec.ts` ("pembayaran terjadwal yang lewat jatuh tempo..."), belum dijalankan |
| `/` Dashboard | "Selesai" di item Tugas | Menandai Tugas selesai, item hilang, hitungan kelompok berkurang, fokus pindah ke judul kelompok | BELUM DICEK | BELUM DICEK | |
| `/` Dashboard | "Tandai dibayar" di item Pembayaran | Membuka atau menutup form di dalam kartu | BELUM DICEK | BELUM DICEK | |
| `/` Dashboard | Form tandai dibayar: "Simpan" | Tanpa Pihak: pesan galat. Dengan Pihak: item hilang, fokus ke judul kelompok | BELUM DICEK | BELUM DICEK | |
| `/` Dashboard | Form tandai dibayar: "Batal" | Form tertutup, fokus kembali ke "Tandai dibayar" | BELUM DICEK | BELUM DICEK | |
| `/` Dashboard | Link nama Vendor dan nama Acara di item | Ke `/vendor/{id}` dan `/acara/{id}` | BELUM DICEK | BELUM DICEK | |
| `/acara` | "Tambah acara" (atas dan di tampilan kosong) | Ke `/acara/baru` | BELUM DICEK | BELUM DICEK | |
| `/acara` | "Ubah" per kartu | Ke `/acara/{id}` | BELUM DICEK | BELUM DICEK | |
| `/acara/baru` | "Simpan" | Menyimpan Acara lalu kembali ke `/acara`. Nama kosong ditolak browser (`required`) | BELUM DICEK | BELUM DICEK | |
| `/acara/baru` | "Kembali ke daftar acara" | Ke `/acara` | BELUM DICEK | BELUM DICEK | Diberi `tautan-aksi` di commit ini |
| `/acara/{id}` | "Simpan" | Menyimpan perubahan lalu kembali ke `/acara` | BELUM DICEK | BELUM DICEK | |
| `/acara/{id}` | "Hapus acara" | Membuka dialog konfirmasi | BELUM DICEK | BELUM DICEK | |
| `/acara/{id}` | Dialog: "Hapus" | Menghapus lalu ke `/acara`. Acara yang dipakai Vendor menampilkan pesan galat di dialog | BELUM DICEK | BELUM DICEK | |
| `/acara/{id}` | Dialog: "Batal" | Dialog tertutup | BELUM DICEK | BELUM DICEK | |
| `/acara/{id}` | "Kembali ke daftar acara" | Ke `/acara` | BELUM DICEK | BELUM DICEK | Diberi `tautan-aksi` di commit ini |
| `/vendor` | "Tambah vendor" | Ke `/vendor/baru` | BELUM DICEK | BELUM DICEK | |
| `/vendor` | Filter Kategori, Status, Acara, lalu "Terapkan" | Memuat `/vendor?kategori=&status=&acara=` dengan pilihan tetap terpilih | BELUM DICEK | BELUM DICEK | |
| `/vendor` | Tampilan kosong: "Lihat semua vendor" atau "Tambah vendor" | Dengan filter: ke `/vendor`. Tanpa filter: ke `/vendor/baru` | BELUM DICEK | BELUM DICEK | |
| `/vendor` | "Lihat" per kartu | Ke `/vendor/{id}` | BELUM DICEK | BELUM DICEK | |
| `/vendor/baru` | Isian WhatsApp | Nomor tidak dikenali menampilkan "Nomor WhatsApp tidak dikenali" saat mengetik | BELUM DICEK | BELUM DICEK | |
| `/vendor/baru` | "Simpan" | Menyimpan Vendor dan Acara-nya, lalu ke `/vendor/{id}`. Gagal: pesan galat, isian tetap | BELUM DICEK | BELUM DICEK | |
| `/vendor/baru` | "Kembali ke daftar vendor" | Ke `/vendor` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` | "Ubah status" + "Simpan status" | Tombol nonaktif selama status belum diganti. Simpan mengubah label status | BELUM DICEK | BELUM DICEK | Gaya nonaktif baru di commit ini |
| `/vendor/{id}` | Link alamat web vendor | Membuka tab baru, hanya untuk `http(s)://` | BELUM DICEK | BELUM DICEK | Sekarang memakai `tautan-aksi` (tinggi 44px, huruf tebal). Cek URL panjang tidak melebarkan halaman di 375px |
| `/vendor/{id}` | "Chat WhatsApp" | Membuka `https://wa.me/62...` di tab baru. Tidak tampil kalau nomor tidak dikenali | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` | "Ubah vendor" | Ke `/vendor/{id}/ubah` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` | "Bandingkan paket di kategori ini" | Ke `/komparasi/{kategoriId}` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Paket | "Tambah paket" (kosong dan di bawah daftar) | Ke `/vendor/{id}/paket/baru` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Paket | "Ubah paket" | Ke `/vendor/{id}/paket/{paketId}/ubah` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Paket, Kontrak, bukti | Isian "Unggah lampiran ..." | Memilih JPG, PNG, WEBP, atau PDF maks 10 MB. Tampil "Memproses...", lalu file muncul di daftar. Tipe atau ukuran salah: pesan galat | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Paket, Kontrak, bukti | Link nama file lampiran | Membuka signed URL di tab baru | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Paket, Kontrak, bukti | "Hapus" lampiran, lalu dialog "Hapus" atau "Batal" | Dialog konfirmasi dengan nama file. Hapus menghilangkan file, Batal menutup dialog | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Kontrak (belum ada) | "Buat kontrak" | Membuka form harga per Acara. Tampil kalau status Survei/Nego atau Booked dan Vendor punya Acara | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Kontrak (belum ada) | Form: "Simpan kontrak" dan "Batal" | Simpan membuat Kontrak dan Vendor jadi Booked. Batal menutup form | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Kontrak (belum ada) | "Hubungkan ke acara" | Ke `/vendor/{id}/ubah`. Tampil kalau Vendor belum punya Acara | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Kontrak | "Ubah harga per acara", lalu "Simpan harga" atau "Batal" | Form harga per Acara. Simpan memperbarui Total. Semua kosong: "Isi harga untuk minimal satu acara." | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Kontrak | "Ubah data kontrak", lalu "Simpan data kontrak" atau "Batal" | Form tanggal kesepakatan dan catatan | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Pembayaran | "Tambah pembayaran" | Membuka form. Status Dibayar memunculkan Tanggal bayar dan Dibayar oleh | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Pembayaran | Form: "Simpan pembayaran" dan "Batal" | Simpan menambah baris dan memperbarui Sisa Tagihan. Gagal: pesan galat, isian tetap | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Pembayaran | "Tandai dibayar" per baris Terjadwal, lalu "Simpan" atau "Batal" | Form tanggal bayar dan Pihak. Simpan mengubah status jadi Dibayar | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Pembayaran | "Ubah" per baris | Mengganti kartu dengan form berisi data baris itu | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Pembayaran | "Hapus" per baris, lalu dialog "Hapus" atau "Batal" | Dialog dengan fokus di Batal. Hapus menghilangkan baris | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Pembayaran | "Bukti transfer (n)" | Membuka atau menutup bagian unggah bukti | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Log Kontak | "Tambah log kontak", lalu "Simpan log kontak" atau "Batal" | Form tanggal, saluran, isi | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Log Kontak | "Lihat semua tugas" | Ke `/tugas` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Log Kontak | "Buat follow-up", lalu "Simpan tugas" atau "Batal" | Form judul, Jatuh Tempo, PIC. Tugas tampil di bawah log dan di `/tugas` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` Log Kontak | "Hapus", lalu dialog "Hapus" atau "Batal" | Menghapus log. Tugas follow-up tetap ada | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` | "Kembali ke daftar vendor" | Ke `/vendor` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}` tidak ada | "Kembali ke daftar vendor" | Ke `/vendor` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}/ubah` | "Simpan" | Menyimpan lalu ke `/vendor/{id}` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}/ubah` | "Kembali ke detail vendor" | Ke `/vendor/{id}` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}/paket/baru` dan `/ubah` | "Atur Komponen" | Ke `/pengaturan/komponen?kategori={id}` | BELUM DICEK | BELUM DICEK | Isian form yang belum disimpan hilang saat pindah halaman |
| `/vendor/{id}/paket/baru` dan `/ubah` | "Simpan paket" | Menyimpan Paket dan nilai Komponen, lalu ke `/vendor/{id}`. Harga tidak terbaca: pesan galat, isian tetap | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}/paket/baru` dan `/ubah` | "Kembali ke detail vendor" | Ke `/vendor/{id}` | BELUM DICEK | BELUM DICEK | |
| `/vendor/{id}/paket/...` tidak ada | "Kembali ke daftar vendor" | Ke `/vendor` | BELUM DICEK | BELUM DICEK | |
| `/komparasi` | "Lihat vendor" (tampilan kosong) | Ke `/vendor` | BELUM DICEK | BELUM DICEK | |
| `/komparasi` | "Bandingkan" per kategori | Ke `/komparasi/{kategoriId}` | BELUM DICEK | BELUM DICEK | |
| `/komparasi/{kategoriId}` | Filter Acara, "Tampilkan vendor batal", "Terapkan" | Memuat `?acara=&batal=1` | BELUM DICEK | BELUM DICEK | |
| `/komparasi/{kategoriId}` | Tabel geser | Hanya tabel yang bergeser, kolom label menempel di kiri, halaman tidak melebar. Bisa digeser dengan keyboard setelah difokus | BELUM DICEK | BELUM DICEK | |
| `/komparasi/{kategoriId}` | Link nama Vendor di kepala kolom | Ke `/vendor/{id}` | BELUM DICEK | BELUM DICEK | |
| `/komparasi/{kategoriId}` | "Pilih paket ini" | Membuka dialog. Vendor beberapa Acara: isian nominal per Acara. Tanpa Acara: penjelasan, tombol Pilih nonaktif | BELUM DICEK | BELUM DICEK | |
| `/komparasi/{kategoriId}` | Dialog: "Pilih paket" dan "Batal" | Pilih menjadikan Paket Dipilih, Vendor Booked, Paket lain Tidak dipilih. Batal (fokus awal) menutup dialog | BELUM DICEK | BELUM DICEK | |
| `/komparasi/{kategoriId}` | Tampilan kosong: "Lihat semua paket" atau "Lihat vendor" | Ke `/komparasi/{kategoriId}` atau `/vendor` | BELUM DICEK | BELUM DICEK | |
| `/komparasi/{kategoriId}` | "Kembali ke daftar kategori" | Ke `/komparasi` | BELUM DICEK | BELUM DICEK | |
| `/komparasi/{kategoriId}` tidak ada | "Kembali ke komparasi" | Ke `/komparasi` | BELUM DICEK | BELUM DICEK | |
| `/tugas` | Filter PIC, Acara, Vendor, Status, "Terapkan" | Memuat `/tugas?pic=&acara=&vendor=&status=` dengan pilihan tetap terpilih. Default status "Belum selesai". Id yang bukan uuid diabaikan | BELUM DICEK | BELUM DICEK | Acara dan Vendor baru ditambah. Di 375px satu kolom, di 560px ke atas dua kolom dengan "Terapkan" di baris sendiri (`.filter-empat`) |
| `/tugas` | Filter Acara | Hanya Tugas yang terkait Acara itu. Urutan pilihan sama dengan filter Vendor (tanggal, lalu nama) | BELUM DICEK | BELUM DICEK | Diuji `tugas.spec.ts` ("filter acara..."), belum dijalankan |
| `/tugas` | Filter Vendor | Hanya Tugas yang terkait Vendor itu. Pilihan diurutkan per nama | BELUM DICEK | BELUM DICEK | Diuji `tugas.spec.ts` ("filter vendor..."), belum dijalankan |
| `/tugas` | "Tambah tugas", lalu "Simpan tugas" atau "Batal" | Form di atas daftar. Judul kosong ditolak dengan pesan | BELUM DICEK | BELUM DICEK | |
| `/tugas` | "Selesai" atau "Buka lagi" per Tugas | Mengubah status Tugas | BELUM DICEK | BELUM DICEK | |
| `/tugas` | "Ubah" per Tugas | Mengganti kartu dengan form. Tugas follow-up: Vendor terkunci | BELUM DICEK | BELUM DICEK | |
| `/tugas` | "Hapus", lalu dialog "Hapus" atau "Batal" | Menghapus Tugas | BELUM DICEK | BELUM DICEK | |
| `/tugas` | Link nama Vendor dan nama Acara | Ke `/vendor/{id}` dan `/acara/{id}` | BELUM DICEK | BELUM DICEK | Diberi `tautan-aksi` di commit ini |
| `/tugas` | "Hapus filter" (tampilan kosong dengan filter) | Ke `/tugas` | BELUM DICEK | BELUM DICEK | |
| `/kontribusi` | "Lihat vendor" (tampilan kosong) | Ke `/vendor` | BELUM DICEK | BELUM DICEK | |
| `/kontribusi` | Ringkasan per Pihak | Membuka atau menutup rincian per Vendor | BELUM DICEK | BELUM DICEK | |
| `/kontribusi` | Link nama Vendor di rincian | Ke `/vendor/{id}` | BELUM DICEK | BELUM DICEK | |
| `/pengaturan` | "Ubah nama", lalu "Simpan nama" atau "Batal" | Form nama di dalam kartu, fokus langsung ke isian. Setelah ditutup fokus kembali ke "Ubah nama" | BELUM DICEK | BELUM DICEK | Untuk Pihak dan Kategori Vendor |
| `/pengaturan` | "Arsipkan" atau "Aktifkan lagi" | Mengubah status arsip, label "Diarsipkan" muncul atau hilang | BELUM DICEK | BELUM DICEK | |
| `/pengaturan` | "Hapus", lalu dialog "Hapus" atau "Batal" | Hanya untuk item yang belum dipakai. Setelah dihapus fokus ke judul section | BELUM DICEK | BELUM DICEK | |
| `/pengaturan` | "Tambah pihak" dan "Tambah kategori" | Menambah item. Nama ganda ditolak dengan pesan | BELUM DICEK | BELUM DICEK | |
| `/pengaturan` | "Atur komponen pembanding" | Ke `/pengaturan/komponen` | BELUM DICEK | BELUM DICEK | |
| `/pengaturan/komponen` | Pilih Kategori, lalu "Pilih" | Memuat `?kategori={id}` | BELUM DICEK | BELUM DICEK | |
| `/pengaturan/komponen` | "Naik" dan "Turun" | Menggeser urutan. Nonaktif di baris pertama dan terakhir | BELUM DICEK | BELUM DICEK | Gaya nonaktif baru di commit ini |
| `/pengaturan/komponen` | "Ubah" per Komponen | Ke `?kategori={id}&ubah={komponenId}`, form berisi data Komponen | BELUM DICEK | BELUM DICEK | |
| `/pengaturan/komponen` | "Hapus", lalu dialog "Hapus" atau "Batal" | Dialog menyebut jumlah Paket yang nilainya ikut terhapus | BELUM DICEK | BELUM DICEK | |
| `/pengaturan/komponen` | "Simpan komponen" dan "Batal ubah" | Simpan menambah atau mengubah. Batal ubah ke `?kategori={id}` | BELUM DICEK | BELUM DICEK | |
| `/pengaturan/komponen` | "Kembali ke pengaturan" | Ke `/pengaturan` | BELUM DICEK | BELUM DICEK | |
| `/share` | "Buat link" | Membuat Share Link. Keuangan tidak tercentang secara default. Nama kosong atau tanpa bagian ditolak dengan pesan | BELUM DICEK | BELUM DICEK | |
| `/share` | Kotak link | Teks terpilih saat difokus | BELUM DICEK | BELUM DICEK | |
| `/share` | "Salin link" | Menyalin alamat lengkap, tampil "Link disalin". Clipboard ditolak: teks dipilih dan pesan salin manual | BELUM DICEK | BELUM DICEK | |
| `/share` | "Cabut", lalu dialog "Cabut" atau "Batal" | Link jadi "Dicabut", kotak link hilang, fokus ke judul kartu | BELUM DICEK | BELUM DICEK | |
| `/s/{token}` | (tidak ada tombol atau link) | Menampilkan label dan bagian yang dicentang saja. Token dicabut atau tidak ada: "Link ini sudah tidak aktif." | BELUM DICEK | BELUM DICEK | Sengaja tanpa link ke halaman Editor |
| `/s/{token}` | "Coba lagi" di tampilan error | Memanggil `reset()` | BELUM DICEK | BELUM DICEK | |
| URL yang tidak ada, `/acara/{id}` tidak ada | "Kembali ke dashboard" | Halaman 404 Indonesia tanpa navigasi bawah. Link ke `/`. Belum login: `(app)/layout.tsx` mengalihkan ke `/login` | BELUM DICEK | BELUM DICEK | `src/app/not-found.tsx` baru |

Route tanpa tampilan: `/auth/callback` (menukar code, memanggil `pastikan_editor()`, lalu ke `/` atau `/login?error=...`) dan `/api/dev-login` (404 di produksi). Keduanya dicek lewat langkah 9 di `docs/deploy.md`.

## 4. Test yang harus dijalankan

Semua BELUM DIJALANKAN. Jalankan dengan `.env.local` berisi key project dev dan CLI ter-link ke project dev.

| Perintah | Isi | Hasil yang diharapkan | Status |
|---|---|---|---|
| `npx supabase db reset --linked` | Migration `0001` sampai `0006` | Tanpa error | BELUM DIJALANKAN |
| `npx supabase gen types typescript --linked > src/lib/database.types.ts` | Types dari skema terbaru | File berubah sesuai skema, lalu di-commit | BELUM DIJALANKAN |
| `npx tsc --noEmit` | Seluruh project | 0 error | BELUM DIJALANKAN |
| `npm run lint` | ESLint | 0 error | BELUM DIJALANKAN |
| `npx vitest run tests/unit` | 8 file: `komponen`, `lampiran`, `rupiah`, `shareLink`, `tanggal`, `tugas`, `validasi`, `whatsapp` | Semua PASS | BELUM DIJALANKAN |
| `npx vitest run tests/db` | 10 file: `agenda`, `akses`, `keuangan`, `kontrak-fungsi`, `paket`, `pengaturan`, `share`, `storage`, `tugas`, `vendor` | Semua PASS, data `@test.local` terhapus setelahnya | BELUM DIJALANKAN |
| `npx playwright test` | 11 file: `acara`, `dashboard`, `komparasi`, `login`, `paket`, `pembayaran`, `pengaturan`, `share`, `shell`, `tugas`, `vendor` | Semua PASS (config: retry 1, worker 1, Desktop Chrome, beberapa test memakai viewport 375px) | BELUM DIJALANKAN |
| `npm run build` | Build produksi | Sukses, tanpa warning TypeScript | BELUM DIJALANKAN |

## 5. Kriteria selesai Fase 1 (PRD)

| No | Kriteria | Implementasi (commit dan file) | Test yang mencakup | Status |
|---|---|---|---|---|
| 1 | Rendy dan Dinar bisa login dari HP masing-masing dan melihat data yang sama | `7ff0ea9`, `975fb7c`. `supabase/migrations/0001_dasar.sql` (`is_editor()`, `pastikan_editor()`, RLS), `src/app/login/*`, `src/app/auth/callback/route.ts`, `middleware.ts`, `src/lib/supabase/*`, `src/app/(app)/layout.tsx`. Semua data dibaca lewat RLS yang sama untuk kedua Editor | `tests/db/akses.test.ts`, `tests/e2e/login.spec.ts` ("setelah dev-login..."). E2E memakai `/api/dev-login`, bukan Google sungguhan | BELUM DIVERIFIKASI. Login Google asli hanya bisa dicek di produksi (`docs/deploy.md` langkah 9) |
| 2 | Email Google lain ditolak | Sama dengan nomor 1. Callback memanggil `signOut()` lalu ke `/login?error=bukan-editor` | `tests/db/akses.test.ts` ("orang luar tidak bisa membaca apa pun", "email di allowlist tapi belum terkonfirmasi bukan editor", "anon tidak bisa memanggil pastikan_editor"), `tests/e2e/login.spec.ts` ("email di luar allowlist ditolak dengan pesan") | BELUM DIVERIFIKASI |
| 3 | Semua vendor Lamaran yang sudah ada bisa diinput lengkap dengan Kontrak dan Pembayarannya | `28b8b18`, `f865d47`, `5f870ee`, `0274cf3`, `217e632`, `6798fa1`, `c7dc219`, `13dd3f3`. Migration `0002_vendor.sql`, `0003_keuangan.sql`, halaman `src/app/(app)/vendor/**` | `tests/e2e/vendor.spec.ts`, `paket.spec.ts`, `pembayaran.spec.ts`, `tests/db/vendor.test.ts`, `paket.test.ts`, `keuangan.test.ts`, `kontrak-fungsi.test.ts` | BELUM DIVERIFIKASI. Butuh Rendy menginput data vendor Lamaran yang asli |
| 4 | Komparasi menampilkan minimal tiga Paket dari Vendor berbeda secara sejajar per Komponen, dan terbaca di layar HP | `481ee0f`. `src/app/(app)/komparasi/[kategoriId]/page.tsx`, `.tabel-geser` dan `.tabel-komparasi` di `globals.css` | `tests/e2e/komparasi.spec.ts` ("375px: baris berurutan, sel kosong, geser horizontal hanya di tabel, label tetap terlihat", memakai Paket A, B, C) | BELUM DIVERIFIKASI |
| 5 | Pembayaran Terjadwal yang lewat Jatuh Tempo muncul di kelompok Terlambat | `fded50d`, `bf9ae6a`. View `agenda` di `0004_tugas.sql`, `kelompokJatuhTempo()` di `src/lib/tanggal.ts`, `src/app/(app)/page.tsx` | `tests/unit/tanggal.test.ts` ("mengelompokkan tanggal jatuh tempo"), `tests/db/agenda.test.ts` ("pembayaran terjadwal tampil..."), `tests/e2e/dashboard.spec.ts` ("pembayaran terjadwal yang lewat jatuh tempo masuk kelompok terlambat": Pelunasan dengan Jatuh Tempo kemarin, tanggal Jakarta, tampil di Terlambat dengan judul "Pelunasan Uji Venue Agenda" dan "Rp 5.000.000"). Celah sebelumnya (e2e Terlambat hanya memakai Tugas) sudah ditutup di kode | BELUM DIVERIFIKASI. Test baru belum dijalankan |
| 6 | Rekap Kontribusi per Pihak sama dengan hasil hitung manual | `c7dc219`. View `kontribusi_pihak` dan `kontribusi_pihak_vendor` di `0003_keuangan.sql`, `src/app/(app)/kontribusi/page.tsx` | `tests/db/keuangan.test.ts` ("kontribusi per pihak"), `tests/e2e/pembayaran.spec.ts` ("DP dibayar, ... dan kontribusi") | BELUM DIVERIFIKASI. Butuh Rendy membandingkan dengan hitungan manual dari data asli |
| 7 | Share Link tanpa centang Keuangan tidak memuat nominal apa pun, termasuk di response API | `5e311f7`, `957ce5e`, `1279d4f`. `baca_share_link()` di `0005_share_link.sql`, `src/app/s/[token]/page.tsx`, `src/lib/supabase/anon.ts` | `tests/db/share.test.ts` ("tanpa keuangan...", "kunci hasil persis sesuai bagian"), `tests/e2e/share.spec.ts` ("share link default tanpa keuangan...", mengecek teks halaman dan response mentah tidak memuat "Rp") | BELUM DIVERIFIKASI. Teks bebas (judul Tugas, nama vendor, lokasi) tetap tampil apa adanya, dan form sudah memperingatkan hal ini |
| 8 | Lolos Delivery Gate antislop | Laporan ini | Bagian 1 sampai 4 | BELUM LULUS |

## 6. Risiko dan catatan

### FAIL yang ditemukan dan belum diperbaiki

1. **Kontras placeholder bergantung browser.** Warna `::placeholder` tidak diatur. Nilai bawaan WebKit (`darkGray`, 2.35:1) dan Firefox (3.49:1) gagal 4.5:1 di atas `#fff`. Perbaikannya butuh satu warna netral baru (contoh `#6b5e60`, 6.19:1) yang tetap terlihat berbeda dari isian asli. Ini keputusan desain, jadi tidak diubah di commit ini.

### FAIL dan celah yang sudah diperbaiki di kode (BELUM DIVERIFIKASI)

Diperbaiki di commit "fix: tutup celah delivery gate fase 1". Hanya dicek sintaksnya, belum dijalankan di browser atau lewat test.

1. **Halaman 404 bawaan Next.js berbahasa Inggris.** Ditambah `src/app/not-found.tsx`: judul "Rendy & Dinar", pesan "Halaman tidak ditemukan.", link "Kembali ke dashboard" ke `/`. Memakai class baru `.halaman-mandiri` (lebar dan padding sama dengan `.halaman-pembaca`), tanpa navigasi bawah. `not-found.tsx` yang sudah ada di `vendor/[id]`, `vendor/[id]/paket`, dan `komparasi/[kategoriId]` tidak diubah. Catatan: `/acara/{id}` yang tidak ada sekarang tampil tanpa navigasi bawah, karena boundary-nya di root. Kalau ingin navigasi tetap tampil, tambah `not-found.tsx` di `(app)/acara/[id]/`.
2. **Filter Tugas belum sesuai PRD.** `/tugas` sekarang punya filter PIC, Acara, Vendor, dan Status (`?pic=&acara=&vendor=&status=`). Id Acara dan Vendor dicek dengan `adalahUuid()`, nilai lain diabaikan. Keduanya ikut dihitung di `adaFilter`, jadi tampilan kosong menawarkan "Hapus filter". Pilihan Acara diurutkan per tanggal lalu nama, Vendor per nama, sama dengan form Tugas. Class `.filter-dua` diganti `.filter-empat`: satu kolom di bawah 560px, dua kolom di atasnya dengan "Terapkan" di baris sendiri. Test baru di `tugas.spec.ts`: "filter vendor..." dan "filter acara...".
3. **E2E Pembayaran Terjadwal di kelompok Terlambat.** `dashboard.spec.ts` menambah kasus Pelunasan dengan Jatuh Tempo kemarin (tanggal Jakarta). Helper `pelunasanHariIni()` diganti `pelunasanTerjadwal(geserHari = 0)`, hitungan dasar dan pembersihan memakai cara yang sudah ada.
4. **Tap target link alamat web vendor.** Diberi `tautan-aksi` di `vendor/[id]/page.tsx`.

### Perbaikan kecil di commit ini

- `SeksiKontrak.tsx`: "tahap Survei/Nego" menjadi "status vendor menjadi Survei/Nego", dan "halaman Bandingkan" menjadi "halaman Komparasi".
- `kontrak/actions.ts`: pesan galat "di tahap Survei/Nego atau Booked" menjadi "berstatus Survei/Nego atau Booked".
- `acara/[id]/page.tsx`: dua link "Kembali ke daftar acara" diberi `tautan-aksi` (tap target 44px).
- `tugas/DaftarTugas.tsx`: link nama Vendor dan nama Acara diberi `tautan-aksi`, sama dengan item dashboard.
- `globals.css`: `.tombol-sekunder:disabled` diberi `opacity: 0.7; cursor: not-allowed`, supaya "Simpan status", "Naik", dan "Turun" yang nonaktif terlihat nonaktif.

Perbaikan ini belum dicek di browser dan belum diuji. Semuanya ikut dicek di tabel bagian 3 dan test bagian 4.

### Risiko teknis

- **`src/lib/database.types.ts` sempat diedit tangan dan sudah tertinggal.** Commit terakhir yang mengubahnya `5e311f7`, sedangkan migration masih diubah sesudahnya di `bf9ae6a` (`0004`), `957ce5e` dan `1279d4f` (`0005`), serta `e483b9a` (`0001`, `0002`). Wajib generate ulang sebelum deploy.
- **Klien Supabase tanpa generic `Database`.** `src/lib/supabase/server.ts` dan `browser.ts` memanggil `createServerClient(...)` dan `createBrowserClient(...)` tanpa `<Database>`, jadi hampir semua query di aplikasi tidak dicek tipe (hasilnya `any`). Hanya `src/lib/supabase/anon.ts` yang memakai `Database`. Saran: tambahkan `createServerClient<Database>(...)` dan `createBrowserClient<Database>(...)` setelah types digenerate ulang, lalu perbaiki semua yang dilaporkan `npx tsc --noEmit`. Kemungkinan besar akan ada error baru, misalnya di embed relasi dan kolom view yang nullable.
- **Migration diubah di tempat.** `0001` sampai `0005` diubah beberapa kali setelah pertama dibuat. Project dev harus di-`db reset --linked` supaya skemanya sama persis dengan file. Setelah deploy pertama, perubahan hanya lewat migration baru (`docs/deploy.md` langkah 10).
- **`db reset --linked` setelah link ke produksi akan menghapus data asli.** `docs/deploy.md` meminta link kembali ke dev setelah `db push` dan mengecek `supabase/.temp/project-ref`.
- **Env Preview di Vercel.** Kalau key produksi juga diisi untuk Preview, branch preview menulis ke data asli. `docs/deploy.md` meminta env hanya untuk Production.
- **`SUPABASE_SERVICE_ROLE_KEY` tidak dibutuhkan di produksi.** Di kode aplikasi key ini hanya dibaca `src/app/api/dev-login/route.ts`, yang sudah 404 di produksi (`NODE_ENV === 'production'`) sebelum key dipakai. Pemakaian lain hanya di `tests/db/helpers.ts`.
- **PWA belum punya ikon.** `manifest.webmanifest` sengaja tanpa ikon (plan Task 1, menunggu keputusan logo, R-23). Chrome Android biasanya baru menawarkan install kalau manifest punya ikon, jadi "PWA yang bisa di-install" perlu dicek di HP.
- **`middleware.ts` di Next.js 16.** Next.js 16 memperkenalkan nama file `proxy.ts` sebagai pengganti `middleware.ts`. Kemungkinan `npm run build` menampilkan peringatan deprecation. Belum dicek karena build tidak bisa dijalankan di sini.
- **Link "Atur Komponen" di form Paket** membuka halaman lain, jadi isian Paket yang belum disimpan hilang.
- **Commit `4c8e934` bernama "initial commit"** di tengah riwayat dan tidak mengikuti format Conventional Commits. Hanya catatan.
