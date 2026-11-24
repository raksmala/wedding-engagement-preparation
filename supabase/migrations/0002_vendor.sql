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
-- Relasi Vendor-Acara tidak punya isi yang bisa diubah: hanya ditambah atau dilepas.
revoke update on vendor_acara from authenticated;
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

-- Simpan Vendor beserta relasi Acara dalam satu transaksi.
-- security invoker: RLS dan trigger audit tetap berlaku. Gagal di mana pun berarti tidak ada yang tertulis.
create function simpan_vendor(p_id uuid, p_data jsonb, p_acara_ids uuid[])
returns uuid
language plpgsql security invoker set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into vendor (nama, kategori_vendor_id, nama_kontak, whatsapp, instagram, link, catatan)
    values (
      p_data ->> 'nama',
      (p_data ->> 'kategori_vendor_id')::uuid,
      p_data ->> 'nama_kontak',
      p_data ->> 'whatsapp',
      p_data ->> 'instagram',
      p_data ->> 'link',
      p_data ->> 'catatan'
    )
    returning id into v_id;
  else
    update vendor set
      nama = p_data ->> 'nama',
      kategori_vendor_id = (p_data ->> 'kategori_vendor_id')::uuid,
      nama_kontak = p_data ->> 'nama_kontak',
      whatsapp = p_data ->> 'whatsapp',
      instagram = p_data ->> 'instagram',
      link = p_data ->> 'link',
      catatan = p_data ->> 'catatan'
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'vendor_tidak_ditemukan';
    end if;
  end if;

  -- Tambah relasi baru dulu, lalu lepas yang tidak dipilih lagi.
  insert into vendor_acara (vendor_id, acara_id)
  select v_id, a from (select distinct unnest(coalesce(p_acara_ids, '{}')) as a) x
  on conflict do nothing;

  delete from vendor_acara
  where vendor_id = v_id and not (acara_id = any (coalesce(p_acara_ids, '{}')));

  return v_id;
end;
$$;

revoke all on function simpan_vendor(uuid, jsonb, uuid[]) from public, anon;
grant execute on function simpan_vendor(uuid, jsonb, uuid[]) to authenticated;

-- Paket dan Komponen pembanding.

create type tipe_komponen as enum ('teks', 'angka', 'ya_tidak');
create type status_paket as enum ('aktif', 'dipilih', 'tidak_dipilih');

create table komponen (
  id uuid primary key default gen_random_uuid(),
  kategori_vendor_id uuid not null references kategori_vendor (id) on delete cascade,
  nama text not null check (btrim(nama) <> ''),
  tipe tipe_komponen not null,
  satuan text,
  urutan int not null default 0,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null,
  unique (kategori_vendor_id, nama)
);

create table paket (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendor (id) on delete cascade,
  nama text not null check (btrim(nama) <> ''),
  harga bigint not null check (harga >= 0),
  syarat_dp text,
  lain_lain text,
  catatan text,
  status status_paket not null default 'aktif',
  lampiran text[] not null default '{}',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null
);
create index paket_vendor_idx on paket (vendor_id);

create table nilai_komponen (
  paket_id uuid not null references paket (id) on delete cascade,
  komponen_id uuid not null references komponen (id) on delete cascade,
  nilai text not null,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null,
  primary key (paket_id, komponen_id)
);
create index nilai_komponen_komponen_idx on nilai_komponen (komponen_id);

create trigger audit before insert or update on komponen
  for each row execute function isi_audit();
create trigger audit before insert or update on paket
  for each row execute function isi_audit();
create trigger audit before insert or update on nilai_komponen
  for each row execute function isi_audit();

-- Komponen hanya boleh diisi untuk Paket dari Vendor di kategori yang sama.
create function tolak_komponen_beda_kategori() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if (select k.kategori_vendor_id from komponen k where k.id = new.komponen_id)
     is distinct from
     (select v.kategori_vendor_id from paket p join vendor v on v.id = p.vendor_id where p.id = new.paket_id)
  then
    raise exception 'komponen_beda_kategori';
  end if;
  return new;
end;
$$;

create trigger komponen_beda_kategori before insert or update of paket_id, komponen_id on nilai_komponen
  for each row execute function tolak_komponen_beda_kategori();

-- Kategori Vendor tidak boleh berubah selama Paketnya sudah punya nilai Komponen.
create function tolak_kategori_terkunci() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if new.kategori_vendor_id is distinct from old.kategori_vendor_id and exists (
    select 1 from nilai_komponen n join paket p on p.id = n.paket_id where p.vendor_id = new.id
  ) then
    raise exception 'kategori_terkunci';
  end if;
  return new;
end;
$$;

create trigger kategori_terkunci before update of kategori_vendor_id on vendor
  for each row execute function tolak_kategori_terkunci();

alter table komponen enable row level security;
alter table paket enable row level security;
alter table nilai_komponen enable row level security;

revoke all on komponen, paket, nilai_komponen from anon;
grant select, insert, update, delete on komponen, paket, nilai_komponen to authenticated;
grant all on komponen, paket, nilai_komponen to service_role;

create policy komponen_editor on komponen for all to authenticated
  using (is_editor()) with check (is_editor());
create policy paket_editor on paket for all to authenticated
  using (is_editor()) with check (is_editor());
create policy nilai_komponen_editor on nilai_komponen for all to authenticated
  using (is_editor()) with check (is_editor());

-- Simpan Paket beserta nilai Komponennya dalam satu transaksi.
-- p_nilai berbentuk {komponen_id: nilai}. Nilai kosong setelah trim menghapus barisnya.
-- security invoker: RLS dan trigger (audit, komponen_beda_kategori) tetap berlaku.
create function simpan_paket(p_id uuid, p_vendor_id uuid, p_data jsonb, p_nilai jsonb)
returns uuid
language plpgsql security invoker set search_path = public
as $$
declare
  v_id uuid;
  r record;
begin
  if p_id is null then
    insert into paket (vendor_id, nama, harga, syarat_dp, lain_lain, catatan)
    values (
      p_vendor_id,
      p_data ->> 'nama',
      (p_data ->> 'harga')::bigint,
      p_data ->> 'syarat_dp',
      p_data ->> 'lain_lain',
      p_data ->> 'catatan'
    )
    returning id into v_id;
  else
    update paket set
      nama = p_data ->> 'nama',
      harga = (p_data ->> 'harga')::bigint,
      syarat_dp = p_data ->> 'syarat_dp',
      lain_lain = p_data ->> 'lain_lain',
      catatan = p_data ->> 'catatan'
    where id = p_id and vendor_id = p_vendor_id
    returning id into v_id;
    if v_id is null then
      raise exception 'paket_tidak_ditemukan';
    end if;
  end if;

  for r in select key, value from jsonb_each_text(coalesce(p_nilai, '{}'::jsonb)) loop
    if btrim(r.value) = '' then
      delete from nilai_komponen where paket_id = v_id and komponen_id = r.key::uuid;
    else
      insert into nilai_komponen (paket_id, komponen_id, nilai)
      values (v_id, r.key::uuid, btrim(r.value))
      on conflict (paket_id, komponen_id) do update set nilai = excluded.nilai;
    end if;
  end loop;

  return v_id;
end;
$$;

-- Atur urutan Komponen satu kategori dalam satu pernyataan.
create function urutkan_komponen(p_kategori_id uuid, p_urutan uuid[])
returns void
language plpgsql security invoker set search_path = public
as $$
declare
  v_jumlah int;
begin
  update komponen k set urutan = x.ord
  from unnest(p_urutan) with ordinality as x(id, ord)
  where k.id = x.id and k.kategori_vendor_id = p_kategori_id;
  get diagnostics v_jumlah = row_count;
  if v_jumlah <> coalesce(array_length(p_urutan, 1), 0) then
    raise exception 'komponen_tidak_ditemukan';
  end if;
end;
$$;

revoke all on function simpan_paket(uuid, uuid, jsonb, jsonb), urutkan_komponen(uuid, uuid[]) from public, anon;
grant execute on function simpan_paket(uuid, uuid, jsonb, jsonb), urutkan_komponen(uuid, uuid[]) to authenticated;

-- Paket tidak pernah pindah Vendor dan Komponen tidak pernah pindah kategori.
-- Ini menjaga aturan komponen_beda_kategori dari update langsung ke tabel.
create function tolak_paket_pindah_vendor() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if new.vendor_id <> old.vendor_id then
    raise exception 'paket_pindah_vendor';
  end if;
  return new;
end;
$$;

create trigger paket_pindah_vendor before update of vendor_id on paket
  for each row execute function tolak_paket_pindah_vendor();

create function tolak_komponen_pindah_kategori() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if new.kategori_vendor_id <> old.kategori_vendor_id then
    raise exception 'komponen_pindah_kategori';
  end if;
  return new;
end;
$$;

create trigger komponen_pindah_kategori before update of kategori_vendor_id on komponen
  for each row execute function tolak_komponen_pindah_kategori();
