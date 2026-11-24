-- Vendor: Kategori Vendor, Vendor, relasi ke Acara, dan Log Kontak.

create type status_vendor as enum ('kandidat', 'survei_nego', 'booked', 'selesai', 'batal');
create type saluran_kontak as enum ('whatsapp', 'telepon', 'bertemu', 'email', 'lainnya');

create table kategori_vendor (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  urutan int not null default 0,
  arsip boolean not null default false,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null
);

create table vendor (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori_vendor_id uuid not null references kategori_vendor (id) on delete restrict,
  status status_vendor not null default 'kandidat',
  nama_kontak text,
  whatsapp text,
  instagram text,
  link text,
  catatan text,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null
);
create index vendor_kategori_idx on vendor (kategori_vendor_id);
create index vendor_status_idx on vendor (status);

create table vendor_acara (
  vendor_id uuid not null references vendor (id) on delete cascade,
  acara_id uuid not null references acara (id) on delete restrict,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null,
  primary key (vendor_id, acara_id)
);
create index vendor_acara_acara_idx on vendor_acara (acara_id);

create table log_kontak (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendor (id) on delete cascade,
  tanggal date not null,
  saluran saluran_kontak not null,
  isi text not null,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null
);
create index log_kontak_vendor_idx on log_kontak (vendor_id);

create trigger audit before insert or update on kategori_vendor
  for each row execute function isi_audit();
create trigger audit before insert or update on vendor
  for each row execute function isi_audit();
create trigger audit before insert or update on vendor_acara
  for each row execute function isi_audit();
create trigger audit before insert or update on log_kontak
  for each row execute function isi_audit();

alter table kategori_vendor enable row level security;
alter table vendor enable row level security;
alter table vendor_acara enable row level security;
alter table log_kontak enable row level security;

revoke all on kategori_vendor, vendor, vendor_acara, log_kontak from anon;
grant select, insert, update, delete on kategori_vendor, vendor, vendor_acara, log_kontak to authenticated;
grant all on kategori_vendor, vendor, vendor_acara, log_kontak to service_role;

create policy kategori_vendor_editor on kategori_vendor for all to authenticated
  using (is_editor()) with check (is_editor());
create policy vendor_editor on vendor for all to authenticated
  using (is_editor()) with check (is_editor());
create policy vendor_acara_editor on vendor_acara for all to authenticated
  using (is_editor()) with check (is_editor());
create policy log_kontak_editor on log_kontak for all to authenticated
  using (is_editor()) with check (is_editor());

insert into kategori_vendor (nama, urutan) values
  ('Venue', 1), ('Katering', 2), ('Dekorasi', 3), ('MUA', 4), ('Busana', 5),
  ('Foto & Video', 6), ('WO/MC', 7), ('Hiburan', 8), ('Undangan', 9), ('Souvenir', 10),
  ('Cincin', 11), ('Hias Seserahan', 12), ('Lainnya', 13);
