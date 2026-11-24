-- Share Link: tautan read-only untuk Pembaca, dan baca_share_link() yang dipanggil tanpa login.

-- Di Supabase pgcrypto sudah terpasang di schema extensions. Baris ini hanya berjaga-jaga.
create extension if not exists pgcrypto with schema extensions;

-- Bagian yang boleh dipilih. Tidak boleh kosong, tidak boleh dobel, dan hanya dari daftar ini.
-- Tamu dan Barang (Fase 2) ditambahkan ke daftar ini dan ke baca_share_link() bersamaan.
create function bagian_share_link_valid(p_bagian text[]) returns boolean
language sql immutable set search_path = public
as $$
  select coalesce(
    p_bagian is not null
      and array_ndims(p_bagian) = 1
      and cardinality(p_bagian) > 0
      and array_position(p_bagian, null) is null
      and p_bagian <@ array['acara', 'vendor', 'tugas', 'keuangan']::text[]
      and cardinality(p_bagian) = (select count(distinct x) from unnest(p_bagian) x),
    false
  );
$$;

create table share_link (
  id uuid primary key default gen_random_uuid(),
  -- 32 byte acak dalam hex. Editor tidak bisa memilih token sendiri: kolom ini tidak ikut di grant insert.
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  -- Batas panjang sama dengan PANJANG_LABEL_MAKS di src/lib/shareLink.ts.
  label text not null check (btrim(label) <> '' and char_length(label) <= 80),
  bagian text[] not null check (bagian_share_link_valid(bagian)),
  -- Link aktif kalau null. Diisi database saat dicabut, dan tidak bisa dibuka lagi.
  dicabut_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid references editor (id) on delete set null,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid references editor (id) on delete set null
);

create trigger audit before insert or update on share_link
  for each row execute function isi_audit();

-- Waktu cabut memakai jam database, bukan jam aplikasi. Link yang sudah dicabut tetap dicabut:
-- token yang terlanjur tersebar tidak bisa aktif lagi. Buat link baru kalau perlu.
create function jaga_dicabut_pada() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if old.dicabut_pada is not null then
    if new.dicabut_pada is distinct from old.dicabut_pada then
      raise exception 'share_link_sudah_dicabut';
    end if;
  elsif new.dicabut_pada is not null then
    new.dicabut_pada := now();
  end if;
  return new;
end;
$$;

create trigger jaga_dicabut_pada before update of dicabut_pada on share_link
  for each row execute function jaga_dicabut_pada();

alter table share_link enable row level security;

-- anon tidak mendapat apa pun di tabel ini. Pembaca hanya lewat baca_share_link().
-- Editor hanya boleh membuat (label, bagian) dan mencabut (dicabut_pada). Token, label,
-- dan bagian tidak bisa diubah setelah dibuat, dan baris tidak dihapus supaya jejaknya tetap ada.
revoke all on share_link from anon, authenticated;
grant select on share_link to authenticated;
grant insert (label, bagian) on share_link to authenticated;
grant update (dicabut_pada) on share_link to authenticated;
grant all on share_link to service_role;

create policy share_link_editor on share_link for all to authenticated
  using (is_editor()) with check (is_editor());

revoke all on function bagian_share_link_valid(text[]) from public, anon;
grant execute on function bagian_share_link_valid(text[]) to authenticated, service_role;

-- Isi Share Link untuk Pembaca. Null kalau token kosong, tidak dikenal, atau sudah dicabut.
--
-- security definer: berjalan sebagai pemilik tabel sehingga RLS dilewati. Karena itu fungsi ini
-- hanya membaca kolom yang ditulis satu per satu di bawah. Setiap objek JSON dibangun dengan
-- jsonb_build_object per kunci, tidak pernah to_jsonb(baris), supaya kolom baru di tabel
-- (harga, catatan, whatsapp, lampiran, bukti) tidak ikut bocor tanpa sengaja.
--
-- Bentuk hasil. Kunci bagian hanya ada kalau bagian itu dipilih:
--   label: text
--   acara: [{nama, tanggal, perkiraan, lokasi}]
--   vendor: [{nama, kategori, status, acara: [nama acara]}]
--   tugas: [{judul, pic, jatuh_tempo, status}]
--   keuangan: {vendor: [{nama, status, total, terbayar, sisa}], kontribusi: [{nama, total}]}
-- Kunci total, terbayar, dan sisa hanya muncul di dalam keuangan.
--
-- Vendor berstatus batal tidak ditampilkan di bagian vendor, karena tidak lagi dipakai.
-- Di daftar vendor keuangan, Vendor batal hanya tampil kalau sudah ada Pembayaran yang Dibayar,
-- supaya jumlah Terbayar semua vendor sama dengan jumlah Kontribusi per Pihak. Kontrak Vendor
-- batal tanpa Pembayaran Dibayar tidak tampil, karena tagihannya tidak akan dibayar.
--
-- search_path memuat pg_temp di akhir supaya objek sementara milik pemanggil tidak bisa
-- menyamar sebagai tabel atau fungsi public.
create function baca_share_link(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_label text;
  v_bagian text[];
  v_hasil jsonb;
begin
  if p_token is null or btrim(p_token) = '' or length(p_token) > 256 then
    return null;
  end if;

  select s.label, s.bagian into v_label, v_bagian
  from share_link s
  where s.token = p_token and s.dicabut_pada is null;
  if not found then
    return null;
  end if;

  v_hasil := jsonb_build_object('label', v_label);

  if 'acara' = any (v_bagian) then
    v_hasil := v_hasil || jsonb_build_object('acara', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'nama', a.nama,
          'tanggal', a.tanggal,
          'perkiraan', a.perkiraan,
          'lokasi', a.lokasi
        )
        order by a.tanggal nulls last, a.jenis, a.nama
      )
      from acara a
    ), '[]'::jsonb));
  end if;

  if 'vendor' = any (v_bagian) then
    v_hasil := v_hasil || jsonb_build_object('vendor', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'nama', v.nama,
          'kategori', kv.nama,
          'status', v.status,
          'acara', coalesce((
            select jsonb_agg(ac.nama order by ac.tanggal nulls last, ac.jenis, ac.nama)
            from vendor_acara va
            join acara ac on ac.id = va.acara_id
            where va.vendor_id = v.id
          ), '[]'::jsonb)
        )
        order by kv.urutan, kv.nama, v.nama
      )
      from vendor v
      join kategori_vendor kv on kv.id = v.kategori_vendor_id
      where v.status <> 'batal'
    ), '[]'::jsonb));
  end if;

  if 'tugas' = any (v_bagian) then
    v_hasil := v_hasil || jsonb_build_object('tugas', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'judul', t.judul,
          'pic', e.nama,
          'jatuh_tempo', t.jatuh_tempo,
          'status', t.status
        )
        order by t.status, t.jatuh_tempo nulls last, t.dibuat_pada
      )
      from tugas t
      join editor e on e.id = t.pic_id
    ), '[]'::jsonb));
  end if;

  if 'keuangan' = any (v_bagian) then
    v_hasil := v_hasil || jsonb_build_object('keuangan', jsonb_build_object(
      'vendor', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'nama', v.nama,
            'total', r.total,
            'terbayar', r.terbayar,
            'sisa', r.sisa,
            -- Supaya Pembaca melihat Vendor batal sebagai Batal, bukan sebagai tagihan yang belum lunas.
            'status', v.status
          )
          order by v.nama
        )
        from ringkasan_kontrak r
        join vendor v on v.id = r.vendor_id
        where v.status <> 'batal' or r.terbayar > 0
      ), '[]'::jsonb),
      'kontribusi', coalesce((
        select jsonb_agg(
          jsonb_build_object('nama', k.nama, 'total', k.total)
          order by ph.urutan, k.nama
        )
        from kontribusi_pihak k
        join pihak ph on ph.id = k.pihak_id
      ), '[]'::jsonb)
    ));
  end if;

  return v_hasil;
end;
$$;

revoke all on function baca_share_link(text) from public;
grant execute on function baca_share_link(text) to anon, authenticated, service_role;
