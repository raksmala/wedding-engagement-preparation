# PRD: Rendy & Dinar

Dokumen kebutuhan produk. Istilah mengikuti [CONTEXT.md](../CONTEXT.md). Struktur data ada di [data-model.md](data-model.md), arah visual di [DESIGN.md](../DESIGN.md).

Ditulis 24 November 2026.

## Masalah

Persiapan lamaran dan pernikahan tersebar di chat WhatsApp, catatan, dan ingatan. Akibatnya:

- Penawaran vendor harus dibandingkan dengan membuka chat satu per satu.
- Tidak ada satu tempat yang menjawab "sudah DP berapa, siapa yang bayar, sisa berapa, kapan jatuh tempo".
- Follow-up ke vendor mudah terlewat karena tidak ada pengingat.
- Keluarga bertanya progres lewat chat karena tidak bisa melihat sendiri.

## Tujuan

1. Setiap Vendor, Pembayaran, dan Tugas tercatat di satu aplikasi yang dipakai bersama oleh Rendy dan Dinar.
2. Setiap pagi, dashboard menjawab: apa yang harus dikerjakan hari ini, minggu ini, dan apa yang sudah Terlambat.
3. Penawaran vendor dalam satu kategori bisa dibandingkan dalam satu layar.
4. Kontribusi tiap Pihak bisa dilihat tanpa menghitung manual.
5. Keluarga bisa melihat progres lewat Share Link tanpa melihat data yang tidak ingin dibagikan.

## Pengguna

| Peran | Siapa | Akses |
|---|---|---|
| Editor | Rendy, Dinar | Login Google, bisa membuat dan mengubah semua data |
| Pembaca | Keluarga | Lewat Share Link, hanya melihat bagian yang dipilih |

Hanya dua alamat email Google yang diizinkan login. Email lain ditolak walaupun berhasil login Google.

## Konteks waktu

| Acara | Tanggal | Kondisi |
|---|---|---|
| Lamaran | Desember 2026 | 90% siap, tersisa beberapa follow-up |
| Akad | Belum pasti, di hari yang sama dengan Resepsi | |
| Resepsi | Belum pasti | Seserahan diserahkan di sini |
| Ngunduh Mantu | Belum pasti | |

Fase 1 harus bisa dipakai sebelum Lamaran, target 1 sampai 2 minggu sejak eksekusi dimulai.

## Scope

### Fase 1

**Acara**
- Membuat, mengubah, dan menghapus Acara: nama, jenis, tanggal atau status Tanggal belum pasti, lokasi, catatan.
- Empat Acara dibuat otomatis saat pertama kali dipakai: Lamaran, Akad, Resepsi, Ngunduh Mantu.

**Vendor**
- Daftar Vendor yang bisa difilter per Kategori Vendor, Status Vendor, dan Acara.
- Satu Vendor bisa terhubung ke lebih dari satu Acara.
- Kategori Vendor default bisa diedit: Venue, Katering, Dekorasi, MUA, Busana, Foto & Video, WO/MC, Hiburan, Undangan, Souvenir, Cincin, Hias Seserahan, Lainnya.
- Status Vendor berurutan: Kandidat, Survei/Nego, Booked, Selesai. Batal bisa dipilih dari status mana saja.
- Kontak vendor: nama kontak, nomor WhatsApp (dengan tombol buka chat), Instagram, link lain, catatan.

**Paket dan Komparasi**
- Setiap Vendor bisa punya banyak Paket: nama, harga, syarat DP, catatan, lampiran foto atau PDF pricelist.
- Komponen ditentukan per Kategori Vendor dan bisa ditambah kapan saja. Setiap Paket mengisi nilai per Komponen, plus satu kolom "lain-lain" berupa teks bebas.
- Halaman Komparasi: pilih satu Kategori Vendor (dan opsional satu Acara), lalu Paket dari semua Vendor di kategori itu tampil berdampingan. Baris pertama harga, lalu satu baris per Komponen, lalu syarat DP dan lain-lain. Komponen yang belum diisi tampil kosong dengan jelas, bukan disembunyikan.
- Tombol "Pilih paket ini" membuat:
  - Paket itu menjadi Paket Terpilih
  - Vendornya menjadi Booked
  - Kontrak baru dengan Alokasi Acara dari harga Paket (nominalnya bisa diubah)
  - Paket lain di kategori yang sama untuk Acara yang sama ditandai "tidak dipilih", datanya tetap disimpan. Kandidat untuk Acara lain tidak terpengaruh.
  - Vendor lain di kategori dan Acara yang sama tidak diubah otomatis. Editor menandai Batal sendiri.

**Log Kontak**
- Setiap Vendor punya Log Kontak: tanggal, saluran (WhatsApp, telepon, bertemu, email), isi.
- Dari satu Log Kontak, Editor bisa langsung membuat Tugas follow-up yang terhubung ke Vendor tersebut.

**Kontrak dan Pembayaran**
- Satu Kontrak per Vendor yang Booked. Isinya Alokasi Acara, tanggal kesepakatan, dan lampiran.
- Alokasi Acara: harga untuk tiap Acara yang dilayani Vendor. Total Kontrak adalah jumlah semua Alokasi Acara dan tidak diinput terpisah.
- Vendor yang hanya melayani satu Acara mendapat satu Alokasi Acara secara otomatis, senilai harga Paket. Vendor yang melayani beberapa Acara harus diisi harganya per Acara saat memilih Paket.
- Biaya tambahan di tengah jalan dicatat dengan mengubah Alokasi Acara yang bersangkutan, bukan dengan membuat Kontrak kedua.
- Pembayaran per Kontrak: jenis (DP, Termin, Pelunasan), nominal, Jatuh Tempo, status Terjadwal atau Dibayar.
- Saat ditandai Dibayar, tanggal bayar dan Pihak wajib diisi. Foto bukti transfer opsional.
- Sisa Tagihan dan status Lunas dihitung otomatis, tidak diinput.
- Rekap Kontribusi per Pihak: total, dan rincian per Vendor.

**Tugas**
- Tugas: judul, catatan, PIC (Rendy atau Dinar), Jatuh Tempo, status (Belum, Selesai), terkait Vendor atau Acara (opsional).
- Daftar Tugas bisa difilter per PIC, Acara, dan Vendor.

**Dashboard**
- Tiga kelompok: Terlambat, Hari ini, 7 hari ke depan.
- Isinya Tugas yang Belum dan Pembayaran yang Terjadwal, diurutkan berdasarkan Jatuh Tempo.
- Setiap item bisa diselesaikan langsung dari dashboard (tandai Tugas selesai, tandai Pembayaran Dibayar).

**Share Link**
- Editor membuat link dengan label dan memilih bagian yang ditampilkan: Acara, Vendor, Tugas, Keuangan. Keuangan tidak dicentang secara default.
- Link bisa dicabut. Link yang dicabut menampilkan halaman "Link ini sudah tidak aktif".
- Bukti transfer dan lampiran Kontrak tidak pernah tampil lewat Share Link, walaupun Keuangan dicentang.

**Pengaturan**
- Mengubah label Pihak dan Kategori Vendor.

**Umum**
- PWA yang bisa di-install di HP, layout dirancang dari layar HP dulu.
- Setiap data mencatat "dicatat oleh" dan "terakhir diubah oleh" beserta waktunya.
- Bahasa Indonesia, mata uang Rupiah dengan format `Rp 1.500.000`.
- Setiap daftar punya tampilan kosong, loading, dan error.

### Fase 2

**Tamu dan Undangan** (hanya tracking, tanpa RSVP online)
- Tamu: nama, Grup Tamu, jumlah orang, nomor HP, alamat, jenis undangan (fisik, digital, keduanya), catatan.
- Grup Tamu default bisa diedit. Setiap grup punya Sisi:

  | Grup Tamu | Sisi |
  |---|---|
  | Teman Rendy | Pria |
  | Teman Dinar | Wanita |
  | Tamu Orang Tua Pria | Pria |
  | Tamu Orang Tua Wanita | Wanita |
  | Teman Bersama | Bersama |
- Per Tamu per Acara: diundang atau tidak, status kirim, RSVP, jumlah yang hadir, souvenir sudah diberikan atau belum.
- Rekap per Acara: jumlah undangan, jumlah orang, dan jumlah yang Hadir, dengan rincian per Grup Tamu dan per Sisi.

**Seserahan, Mahar, Hantaran Balasan**
- Tiga daftar terpisah dengan struktur yang sama.
- Barang: nama, kategori, anggaran, harga asli, Pihak pembeli, status (Belum beli, Sudah beli, Sudah dihias, Sudah diserahkan), link toko, foto.

**Anggaran**
- Anggaran total, per Kategori Vendor, dan per Acara.
- Realisasi diambil otomatis dari Kontrak, Pembayaran, dan harga Barang, tanpa input ganda. Realisasi per Acara memakai Alokasi Acara.
- Tampilan rencana vs realisasi, dengan selisih per baris.

## Di luar scope

- Denah meja
- Notifikasi push, email, atau WhatsApp (pengingat hanya di dalam aplikasi)
- Import data dari spreadsheet atau chat
- Mode gelap
- RSVP online atau pembuatan undangan digital
- Aplikasi native Android atau iOS
- Riwayat perubahan lengkap (cukup "terakhir diubah oleh")
- Mode offline
- Logo gambar dan foto profil

## Teknologi

| Bagian | Pilihan | Alasan |
|---|---|---|
| Frontend | Next.js, PWA | Satu codebase untuk HP dan laptop, bisa di-install tanpa Play Store |
| Database | Supabase Postgres | Data saling berelasi (Vendor, Paket, Kontrak, Pembayaran), cocok dengan database relasional |
| Login | Supabase Auth, Google | Rendy dan Dinar sudah punya akun Google |
| File | Supabase Storage, bucket privat | Bukti transfer dan kontrak hanya bisa dibuka lewat signed URL |
| Hosting | Vercel | Free tier cukup untuk 2 Editor |

Keamanan:
- Row Level Security aktif di semua tabel. Hanya dua email Editor yang bisa membaca dan menulis.
- Share Link memakai token acak dan dibaca di server. Server hanya mengembalikan bagian yang dicentang.

## Kriteria selesai Fase 1

1. Rendy dan Dinar bisa login dari HP masing-masing dan melihat data yang sama.
2. Email Google lain ditolak.
3. Semua vendor Lamaran yang sudah ada bisa diinput lengkap dengan Kontrak dan Pembayarannya.
4. Komparasi menampilkan minimal tiga Paket dari Vendor berbeda secara sejajar per Komponen, dan terbaca di layar HP.
5. Pembayaran Terjadwal yang lewat Jatuh Tempo muncul di kelompok Terlambat.
6. Rekap Kontribusi per Pihak sama dengan hasil hitung manual dari data yang diinput.
7. Share Link tanpa centang Keuangan tidak memuat nominal apa pun, termasuk di response API.
8. Lolos Delivery Gate antislop.

## Keputusan yang sudah dikonfirmasi

Dikonfirmasi Rendy pada 24 November 2026.

1. **Kontribusi menghitung Barang.** Harga Barang yang sudah dibeli ikut masuk Kontribusi Pihak pembelinya, bukan hanya Pembayaran ke Vendor.
2. **Satu Kontrak per Vendor.** Biaya tambahan dicatat dengan mengubah Kontrak yang ada, bukan dengan membuat Kontrak kedua.
3. **Harga dipisah per Acara.** Vendor yang dipakai di beberapa Acara punya harga per Acara, dicatat sebagai Alokasi Acara. Pembayaran tetap dicatat per Kontrak, bukan per Acara.
4. **Tamu dikelompokkan per Grup Tamu.** Sisi Tamu (Pria, Wanita, Bersama) adalah daftar yang berbeda dari Pihak pembayar. Sisi ditentukan oleh Grup Tamu, misalnya Tamu Orang Tua Pria masuk Sisi Pria.
