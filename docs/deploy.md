# Panduan Deploy Fase 1

Langkah di file ini hanya bisa dikerjakan Rendy sendiri, karena butuh login ke Supabase, Google Cloud Console, dan Vercel. Jangan menulis key, password, atau email asli ke repo. Semua contoh di bawah memakai placeholder.

Istilah yang dipakai:

| Placeholder | Artinya |
|---|---|
| `<ref-dev>` | Project ref Supabase `rendy-dinar-dev` (dipakai test) |
| `<ref-prod>` | Project ref Supabase produksi yang baru dibuat |
| `<domain>` | Domain Vercel produksi, misalnya `rendy-dinar.vercel.app` |

## 0. Peringatan sebelum mulai

- `npx supabase db reset --linked` menghapus seluruh isi database **project yang sedang di-link**. Setelah langkah 6 (link ke produksi), selalu link kembali ke dev sebelum menjalankan perintah `--linked` lain. Cek dulu dengan `cat supabase/.temp/project-ref` dan pastikan isinya `<ref-dev>`.
- Test (`npx vitest run`, `npx playwright test`) hanya boleh berjalan terhadap project dev. Helper test menolak berjalan kalau `NEXT_PUBLIC_SUPABASE_URL` tidak memuat `SUPABASE_DEV_PROJECT_REF`, tetapi `db reset --linked` tidak punya penjaga itu.

## 1. Checklist sebelum deploy (di project dev)

Jalankan berurutan di laptop, dengan `.env.local` berisi key project dev dan CLI ter-link ke `<ref-dev>`.

- [ ] `cat supabase/.temp/project-ref` menampilkan `<ref-dev>`
- [ ] `npx supabase db reset --linked`: semua migration `0001` sampai `0006` berjalan tanpa error. Wajib, karena beberapa migration diubah langsung selama Fase 1.
- [ ] `npx supabase gen types typescript --linked > src/lib/database.types.ts`: types dibuat ulang dari skema terbaru. File ini sempat diedit tangan, jadi hasil generate bisa berbeda. Commit hasilnya.
- [ ] `npx tsc --noEmit`: tanpa error
- [ ] `npm run lint`: tanpa error
- [ ] `npx vitest run`: semua PASS
- [ ] `npx playwright test`: semua PASS
- [ ] `npm run build`: sukses, tanpa warning TypeScript

Kalau ada yang gagal, perbaiki dulu. Jangan lanjut ke produksi.

## 2. Buat project Supabase produksi

1. Buka dashboard Supabase, buat project baru, **terpisah** dari `rendy-dinar-dev`. Contoh nama: `rendy-dinar`.
2. Pilih region terdekat (misalnya Singapore) dan simpan password database di password manager. Password ini diminta saat `db push`.
3. Catat:
   - Project ref (`<ref-prod>`), terlihat di URL dashboard dan di Project Settings.
   - Project URL: `https://<ref-prod>.supabase.co`
   - Anon key (atau publishable key) dari Project Settings > API Keys.
4. Jangan menyalin service role key ke mana pun. Aplikasi produksi tidak memakainya (lihat langkah 5).

## 3. Buat OAuth Client Google

Di Google Cloud Console:

1. Buat project baru (atau pakai yang ada), misalnya `Rendy Dinar`.
2. Buka **Google Auth Platform** (dulu "OAuth consent screen"):
   - User type: External.
   - Nama aplikasi: `Rendy & Dinar`. Isi email dukungan dengan email Rendy.
   - Scope cukup bawaan: `openid`, `email`, `profile`.
   - Status publikasi boleh tetap **Testing**. Tambahkan dua email Editor sebagai test user. Ini lapisan penjaga tambahan, karena akun Google lain bahkan tidak bisa menyelesaikan layar izin Google. Penolakan utama tetap ada di database (`editor_diizinkan`).
3. Buka **Clients** (Credentials), buat **OAuth client ID** dengan tipe **Web application**:
   - Authorized JavaScript origins: `https://<domain>`
   - Authorized redirect URIs: `https://<ref-prod>.supabase.co/auth/v1/callback`
4. Simpan Client ID dan Client Secret.

Catatan: redirect URI di Google adalah alamat callback **Supabase**, bukan alamat aplikasi. Alamat aplikasi (`/auth/callback`) didaftarkan di Supabase pada langkah 4.

## 4. Atur Auth di Supabase produksi

Di dashboard project produksi, menu Authentication:

1. **Sign In / Providers > Google**: aktifkan, tempel Client ID dan Client Secret dari langkah 3, simpan.
2. **Sign In / Providers > Email**: matikan. Produksi hanya memakai Google. Login email hanya dipakai `/api/dev-login` di dev.
3. Biarkan "Allow new users to sign up" tetap aktif. Login Google pertama membuat user baru di `auth.users`. Yang menentukan boleh masuk atau tidak adalah tabel `editor_diizinkan`, bukan pengaturan ini.
4. **URL Configuration**:
   - Site URL: `https://<domain>`
   - Redirect URLs: tambahkan `https://<domain>/auth/callback`
   - Jangan tambahkan `localhost` di project produksi.

Tombol "Masuk dengan Google" mengirim `redirectTo: <origin>/auth/callback` (lihat `src/app/login/TombolGoogle.tsx`). Kalau alamat itu tidak ada di Redirect URLs, Supabase mengalihkan ke Site URL dan login gagal dengan pesan "Gagal masuk. Coba lagi."

## 5. Buat project Vercel dan isi env

1. Import repo ke Vercel. Framework preset: Next.js. Build command bawaan (`npm run build`). Node.js 20.9 atau lebih baru (syarat Next.js 16).
2. Isi Environment Variables untuk environment **Production** saja:

| Variabel dari `.env.example` | Produksi | Nilai |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Wajib | `https://<ref-prod>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Wajib | Anon key (atau publishable key) project produksi |
| `SUPABASE_SERVICE_ROLE_KEY` | **Jangan diisi** | Di kode aplikasi, key ini hanya dibaca `src/app/api/dev-login/route.ts`, dan route itu sudah mengembalikan 404 di produksi sebelum key dipakai. Pemakaian lainnya hanya di `tests/db/helpers.ts`. |
| `SUPABASE_DEV_PROJECT_REF` | **Jangan diisi** | Khusus penjaga dev-login dan test |
| `DEV_LOGIN` | **Jangan diisi** | Khusus dev-login. Harus tidak ada di produksi |

3. Jangan isi env yang sama untuk environment **Preview**. Kalau Preview memakai key produksi, setiap branch preview membaca dan menulis data asli. Kalau suatu saat butuh preview, pakai key project dev dan tambahkan domain preview ke Redirect URLs project dev.
4. Deploy. Catat `<domain>` final, lalu pastikan langkah 3 dan 4 memakai domain yang sama persis.

## 6. Terapkan migration ke produksi

Di laptop, dari root repo:

```bash
npx supabase link --project-ref <ref-prod>
npx supabase db push
```

- `db push` menerapkan `supabase/migrations/0001_dasar.sql` sampai `0006_storage.sql` dan meminta password database produksi.
- `supabase/seed.sql` tidak dijalankan oleh `db push`, dan memang tidak perlu (isinya hanya komentar).
- Data default (5 Pihak, 4 Acara, 13 Kategori Vendor) dibuat oleh migration.

Setelah selesai, **langsung link kembali ke dev**:

```bash
npx supabase link --project-ref <ref-dev>
cat supabase/.temp/project-ref   # harus <ref-dev>
```

## 7. Masukkan dua email Editor

Di dashboard produksi, buka SQL Editor dan jalankan (ganti placeholder dengan email Google asli Rendy dan Dinar, **huruf kecil semua**):

```sql
insert into editor_diizinkan (email) values
  ('email-rendy@example.com'),
  ('email-dinar@example.com');

select email from editor_diizinkan;
```

- Kolom `email` punya check `email = lower(email)`, jadi email berhuruf besar ditolak.
- Jangan menyimpan query berisi email asli di repo atau di file lain.

## 8. Cek bucket Storage

Di menu Storage project produksi, pastikan bucket `lampiran` ada (dibuat oleh `0006_storage.sql`):

- Public: **mati** (bucket privat)
- Batas ukuran file: 10 MB
- Tipe file: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Di tab Policies untuk `storage.objects` ada `lampiran_baca_editor`, `lampiran_unggah_editor`, dan `lampiran_hapus_editor`.

Kalau bucket tidak ada, `db push` belum berjalan sampai `0006`. Jangan membuat bucket lewat dashboard, ulangi `db push`.

## 9. Cek login pertama

1. Dari HP Rendy, buka `https://<domain>`. Harus dialihkan ke `/login`.
2. Ketuk "Masuk dengan Google", pilih akun Rendy. Harus kembali ke Dashboard. Karena belum ada data, Dashboard menampilkan "Belum ada jadwal yang perlu dikerjakan" dengan tombol "Tambah vendor".
3. Ulangi dari HP Dinar dengan akun Dinar.
4. Di SQL Editor produksi:

   ```sql
   select email, nama, pihak_id from editor;
   ```

   Harus ada dua baris. `pihak_id` terisi otomatis kalau kata pertama nama Google sama dengan nama Pihak ("Rendy" atau "Dinar"). Kalau kosong, isi manual:

   ```sql
   update editor set pihak_id = (select id from pihak where nama = 'Rendy')
   where email = 'email-rendy@example.com';
   ```

5. Coba login dengan akun Google lain (kalau consent screen masih Testing, tambahkan dulu akun itu sebagai test user, lalu hapus lagi setelah dicek). Harus kembali ke `/login` dengan pesan "Akun ini tidak terdaftar sebagai Editor." User itu tetap tercatat di Authentication > Users dan boleh dihapus dari sana.
6. Buka `https://<domain>/api/dev-login?email=rendy@test.local`. Harus 404.
7. Buat satu Share Link tanpa Keuangan, buka di jendela samaran. Tidak boleh ada teks "Rp". Cabut, lalu muat ulang. Harus tampil "Link ini sudah tidak aktif."
8. Unggah satu foto pricelist di sebuah Paket, lalu buka lampirannya. Harus terbuka lewat signed URL.

## 10. Aturan setelah deploy pertama

- Mulai dari deploy pertama, migration `0001` sampai `0006` **tidak boleh diubah lagi**. Setiap perubahan skema dibuat sebagai migration baru:

  ```bash
  npx supabase migration new nama_perubahan
  ```

- Alurnya: tulis migration baru, `db reset --linked` di dev, generate ulang types, jalankan semua test, lalu link ke produksi, `db push`, dan link kembali ke dev.
- `db reset` tidak pernah dijalankan ke produksi.
