# DESIGN.md: Rendy & Dinar

Arah visual dari jawaban Rendy. File ini dibaca sebagai arah desain, lalu `antislop` dipakai sebagai filter.

## Identitas

- **Nama di aplikasi:** "Rendy & Dinar", berupa wordmark teks dengan font judul. Tidak ada logo gambar dan tidak ada foto profil.
- **Suasana:** hangat, rapi, klasik/elegan.
- **Jenis produk:** aplikasi kerja harian untuk dua orang, dibuka dari HP. Data dan Jatuh Tempo lebih penting dari dekorasi.

## Design Read

Dibaca sebagai aplikasi pencatat persiapan pernikahan untuk pasangan yang mengelolanya sendiri, dengan nuansa kartu undangan klasik. Dial ENERGY 1 / RHYTHM 2 / MOTION 1.

| Dial | Nilai | Artinya di sini |
|---|---|---|
| ENERGY | 1 | Tenang. Yang paling menonjol di tiap layar adalah data, bukan hiasan. |
| RHYTHM | 2 | Konsisten, dengan beberapa variasi. Dashboard dan Komparasi boleh berbeda komposisi dari halaman daftar biasa. |
| MOTION | 1 | Hanya hover, fokus, dan transisi singkat saat membuka atau menutup panel. |

## Warna

Hanya mode terang. Palet dibangun dari warna terang `#f5efef`, dan mode gelap butuh turunan warna sendiri. Mode gelap ada di luar scope.

| Token | Hex | Peran | Kontras |
|---|---|---|---|
| `--bg` | `#f5efef` | Background halaman | |
| `--primary` | `#80172c` | Teks judul, tombol utama, link, status Terlambat (selalu dengan label teks) | 8.9:1 di atas `--bg`. Teks putih di atasnya 10.1:1 |
| `--surface` | `#ecb6b6` | Kartu terpilih, highlight, chip | 1.6:1 di atas `--bg`, jadi tidak boleh untuk teks. Teks `--primary` di atasnya 5.7:1 |
| `--accent` | `#60692d` | Aksen tunggal: status positif (Lunas, Booked, Selesai) | 5.2:1 di atas `--bg` |
| `--teks` | `#2b2325` | Teks isi. Netral hangat, tanpa hue baru | 13.49:1 di atas `--bg`, 8.71:1 di atas `--surface` |
| `--teks-lembut` | `#4a3f41` | Teks sekunder (tanggal, keterangan). Lebih terang dari `--teks` tapi tetap lolos AA di dua latar | 8.89:1 di atas `--bg`, 5.74:1 di atas `--surface` |
| `--garis` | `#8a7a7d` | Border kartu dan input. Bukan teks | 3.58:1 di atas `--bg` (batas 3:1 untuk batas komponen UI) |
| (tanpa token) | `#fff` | Latar isian form (`input`, `select`, `textarea`, kotak link Share Link) dan warna teks di `.tombol-utama`. Putih dipakai supaya kotak isian terbaca sebagai tempat mengetik, beda dari latar halaman `--bg` | `--teks` di atas `#fff` 15.33:1. Teks `#fff` di atas `--primary` 10.11:1. Garis `--garis` di atas `#fff` 4.07:1 |
| (tanpa token) | `rgb(43 35 37 / 0.5)` | Latar belakang di balik `dialog` (`::backdrop`). Ini `--teks` dengan opasitas 50%, jadi tidak menambah hue baru | Bukan teks. Latar dialog `--bg` di atas backdrop 3.01:1, sehingga tepi dialog tetap terlihat |
| (literal) | `#80172c`, `#f5efef` | `themeColor` di `src/app/layout.tsx` dan `theme_color`/`background_color` di `public/manifest.webmanifest`. Nilainya sama dengan `--primary` dan `--bg`, ditulis literal karena metadata dan manifest tidak bisa membaca variabel CSS | Tidak ada teks |

Aturan:
- Status negatif tidak memakai warna baru. Terlambat dan Belum bayar memakai `--primary` dengan label teks, supaya palet tetap 3 warna inti ditambah 1 aksen.
- Status tidak boleh dibedakan hanya dengan warna. Setiap status punya label teks.
- Warna netral untuk teks isi dan garis ditentukan saat build, dicek kontrasnya, lalu dicatat di tabel ini.

## Tipografi

| Peran | Font | Alasan |
|---|---|---|
| Judul dan wordmark | Cormorant Garamond | Serif klasik yang memberi nuansa undangan |
| Data, teks isi, form | Source Sans 3 | Mudah dibaca di layar HP, punya angka tabular sehingga nominal Rupiah rata di tabel |

- Nominal uang memakai `font-variant-numeric: tabular-nums`.
- Cormorant Garamond hanya untuk judul berukuran besar. Di ukuran kecil font ini sulit dibaca.

## Motif identitas

Garis tipis ganda berwarna `--primary` sebagai pemisah di bawah judul halaman, mengikuti bingkai kartu undangan. Motif ini hanya dipakai di judul halaman, tidak di setiap kartu atau section.

## Catatan untuk build

- Layar HP dirancang lebih dulu. Komparasi di HP butuh cara khusus supaya tetap terbaca, misalnya kolom Komponen yang menempel di kiri saat digeser.
- Satu titik fokus per layar. Di dashboard titik fokusnya kelompok Terlambat.
- Keputusan visual yang belum ada di file ini (radius, jarak, bayangan) dicatat di sini beserta alasannya saat dibuat.
- Navigasi bawah: bar tetap di bawah layar dengan latar `--bg` dan garis atas `--garis`. Halaman aktif ditandai garis atas 3px `--primary` dan huruf tebal, jadi tidak hanya dibedakan warna. Tinggi item 56px supaya mudah diketuk dengan jempol.
- Dashboard: kelompok Terlambat diberi bingkai 2px `--primary` dan judul lebih besar sebagai satu-satunya titik fokus. Kelompok lain memakai gaya `bagian` biasa.
- Halaman Pembaca (`/s/[token]`, class `.halaman-pembaca`): lebar isi maksimal 720px, sama dengan shell Editor (`.isi-utama`), dengan padding 1rem di kiri dan kanan supaya tetap pas di 375px. Tanpa navigasi bawah dan tanpa link ke halaman Editor. Wordmark "Rendy & Dinar" menjadi judul halaman dengan motif garis ganda, label Share Link di bawahnya. Kartu dan status memakai gaya yang sama dengan halaman Editor.
- Halaman 404 (`src/app/not-found.tsx`, class `.halaman-mandiri`): ukuran sama dengan `.halaman-pembaca`, tanpa navigasi bawah. Wordmark "Rendy & Dinar" sebagai judul, lalu tampilan kosong dengan link "Kembali ke dashboard".
- Pesan berhasil (misalnya "Link disalin") memakai bingkai 1px `--accent` dengan teks `--teks` tebal, pasangan dari `pesan-galat` yang berbingkai `--primary`. Statusnya tetap dibaca dari teks, bukan dari warna bingkai.

## Nilai visual yang dipakai di `globals.css`

Dicatat saat Task 14 dari isi `src/app/globals.css`. Kalau nilai baru ditambahkan ke CSS, tambahkan juga di sini beserta alasannya.

### Radius

| Nilai | Dipakai di | Alasan |
|---|---|---|
| `4px` | Semua tombol (`.tombol-utama`, `.tombol-sekunder`, `.tombol-bahaya`), `.kartu`, `.kosong`, isian form, `.pesan-galat`, `.pesan-berhasil`, `.dialog`, `.tabel-geser`, `.menu-lainnya`, `.kelompok-terlambat` | Satu radius kecil untuk semua permukaan. Sudut hampir tegak mengikuti kartu undangan klasik, dan satu nilai saja membuat tampilan konsisten (RHYTHM 2) |

### Garis dan bingkai

| Nilai | Dipakai di | Alasan |
|---|---|---|
| `1px solid var(--garis)` | Kartu, tampilan kosong, isian form, tombol sekunder, tabel Komparasi, menu Lainnya, garis atas navigasi bawah | Pemisah netral. Lolos 3:1 untuk batas komponen UI di atas `--bg` dan `#fff` |
| `1px solid var(--primary)` | `.pesan-galat`, `.dialog`, `.tombol-bahaya` | Menandai hal yang perlu perhatian tanpa warna baru |
| `1px solid var(--accent)` | `.pesan-berhasil` | Pasangan `pesan-galat` untuk pesan berhasil |
| `2px solid var(--primary)` | `.kelompok-terlambat` | Satu-satunya titik fokus dashboard, jadi bingkainya lebih tebal dari kartu biasa |
| `3px` garis atas `--primary` | Item navigasi bawah yang aktif | Penanda halaman aktif selain warna dan tebal huruf |
| Blok `5px` dengan garis atas dan bawah `1px --primary` | `.judul-halaman::after` | Motif garis tipis ganda (jarak 3px di antara dua garis) |
| `outline: 2px solid var(--primary)`, `outline-offset: 2px` | `:focus-visible` global | Fokus keyboard selalu terlihat. 8.90:1 di atas `--bg`, 5.75:1 di atas `--surface` |
| `outline-offset: -4px` | Fokus di dalam `.navigasi-bawah` | Bar menempel di tepi layar, jadi garis fokus digambar di dalam item supaya tidak terpotong |

### Bayangan

Tidak ada `box-shadow` di aplikasi. Kartu dan panel dipisah dengan garis, bukan bayangan, sesuai ENERGY 1 dan nuansa kertas undangan yang datar. Satu-satunya lapisan gelap adalah `::backdrop` dialog di atas.

### Jarak

Skala yang dipakai (dalam `rem`, 1rem = 16px): `0.125`, `0.25`, `0.5`, `0.75`, `1`, `1.25`, `1.5`, `2`, `3`, `6`.

| Nilai | Dipakai untuk | Alasan |
|---|---|---|
| `0.25rem` | Jarak label ke isiannya, jarak baris di `.rincian`, `.tautan-share` | Label dan isiannya terbaca sebagai satu kesatuan |
| `0.5rem` | Jarak bawah judul kartu dan paragraf di kartu, daftar lampiran dan alokasi | Rapat di dalam satu kartu |
| `0.75rem` | Jarak antar kartu (`.daftar-kartu`), antar tombol (`.baris-tombol`), antar filter, padding sel tabel Komparasi | Cukup lega untuk jempol tanpa membuat daftar terlalu panjang di HP |
| `1rem` | Padding kartu, jarak antar field form, padding kiri kanan halaman | Satu jarak dasar untuk isi |
| `1.25rem` | Padding kiri kanan tombol, padding dialog | Tombol tidak terlihat sesak walaupun labelnya pendek |
| `1.5rem` | Jarak bawah judul halaman, section (`.bagian`), form, filter | Pemisah antar bagian halaman |
| `2rem` | Padding atas halaman (`.isi-utama`, `.halaman-pembaca`, `.halaman-mandiri`, login), jarak antar section di halaman Pembaca | Ruang napas di bawah status bar HP |
| `3rem` | Padding bawah halaman Pembaca | Halaman Pembaca tidak punya navigasi bawah |
| `calc(6rem + env(safe-area-inset-bottom))` | Padding bawah `.isi-utama` | Isi terakhir tidak tertutup navigasi bawah setinggi 56px dan indikator home iPhone |

### Ukuran dan tap target

| Nilai | Dipakai di | Alasan |
|---|---|---|
| `min-height: 44px` | Tombol, isian form, `.tautan-aksi`, `summary`, link di menu Lainnya, `label.pilihan` | Tap target minimal dari Global Constraints |
| `min-width: 44px` | `.tautan-aksi` | Link pendek seperti "Ubah" dan "Lihat" tetap 44x44 px, bukan hanya 44px tingginya |
| `min-height: 56px` | Item navigasi bawah | Lebih mudah diketuk jempol di tepi bawah layar |
| `24px` | Kotak centang di `label.pilihan` | Kotak terlihat jelas, area ketuknya tetap 44px lewat label |
| `opacity: 0.7` | Tombol nonaktif (`.tombol-utama`, `.tombol-bahaya`, `.tombol-sekunder`) | Menandai tombol nonaktif tanpa warna baru. Kontrol nonaktif tidak wajib lolos 4.5:1 (WCAG 1.4.3), tetapi hasilnya tetap dicatat di tabel kontras |

### Ukuran huruf

| Nilai | Dipakai di |
|---|---|
| `2rem`, line-height 1.15 | Judul halaman (`h1`) |
| `1.75rem` | Judul kelompok Terlambat di dashboard |
| `1.5rem` | Judul kartu (`.kartu h2`) |
| `1.375rem` | Judul kecil di kartu (`.kartu h3`) |
| `1.25rem` | Judul sub-bagian (`.bagian h3`), nama Paket di tabel Komparasi, label Share Link, total Kontribusi, pesan link tidak aktif |
| `1rem`, line-height 1.5 | Teks isi (`body`) |
| `0.9375rem` | Tabel Komparasi, supaya satu kolom 11rem memuat lebih banyak kata |
| `0.875rem` | `dt` di `.rincian`, jejak audit, petunjuk unggah, kolom label tabel Komparasi, item navigasi bawah, kotak link Share Link |
| `0.8125rem` | Item navigasi bawah di layar di bawah 360px, supaya label tidak terpotong |

Tebal huruf: `600` untuk label form, tombol, status, dan judul. `700` untuk item navigasi yang aktif. `400` untuk isian form dan item navigasi biasa.

### Layout

| Nilai | Dipakai di | Alasan |
|---|---|---|
| `max-width: 720px`, tengah | `.isi-utama`, `.halaman-pembaca`, `.halaman-mandiri`, isi navigasi bawah | Baris teks tidak terlalu panjang di laptop, dan isi navigasi sejajar dengan isi halaman |
| `max-width: 480px` | Halaman login (inline style di `src/app/login/page.tsx`) | Halaman login hanya berisi satu tombol, jadi kolomnya lebih sempit |
| `width: min(92vw, 420px)` | `.dialog` | Di 375px dialog menyisakan tepi, di laptop tidak melebar |
| `min-width: 12rem` | `.menu-lainnya` | Label menu terpanjang ("Share Link", "Pengaturan") muat dalam satu baris |
| Grid 5 kolom sama lebar | Navigasi bawah | Empat halaman utama ditambah Lainnya |
| Breakpoint `560px` | Filter Vendor dan pilih kategori menjadi satu baris. Filter Tugas (`.filter-empat`: PIC, Acara, Vendor, Status) menjadi dua kolom, dengan "Terapkan" di baris sendiri rata kiri | Di bawah 560px filter ditumpuk satu kolom supaya tidak ada scroll horizontal. Empat pilihan plus tombol terlalu sempit dalam satu baris 720px |
| Breakpoint `359px` | Ukuran huruf navigasi bawah | Lihat ukuran huruf |
| Sel `min-width: 11rem`, kolom label `6.5rem` menempel (`position: sticky`) | Tabel Komparasi di dalam `.tabel-geser` (`overflow-x: auto`) | Hanya tabel yang bisa digeser, halaman tidak ikut melebar, dan nama Komponen tetap terlihat |
| `z-index: 10` dan `1` | Navigasi bawah dan kolom label yang menempel | Hanya dua lapisan |

### Status

| Warna | Status |
|---|---|
| `--accent` (`.status-aksen`) | Booked, Selesai, Lunas, Dibayar, Paket Dipilih, Share Link Aktif |
| `--primary` (`.status-primer`) | Terlambat, Belum bayar |
| `--teks-lembut` (`.status-lembut`) | Batal, Paket Tidak dipilih, Share Link Dicabut, Diarsipkan |
| `--teks` (`.status-teks`) | Kandidat, Survei/Nego, Belum lunas, Terjadwal, Paket Aktif, Tugas Belum selesai |

Di kolom Paket Terpilih pada tabel Komparasi (latar `--surface`), semua teks termasuk status dan link memakai `--teks`, karena `--accent` di atas `--surface` hanya 3.36:1.

## Hasil cek kontras

Dihitung dengan rumus luminans relatif WCAG 2.x (script node kecil, 24 November 2026). Batas: 4.5:1 untuk teks normal, 3:1 untuk teks besar dan batas komponen UI.

| Teks atau garis | Latar | Rasio | Hasil | Dipakai di |
|---|---|---|---|---|
| `--teks` | `--bg` | 13.49:1 | Lolos | Teks isi, tombol sekunder, navigasi |
| `--teks-lembut` | `--bg` | 8.89:1 | Lolos | `.teks-lembut`, `dt`, jejak audit, kolom label Komparasi, status lembut |
| `--primary` | `--bg` | 8.90:1 | Lolos | Judul, link, `.petunjuk`, tombol bahaya, navigasi aktif, status Terlambat |
| `--accent` | `--bg` | 5.20:1 | Lolos | Status positif |
| `--teks` | `--surface` | 8.71:1 | Lolos | Kolom Paket Terpilih di Komparasi |
| `--teks-lembut` | `--surface` | 5.74:1 | Lolos | Saat ini tidak dipakai (sel kosong di kolom terpilih memakai `--teks`) |
| `--primary` | `--surface` | 5.75:1 | Lolos | Saat ini tidak dipakai untuk teks. Garis fokus di kolom terpilih |
| `--accent` | `--surface` | 3.36:1 | Gagal untuk teks normal | Tidak dipakai: ditimpa `.kolom-dipilih .status-label`. Jangan dipakai |
| `--teks` | `#fff` | 15.33:1 | Lolos | Isian form |
| `--teks-lembut` | `#fff` | 10.10:1 | Lolos | Placeholder isian (`::placeholder`, `opacity: 1`) |
| `--primary` | `#fff` | 10.11:1 | Lolos | Belum dipakai |
| `#fff` | `--primary` | 10.11:1 | Lolos | Teks `.tombol-utama` |
| `#fff` 70% | `--primary` 70% di atas `--bg` | 4.88:1 | Lolos | `.tombol-utama:disabled` |
| `--primary` 70% | `--bg` | 4.46:1 | Di bawah 4.5:1 | `.tombol-bahaya:disabled`. Kontrol nonaktif dikecualikan WCAG 1.4.3 |
| `--teks` 70% | `--bg` | 5.37:1 | Lolos | `.tombol-sekunder:disabled` |
| `--garis` | `--bg` | 3.58:1 | Lolos (UI) | Border kartu, tombol sekunder, garis navigasi |
| `--garis` | `#fff` | 4.07:1 | Lolos (UI) | Border isian form |
| `--garis` | `--surface` | 2.31:1 | Di bawah 3:1 | Garis antar sel di kolom Paket Terpilih. Garis sel tabel bukan batas komponen yang wajib, kolomnya sudah dibedakan oleh latar dan label "Dipilih" |
| `--surface` | `--bg` | 1.55:1 | Bukan teks | Hanya latar kolom terpilih |
| `--primary` | `--bg` | 8.90:1 | Lolos (UI) | Garis fokus, bingkai Terlambat, bingkai dialog |
| `--accent` | `--bg` | 5.20:1 | Lolos (UI) | Bingkai `.pesan-berhasil` |
| `--primary` | backdrop dialog | 2.95:1 | Di bawah 3:1 | Bingkai luar dialog di atas backdrop. Tepi dialog tetap terlihat dari latar dialog terhadap backdrop (3.01:1) |
| Placeholder bawaan Chromium `#757575` | `#fff` | 4.61:1 | Lolos | Tidak dipakai lagi, ditimpa `::placeholder` |
| Placeholder bawaan WebKit `darkGray` `#a9a9a9` | `#fff` | 2.35:1 | Gagal | Tidak dipakai lagi, ditimpa `::placeholder` |
| Placeholder bawaan Firefox (teks 54%) | `#fff` | 3.49:1 | Gagal | Tidak dipakai lagi, ditimpa `::placeholder` dengan `opacity: 1` |

Catatan:
- Placeholder memakai `--teks-lembut` (10.10:1 di atas `#fff`) dengan `opacity: 1`, sama di semua browser. Bedanya dengan isian asli (`--teks`, 15.33:1) hanya selisih gelap terang, jadi teks placeholder sebaiknya tetap diawali "Contoh:". Tampilannya di Safari dan Firefox belum dicek.
- `--garis` (3.58:1) tidak boleh dipakai untuk teks.
