-- Tugas: hal yang harus dikerjakan, dengan PIC dan Jatuh Tempo.
-- Bisa terkait Vendor, Acara, dan Log Kontak asal follow-up.

create type status_tugas as enum ('belum', 'selesai');

create table tugas (
  id uuid primary key default gen_random_uuid(),
  judul text not null check (btrim(judul) <> ''),
  catatan text,
  pic_id uuid not null references editor (id) on delete restrict,
  jatuh_tempo date,
  status status_tugas not null default 'belum',
  selesai_pada timestamptz,
  -- Tugas tetap ada walaupun Vendor, Acara, atau Log Kontak asalnya dihapus.
  vendor_id uuid references vendor (id) on delete set null,
  acara_id uuid references acara (id) on delete set null,
  log_kontak_id uuid references log_kontak (id) on delete set null,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null
);
create index tugas_pic_idx on tugas (pic_id);
create index tugas_vendor_idx on tugas (vendor_id);
create index tugas_acara_idx on tugas (acara_id);
create index tugas_log_kontak_idx on tugas (log_kontak_id);
create index tugas_belum_jatuh_tempo_idx on tugas (jatuh_tempo) where status = 'belum';

create trigger audit before insert or update on tugas
  for each row execute function isi_audit();

-- selesai_pada diisi database, bukan aplikasi: terisi saat status jadi selesai,
-- kosong lagi saat dibuka kembali, dan tidak bisa diubah langsung.
create function isi_selesai_pada() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if new.status = 'selesai' then
    if tg_op = 'INSERT' or old.status <> 'selesai' then
      new.selesai_pada := now();
    else
      new.selesai_pada := old.selesai_pada;
    end if;
  else
    new.selesai_pada := null;
  end if;
  return new;
end;
$$;

create trigger selesai_pada before insert or update on tugas
  for each row execute function isi_selesai_pada();

-- Tugas follow-up selalu milik Vendor yang sama dengan Log Kontak asalnya.
-- Vendor null tidak ditolak: saat Vendor dihapus, vendor_id dan log_kontak_id
-- dikosongkan oleh foreign key dalam urutan yang tidak pasti.
create function tolak_log_beda_vendor() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if new.log_kontak_id is not null and new.vendor_id is not null and new.vendor_id is distinct from (
    select l.vendor_id from log_kontak l where l.id = new.log_kontak_id
  ) then
    raise exception 'log_beda_vendor';
  end if;
  return new;
end;
$$;

create trigger log_milik_vendor before insert or update of vendor_id, log_kontak_id on tugas
  for each row execute function tolak_log_beda_vendor();

alter table tugas enable row level security;

revoke all on tugas from anon;
grant select, insert, update, delete on tugas to authenticated;
grant all on tugas to service_role;

create policy tugas_editor on tugas for all to authenticated
  using (is_editor()) with check (is_editor());
