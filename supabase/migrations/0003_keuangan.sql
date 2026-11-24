-- Keuangan: Kontrak, Alokasi Acara, Pembayaran, ringkasan, dan pilih_paket().

create type jenis_pembayaran as enum ('dp', 'termin', 'pelunasan');
create type status_pembayaran as enum ('terjadwal', 'dibayar');

create table kontrak (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null unique references vendor (id) on delete cascade,
  paket_id uuid references paket (id) on delete set null,
  tanggal_kesepakatan date,
  lampiran text[] not null default '{}',
  catatan text,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null
);
create index kontrak_paket_idx on kontrak (paket_id);

create table alokasi_acara (
  id uuid primary key default gen_random_uuid(),
  kontrak_id uuid not null references kontrak (id) on delete cascade,
  acara_id uuid not null references acara (id) on delete restrict,
  nominal bigint not null check (nominal >= 0),
  catatan text,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null,
  unique (kontrak_id, acara_id)
);
create index alokasi_acara_acara_idx on alokasi_acara (acara_id);

create table pembayaran (
  id uuid primary key default gen_random_uuid(),
  kontrak_id uuid not null references kontrak (id) on delete cascade,
  jenis jenis_pembayaran not null,
  nominal bigint not null check (nominal > 0),
  status status_pembayaran not null,
  jatuh_tempo date,
  tanggal_bayar date,
  pihak_id uuid references pihak (id) on delete restrict,
  bukti text[] not null default '{}',
  catatan text,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null,
  constraint pembayaran_dibayar_lengkap
    check (status <> 'dibayar' or (tanggal_bayar is not null and pihak_id is not null)),
  constraint pembayaran_terjadwal_lengkap
    check (status <> 'terjadwal' or jatuh_tempo is not null)
);
create index pembayaran_kontrak_idx on pembayaran (kontrak_id);
create index pembayaran_pihak_idx on pembayaran (pihak_id);

-- Satu Vendor hanya punya satu Paket berstatus dipilih.
create unique index paket_satu_dipilih_per_vendor on paket (vendor_id) where status = 'dipilih';

create trigger audit before insert or update on kontrak
  for each row execute function isi_audit();
create trigger audit before insert or update on alokasi_acara
  for each row execute function isi_audit();
create trigger audit before insert or update on pembayaran
  for each row execute function isi_audit();

alter table kontrak enable row level security;
alter table alokasi_acara enable row level security;
alter table pembayaran enable row level security;

revoke all on kontrak, alokasi_acara, pembayaran from anon;
grant select, insert, update, delete on kontrak, alokasi_acara, pembayaran to authenticated;
grant all on kontrak, alokasi_acara, pembayaran to service_role;

create policy kontrak_editor on kontrak for all to authenticated
  using (is_editor()) with check (is_editor());
create policy alokasi_acara_editor on alokasi_acara for all to authenticated
  using (is_editor()) with check (is_editor());
create policy pembayaran_editor on pembayaran for all to authenticated
  using (is_editor()) with check (is_editor());

-- Alokasi hanya boleh untuk Acara yang terhubung ke Vendor pemilik Kontrak.
create function tolak_alokasi_luar_vendor_acara() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if not exists (
    select 1
    from kontrak k
    join vendor_acara va on va.vendor_id = k.vendor_id
    where k.id = new.kontrak_id and va.acara_id = new.acara_id
  ) then
    raise exception 'acara_bukan_milik_vendor';
  end if;
  return new;
end;
$$;

create trigger acara_milik_vendor before insert or update of kontrak_id, acara_id on alokasi_acara
  for each row execute function tolak_alokasi_luar_vendor_acara();

-- Acara tidak boleh dilepas dari Vendor selama masih punya Alokasi di Kontrak Vendor itu.
-- Saat Vendor sendiri dihapus, relasinya ikut terhapus lewat cascade dan tidak ditolak.
create function tolak_lepas_acara_beralokasi() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if exists (select 1 from vendor v where v.id = old.vendor_id) and exists (
    select 1
    from alokasi_acara al
    join kontrak k on k.id = al.kontrak_id
    where k.vendor_id = old.vendor_id and al.acara_id = old.acara_id
  ) then
    raise exception 'acara_punya_alokasi';
  end if;
  return old;
end;
$$;

create trigger acara_punya_alokasi before delete on vendor_acara
  for each row execute function tolak_lepas_acara_beralokasi();

-- Vendor dengan Pembayaran dibayar tidak boleh dihapus, hanya ditandai batal.
create function tolak_hapus_vendor_berbayar() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if exists (
    select 1
    from kontrak k
    join pembayaran p on p.kontrak_id = k.id
    where k.vendor_id = old.id and p.status = 'dibayar'
  ) then
    raise exception 'vendor_punya_pembayaran';
  end if;
  return old;
end;
$$;

create trigger vendor_punya_pembayaran before delete on vendor
  for each row execute function tolak_hapus_vendor_berbayar();

-- Nilai turunan. Total, Terbayar, dan Sisa tidak disimpan.
create view ringkasan_kontrak with (security_invoker = true) as
select
  k.id as kontrak_id,
  k.vendor_id,
  t.total,
  b.terbayar,
  t.total - b.terbayar as sisa,
  t.total - b.terbayar <= 0 as lunas
from kontrak k
cross join lateral (
  select coalesce(sum(a.nominal), 0)::bigint as total
  from alokasi_acara a where a.kontrak_id = k.id
) t
cross join lateral (
  select coalesce(sum(p.nominal), 0)::bigint as terbayar
  from pembayaran p where p.kontrak_id = k.id and p.status = 'dibayar'
) b;

-- Pihak yang diarsipkan hanya tampil kalau punya Pembayaran dibayar.
create view kontribusi_pihak with (security_invoker = true) as
select
  ph.id as pihak_id,
  ph.nama,
  coalesce(sum(p.nominal) filter (where p.status = 'dibayar'), 0)::bigint as total
from pihak ph
left join pembayaran p on p.pihak_id = ph.id
group by ph.id, ph.nama, ph.arsip, ph.urutan
having not ph.arsip or count(*) filter (where p.status = 'dibayar') > 0;

create view kontribusi_pihak_vendor with (security_invoker = true) as
select
  ph.id as pihak_id,
  k.vendor_id,
  coalesce(sum(p.nominal) filter (where p.status = 'dibayar'), 0)::bigint as total
from kontrak k
cross join pihak ph
left join pembayaran p on p.kontrak_id = k.id and p.pihak_id = ph.id
group by ph.id, ph.arsip, k.vendor_id
having not ph.arsip or count(*) filter (where p.status = 'dibayar') > 0;

revoke all on ringkasan_kontrak, kontribusi_pihak, kontribusi_pihak_vendor from public, anon;
grant select on ringkasan_kontrak, kontribusi_pihak, kontribusi_pihak_vendor to authenticated;
grant select on ringkasan_kontrak, kontribusi_pihak, kontribusi_pihak_vendor to service_role;

-- Pilih Paket dalam satu transaksi.
-- p_alokasi berbentuk [{"acara_id": "...", "nominal": 3000000}]. Null dipakai untuk Vendor satu Acara.
-- security invoker: RLS dan trigger tetap berlaku. Gagal di mana pun berarti tidak ada yang tertulis.
create function pilih_paket(p_paket_id uuid, p_alokasi jsonb default null)
returns uuid
language plpgsql security invoker set search_path = public
as $$
declare
  v_vendor_id uuid;
  v_kategori_id uuid;
  v_harga bigint;
  v_acara_vendor uuid[];
  v_kontrak_id uuid;
  v_ids uuid[] := '{}';
  v_id uuid;
  e jsonb;
begin
  select p.vendor_id, p.harga, v.kategori_vendor_id
  into v_vendor_id, v_harga, v_kategori_id
  from paket p join vendor v on v.id = p.vendor_id
  where p.id = p_paket_id
  for update of p;
  if v_vendor_id is null then
    raise exception 'paket_tidak_ditemukan';
  end if;

  select coalesce(array_agg(acara_id), '{}') into v_acara_vendor
  from vendor_acara where vendor_id = v_vendor_id;

  if p_alokasi is null or jsonb_typeof(p_alokasi) = 'null' then
    if cardinality(v_acara_vendor) <> 1 then
      raise exception 'alokasi_wajib';
    end if;
    p_alokasi := jsonb_build_array(
      jsonb_build_object('acara_id', v_acara_vendor[1], 'nominal', v_harga)
    );
  end if;

  if jsonb_typeof(p_alokasi) <> 'array' then
    raise exception 'alokasi_tidak_valid';
  end if;
  if jsonb_array_length(p_alokasi) = 0 then
    raise exception 'alokasi_wajib';
  end if;

  for e in select * from jsonb_array_elements(p_alokasi) loop
    if jsonb_typeof(e) is distinct from 'object'
       or jsonb_typeof(e -> 'acara_id') is distinct from 'string'
       or (e ->> 'acara_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or jsonb_typeof(e -> 'nominal') is distinct from 'number'
       or (e ->> 'nominal')::numeric <> trunc((e ->> 'nominal')::numeric)
       or (e ->> 'nominal')::numeric < 0
       or (e ->> 'nominal')::numeric > 9000000000000000000
    then
      raise exception 'alokasi_tidak_valid';
    end if;
    v_id := (e ->> 'acara_id')::uuid;
    if v_id = any (v_ids) then
      raise exception 'alokasi_tidak_valid';
    end if;
    v_ids := v_ids || v_id;
    if not (v_id = any (v_acara_vendor)) then
      raise exception 'acara_bukan_milik_vendor';
    end if;
  end loop;

  -- Paket lain milik Vendor ini tidak lagi dipilih.
  update paket set status = 'tidak_dipilih'
  where vendor_id = v_vendor_id and id <> p_paket_id and status <> 'tidak_dipilih';
  update paket set status = 'dipilih' where id = p_paket_id;

  -- Paket aktif milik Vendor lain di kategori yang sama dan berbagi Acara ikut gugur.
  update paket set status = 'tidak_dipilih'
  where status = 'aktif'
    and vendor_id in (
      select v2.id
      from vendor v2
      where v2.kategori_vendor_id = v_kategori_id
        and v2.id <> v_vendor_id
        and exists (
          select 1
          from vendor_acara a2
          join vendor_acara a1 on a1.acara_id = a2.acara_id and a1.vendor_id = v_vendor_id
          where a2.vendor_id = v2.id
        )
    );

  update vendor set status = 'booked' where id = v_vendor_id;

  insert into kontrak (vendor_id, paket_id) values (v_vendor_id, p_paket_id)
  on conflict (vendor_id) do update set paket_id = excluded.paket_id
  returning id into v_kontrak_id;

  delete from alokasi_acara where kontrak_id = v_kontrak_id;
  insert into alokasi_acara (kontrak_id, acara_id, nominal)
  select v_kontrak_id, (x ->> 'acara_id')::uuid, (x ->> 'nominal')::bigint
  from jsonb_array_elements(p_alokasi) x;

  return v_kontrak_id;
end;
$$;

revoke all on function pilih_paket(uuid, jsonb) from public, anon;
grant execute on function pilih_paket(uuid, jsonb) to authenticated;

-- Kontrak tidak pindah Vendor, dan Paket-nya harus milik Vendor yang sama.
create function tolak_kontrak_pindah_vendor() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if new.vendor_id is distinct from old.vendor_id then
    raise exception 'kontrak_pindah_vendor';
  end if;
  return new;
end;
$$;

create trigger kontrak_pindah_vendor before update of vendor_id on kontrak
  for each row execute function tolak_kontrak_pindah_vendor();

create function tolak_paket_bukan_milik_vendor() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if new.paket_id is not null and not exists (
    select 1 from paket p where p.id = new.paket_id and p.vendor_id = new.vendor_id
  ) then
    raise exception 'paket_bukan_milik_vendor';
  end if;
  return new;
end;
$$;

create trigger paket_milik_vendor before insert or update of vendor_id, paket_id on kontrak
  for each row execute function tolak_paket_bukan_milik_vendor();

-- Setiap Kontrak minimal punya satu Alokasi Acara, dicek saat commit supaya
-- pilih_paket boleh menghapus lalu mengisi ulang barisnya.
create function pastikan_kontrak_beralokasi() returns trigger
language plpgsql security invoker set search_path = public
as $$
declare
  v_kontrak_id uuid;
begin
  if tg_table_name = 'kontrak' then
    v_kontrak_id := new.id;
  else
    v_kontrak_id := old.kontrak_id;
  end if;
  if exists (select 1 from kontrak k where k.id = v_kontrak_id)
     and not exists (select 1 from alokasi_acara a where a.kontrak_id = v_kontrak_id) then
    raise exception 'kontrak_tanpa_alokasi';
  end if;
  return null;
end;
$$;

create constraint trigger kontrak_beralokasi after insert on kontrak
  deferrable initially deferred
  for each row execute function pastikan_kontrak_beralokasi();
create constraint trigger kontrak_beralokasi_hapus after delete or update of kontrak_id on alokasi_acara
  deferrable initially deferred
  for each row execute function pastikan_kontrak_beralokasi();

-- Aturan p_alokasi yang sama dengan pilih_paket, dipakai simpan_kontrak dan simpan_alokasi:
-- minimal satu baris, acara unik dan milik Vendor, nominal bilangan bulat >= 0.
create function periksa_alokasi(p_vendor_id uuid, p_alokasi jsonb)
returns void
language plpgsql security invoker set search_path = public
as $$
declare
  v_acara_vendor uuid[];
  v_ids uuid[] := '{}';
  v_id uuid;
  e jsonb;
begin
  if p_alokasi is null or jsonb_typeof(p_alokasi) <> 'array' then
    raise exception 'alokasi_tidak_valid';
  end if;
  if jsonb_array_length(p_alokasi) = 0 then
    raise exception 'alokasi_wajib';
  end if;

  select coalesce(array_agg(acara_id), '{}') into v_acara_vendor
  from vendor_acara where vendor_id = p_vendor_id;

  for e in select * from jsonb_array_elements(p_alokasi) loop
    if jsonb_typeof(e) is distinct from 'object'
       or jsonb_typeof(e -> 'acara_id') is distinct from 'string'
       or (e ->> 'acara_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or jsonb_typeof(e -> 'nominal') is distinct from 'number'
       or (e ->> 'nominal')::numeric <> trunc((e ->> 'nominal')::numeric)
       or (e ->> 'nominal')::numeric < 0
       or (e ->> 'nominal')::numeric > 9000000000000000000
    then
      raise exception 'alokasi_tidak_valid';
    end if;
    v_id := (e ->> 'acara_id')::uuid;
    if v_id = any (v_ids) then
      raise exception 'alokasi_tidak_valid';
    end if;
    v_ids := v_ids || v_id;
    if not (v_id = any (v_acara_vendor)) then
      raise exception 'acara_bukan_milik_vendor';
    end if;
  end loop;
end;
$$;

-- Kontrak manual untuk Vendor tanpa Paket. p_data: {"tanggal_kesepakatan": "2026-12-01", "catatan": "..."}.
-- Kontrak dan Alokasi Acara-nya ditulis dalam satu transaksi.
create function simpan_kontrak(p_vendor_id uuid, p_data jsonb, p_alokasi jsonb)
returns uuid
language plpgsql security invoker set search_path = public
as $$
declare
  v_kontrak_id uuid;
begin
  perform 1 from vendor where id = p_vendor_id for update;
  if not found then
    raise exception 'vendor_tidak_ditemukan';
  end if;
  if exists (select 1 from kontrak where vendor_id = p_vendor_id) then
    raise exception 'kontrak_sudah_ada';
  end if;

  perform periksa_alokasi(p_vendor_id, p_alokasi);

  insert into kontrak (vendor_id, tanggal_kesepakatan, catatan)
  values (
    p_vendor_id,
    nullif(p_data ->> 'tanggal_kesepakatan', '')::date,
    nullif(p_data ->> 'catatan', '')
  )
  returning id into v_kontrak_id;

  insert into alokasi_acara (kontrak_id, acara_id, nominal)
  select v_kontrak_id, (x ->> 'acara_id')::uuid, (x ->> 'nominal')::bigint
  from jsonb_array_elements(p_alokasi) x;

  return v_kontrak_id;
end;
$$;

-- Mengganti seluruh Alokasi Acara satu Kontrak. Baris yang acaranya tetap ikut diperbarui,
-- bukan dihapus lalu dibuat ulang, supaya catatan dan jejak audit-nya tidak hilang.
create function simpan_alokasi(p_kontrak_id uuid, p_alokasi jsonb)
returns void
language plpgsql security invoker set search_path = public
as $$
declare
  v_vendor_id uuid;
begin
  select vendor_id into v_vendor_id from kontrak where id = p_kontrak_id for update;
  if v_vendor_id is null then
    raise exception 'kontrak_tidak_ditemukan';
  end if;

  perform periksa_alokasi(v_vendor_id, p_alokasi);

  delete from alokasi_acara
  where kontrak_id = p_kontrak_id
    and acara_id not in (select (x ->> 'acara_id')::uuid from jsonb_array_elements(p_alokasi) x);

  insert into alokasi_acara (kontrak_id, acara_id, nominal)
  select p_kontrak_id, (x ->> 'acara_id')::uuid, (x ->> 'nominal')::bigint
  from jsonb_array_elements(p_alokasi) x
  on conflict (kontrak_id, acara_id) do update set nominal = excluded.nominal;
end;
$$;

-- Lampiran Paket, Kontrak, dan bukti Pembayaran. Satu pernyataan per perubahan, jadi unggahan
-- yang berjalan bersamaan tidak saling menimpa. Nama tabel tidak pernah dirangkai dari input.
-- Baris yang tidak ada atau tersembunyi oleh RLS menghasilkan error.
create function tambah_lampiran(p_tabel text, p_id uuid, p_path text)
returns void
language plpgsql security invoker set search_path = public
as $$
declare
  v_ada boolean;
begin
  if p_tabel = 'paket' then
    update paket set lampiran = array_append(lampiran, p_path)
    where id = p_id and not (p_path = any (lampiran));
    if not found then
      select exists (select 1 from paket where id = p_id) into v_ada;
    else
      v_ada := true;
    end if;
  elsif p_tabel = 'kontrak' then
    update kontrak set lampiran = array_append(lampiran, p_path)
    where id = p_id and not (p_path = any (lampiran));
    if not found then
      select exists (select 1 from kontrak where id = p_id) into v_ada;
    else
      v_ada := true;
    end if;
  elsif p_tabel = 'pembayaran' then
    update pembayaran set bukti = array_append(bukti, p_path)
    where id = p_id and not (p_path = any (bukti));
    if not found then
      select exists (select 1 from pembayaran where id = p_id) into v_ada;
    else
      v_ada := true;
    end if;
  else
    raise exception 'tabel_tidak_valid';
  end if;
  if not v_ada then
    raise exception 'lampiran_baris_tidak_ditemukan';
  end if;
end;
$$;

create function hapus_lampiran(p_tabel text, p_id uuid, p_path text)
returns void
language plpgsql security invoker set search_path = public
as $$
begin
  if p_tabel = 'paket' then
    update paket set lampiran = array_remove(lampiran, p_path)
    where id = p_id and p_path = any (lampiran);
  elsif p_tabel = 'kontrak' then
    update kontrak set lampiran = array_remove(lampiran, p_path)
    where id = p_id and p_path = any (lampiran);
  elsif p_tabel = 'pembayaran' then
    update pembayaran set bukti = array_remove(bukti, p_path)
    where id = p_id and p_path = any (bukti);
  else
    raise exception 'tabel_tidak_valid';
  end if;
  if not found then
    raise exception 'lampiran_tidak_ditemukan';
  end if;
end;
$$;

revoke all on function periksa_alokasi(uuid, jsonb), simpan_kontrak(uuid, jsonb, jsonb),
  simpan_alokasi(uuid, jsonb), tambah_lampiran(text, uuid, text), hapus_lampiran(text, uuid, text)
  from public, anon;
grant execute on function periksa_alokasi(uuid, jsonb), simpan_kontrak(uuid, jsonb, jsonb),
  simpan_alokasi(uuid, jsonb), tambah_lampiran(text, uuid, text), hapus_lampiran(text, uuid, text)
  to authenticated;
