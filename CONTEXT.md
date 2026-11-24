# Rendy & Dinar

Aplikasi pencatat persiapan lamaran dan pernikahan Rendy dan Dinar. Semua vendor, pembayaran, tugas, tamu, dan barang hantaran dicatat di satu tempat supaya tidak ada yang terlewat.

## Language

### Orang dan pihak

**Editor**:
Orang yang bisa login dan mengubah data. Hanya ada dua: Rendy (pengantin pria) dan Dinar (pengantin wanita).
_Avoid_: admin, user, akun

**Pihak**:
Sumber dana atau pembeli. Default: Rendy, Dinar, Keluarga Pria, Keluarga Wanita, Lainnya. Daftarnya bisa diedit.
_Avoid_: payer, penyandang dana, sponsor

**Pembaca**:
Orang yang membuka Share Link, biasanya keluarga. Hanya bisa melihat, tidak bisa login, dan tidak bisa mengubah data.
_Avoid_: tamu (Tamu adalah undangan acara), viewer, penonton

**Share Link**:
Tautan read-only yang dibuat Editor untuk Pembaca. Bagian yang ditampilkan dipilih per link, dan link bisa dicabut.
_Avoid_: public link, link publik

### Acara

**Acara**:
Satu rangkaian kegiatan dengan tanggal, lokasi, dan vendornya sendiri. Saat ini ada Lamaran, Akad, Resepsi, dan Ngunduh Mantu.
_Avoid_: event, hari H

**Tanggal belum pasti**:
Status Acara yang tanggalnya belum ditetapkan. Acara tetap bisa punya vendor, tugas, dan tamu.
_Avoid_: TBD, tentatif

### Vendor

**Vendor**:
Penyedia jasa atau barang untuk satu atau beberapa Acara, dari tahap kandidat sampai selesai.
_Avoid_: supplier, rekanan

**Kategori Vendor**:
Jenis layanan vendor, misalnya Dekorasi atau MUA. Setiap Vendor punya satu kategori.
_Avoid_: tipe, jenis vendor

**Status Vendor**:
Posisi Vendor dalam proses pemilihan: Kandidat, Survei/Nego, Booked, Selesai, atau Batal.
_Avoid_: tahap, stage

**Paket**:
Satu penawaran dari Vendor, berisi nama, harga, dan isi. Satu Vendor bisa punya beberapa Paket.
_Avoid_: penawaran, opsi, pricelist

**Komponen**:
Butir pembanding yang ditentukan per Kategori Vendor, misalnya "durasi" untuk Foto & Video. Setiap Paket mengisi nilai untuk tiap Komponen.
_Avoid_: fitur, spesifikasi, atribut

**Komparasi**:
Tampilan Paket dari beberapa Vendor dalam satu Kategori Vendor secara berdampingan, sejajar per Komponen.
_Avoid_: perbandingan, compare

**Paket Terpilih**:
Paket yang dipilih Editor. Memilihnya membuat Vendor menjadi Booked.
_Avoid_: paket final, deal

**Log Kontak**:
Catatan satu kali komunikasi dengan Vendor: tanggal, saluran, dan isi kesepakatan.
_Avoid_: chat, riwayat, histori

### Uang

**Kontrak**:
Kesepakatan harga dengan Vendor yang sudah Booked. Satu Vendor punya satu Kontrak, dan totalnya adalah jumlah semua Alokasi Acara.
_Avoid_: deal, invoice, tagihan

**Alokasi Acara**:
Bagian harga Kontrak untuk satu Acara. Vendor yang dipakai di dua Acara punya dua Alokasi Acara.
_Avoid_: rincian, split, porsi acara

**Pembayaran**:
Satu transfer ke Vendor untuk sebuah Kontrak, berjenis DP, Termin, atau Pelunasan. Pembayaran bisa masih Terjadwal atau sudah Dibayar.
_Avoid_: transaksi, cicilan

**Terjadwal**:
Pembayaran yang belum dibayar tetapi sudah punya nominal dan jatuh tempo.
_Avoid_: pending, rencana bayar

**Dibayar**:
Pembayaran yang sudah ditransfer, dengan tanggal bayar dan Pihak yang membayar.
_Avoid_: lunas (lunas berarti seluruh Kontrak selesai), paid

**Sisa Tagihan**:
Total Kontrak dikurangi jumlah Pembayaran yang sudah Dibayar.
_Avoid_: outstanding, utang

**Lunas**:
Kondisi Kontrak yang Sisa Tagihannya nol.
_Avoid_: selesai bayar

**Kontribusi**:
Jumlah uang yang sudah dikeluarkan satu Pihak, dari Pembayaran yang Dibayar dan Barang yang sudah dibeli.
_Avoid_: sumbangan, porsi

**Anggaran**:
Rencana pengeluaran per Kategori Vendor atau per Acara.
_Avoid_: budget plan, pagu

**Realisasi**:
Pengeluaran nyata yang dibandingkan dengan Anggaran, dihitung dari Kontrak, Pembayaran, dan harga Barang.
_Avoid_: aktual, spending

### Pekerjaan

**Tugas**:
Satu hal yang harus dikerjakan, dengan PIC dan jatuh tempo. Bisa terkait Vendor atau Acara.
_Avoid_: todo, task, follow-up (follow-up adalah salah satu jenis Tugas)

**PIC**:
Editor yang bertanggung jawab atas sebuah Tugas.
_Avoid_: assignee, penanggung jawab

**Jatuh Tempo**:
Tanggal paling lambat sebuah Tugas atau Pembayaran Terjadwal harus selesai.
_Avoid_: deadline, due date

**Terlambat**:
Tugas atau Pembayaran Terjadwal yang Jatuh Temponya sudah lewat tetapi belum selesai.
_Avoid_: overdue, telat

### Tamu (Fase 2)

**Tamu**:
Satu undangan, bisa satu orang atau satu keluarga, beserta jumlah orangnya. Setiap Tamu masuk satu Grup Tamu.
_Avoid_: guest, undangan (undangan adalah kartunya)

**Grup Tamu**:
Kelompok asal Tamu, misalnya Tamu Orang Tua Pria atau Teman Dinar. Setiap Grup Tamu punya satu Sisi. Daftarnya bisa diedit.
_Avoid_: kategori tamu, kelompok, jatah

**Sisi**:
Asal undangan dari pihak mempelai: Pria, Wanita, atau Bersama. Sisi ditentukan oleh Grup Tamu, bukan dipilih per Tamu. Berbeda dari Pihak, yang hanya dipakai untuk uang.
_Avoid_: pihak (untuk tamu)

**Undangan**:
Kartu fisik atau digital yang dikirim ke Tamu untuk satu Acara.
_Avoid_: invitation

**RSVP**:
Jawaban Tamu tentang kehadiran di satu Acara: Belum Jawab, Hadir, Tidak Hadir, atau Mungkin.
_Avoid_: konfirmasi

### Barang (Fase 2)

**Barang**:
Satu item dalam daftar Seserahan, Mahar, atau Hantaran Balasan.
_Avoid_: item, produk

**Seserahan**:
Daftar Barang dari pihak pria untuk pihak wanita. Diserahkan saat Resepsi.
_Avoid_: hantaran (tanpa keterangan)

**Mahar**:
Daftar Barang atau uang yang diberikan pengantin pria saat Akad.
_Avoid_: mas kawin

**Hantaran Balasan**:
Daftar Barang dari pihak wanita untuk pihak pria.
_Avoid_: balasan seserahan
