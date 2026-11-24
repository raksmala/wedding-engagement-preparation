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
