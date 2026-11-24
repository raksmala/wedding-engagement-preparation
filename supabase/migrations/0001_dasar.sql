-- Skema dasar: allowlist Editor, Editor, Pihak, Acara, audit, dan RLS.

-- Allowlist email Editor. Diisi manual lewat dashboard Supabase.
-- RLS aktif tanpa policy: hanya service role dan fungsi security definer yang bisa membaca.
create table editor_diizinkan (
  email text primary key check (email = lower(email))
);
alter table editor_diizinkan enable row level security;
revoke all on editor_diizinkan from anon, authenticated;

create table pihak (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  urutan int not null default 0,
  arsip boolean not null default false,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);

create table editor (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null unique check (email = lower(email)),
  nama text not null,
  pihak_id uuid references pihak (id),
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);

alter table pihak
  add constraint pihak_dibuat_oleh_fk foreign key (dibuat_oleh) references editor (id) on delete set null,
  add constraint pihak_diubah_oleh_fk foreign key (diubah_oleh) references editor (id) on delete set null;
alter table editor
  add constraint editor_dibuat_oleh_fk foreign key (dibuat_oleh) references editor (id) on delete set null,
  add constraint editor_diubah_oleh_fk foreign key (diubah_oleh) references editor (id) on delete set null;

create type jenis_acara as enum ('lamaran', 'akad', 'resepsi', 'ngunduh_mantu', 'lainnya');

create table acara (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jenis jenis_acara not null,
  tanggal date,
  perkiraan text,
  lokasi text,
  catatan text,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null
);

-- Fungsi akses
-- Tidak memercayai klaim email di JWT: cari user di auth.users, wajib terkonfirmasi.
create function is_editor() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    join editor_diizinkan d on d.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

create function editor_saat_ini() returns uuid
language sql stable security definer set search_path = public
as $$
  select id from editor where auth_user_id = auth.uid();
$$;

create function pastikan_editor() returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_email text;
  v_nama text;
  v_id uuid;
begin
  if auth.uid() is null or not is_editor() then
    raise exception 'bukan_editor';
  end if;

  select lower(email) into v_email from auth.users where id = auth.uid();

  select id into v_id from editor where auth_user_id = auth.uid();
  if found then
    return v_id;
  end if;

  v_nama := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    initcap(split_part(v_email, '@', 1))
  );

  insert into editor (auth_user_id, email, nama, pihak_id)
  values (
    auth.uid(),
    v_email,
    v_nama,
    (select id from pihak where lower(nama) = lower(split_part(v_nama, ' ', 1)) limit 1)
  )
  on conflict (email) do update set auth_user_id = excluded.auth_user_id
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function is_editor(), editor_saat_ini(), pastikan_editor() from public, anon;
grant execute on function is_editor(), editor_saat_ini(), pastikan_editor() to authenticated;
-- Service role menulis tabel beraudit lewat isi_audit(), yang memanggil editor_saat_ini().
grant execute on function is_editor(), editor_saat_ini() to service_role;

-- Audit: kolom diisi trigger, bukan aplikasi.
create function isi_audit() returns trigger
language plpgsql set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.dibuat_pada := now();
    new.dibuat_oleh := editor_saat_ini();
  else
    new.dibuat_pada := old.dibuat_pada;
    new.dibuat_oleh := old.dibuat_oleh;
  end if;
  new.diubah_pada := now();
  new.diubah_oleh := editor_saat_ini();
  return new;
end;
$$;

create trigger audit before insert or update on pihak
  for each row execute function isi_audit();
create trigger audit before insert or update on editor
  for each row execute function isi_audit();
create trigger audit before insert or update on acara
  for each row execute function isi_audit();

-- RLS
alter table pihak enable row level security;
alter table editor enable row level security;
alter table acara enable row level security;

-- Project ini tidak memberi grant otomatis, jadi semua grant ditulis eksplisit.
revoke all on pihak, editor, acara from anon;
grant select, insert, update, delete on pihak, acara to authenticated;
grant select on editor to authenticated;
grant all on editor_diizinkan, pihak, editor, acara to service_role;

create policy pihak_editor on pihak for all to authenticated
  using (is_editor()) with check (is_editor());
create policy acara_editor on acara for all to authenticated
  using (is_editor()) with check (is_editor());
-- Baris editor hanya dibuat lewat pastikan_editor().
create policy editor_baca on editor for select to authenticated
  using (is_editor());

-- Data default
insert into pihak (nama, urutan) values
  ('Rendy', 1), ('Dinar', 2), ('Keluarga Pria', 3), ('Keluarga Wanita', 4), ('Lainnya', 5);

insert into acara (nama, jenis) values
  ('Lamaran', 'lamaran'), ('Akad', 'akad'), ('Resepsi', 'resepsi'), ('Ngunduh Mantu', 'ngunduh_mantu');
