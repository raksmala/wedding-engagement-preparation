-- Bucket privat untuk lampiran Paket, Kontrak, dan Pembayaran. Path: {tabel}/{id}/{namaFile}.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lampiran',
  'lampiran',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Tanpa policy untuk anon, jadi anon tidak bisa membaca atau menulis.
drop policy if exists lampiran_baca_editor on storage.objects;
drop policy if exists lampiran_unggah_editor on storage.objects;
drop policy if exists lampiran_hapus_editor on storage.objects;
create policy lampiran_baca_editor on storage.objects for select to authenticated
  using (bucket_id = 'lampiran' and public.is_editor());
create policy lampiran_unggah_editor on storage.objects for insert to authenticated
  with check (bucket_id = 'lampiran' and public.is_editor());
create policy lampiran_hapus_editor on storage.objects for delete to authenticated
  using (bucket_id = 'lampiran' and public.is_editor());
