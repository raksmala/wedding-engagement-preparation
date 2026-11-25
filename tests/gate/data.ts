// Data uji Delivery Gate. Semua nama berawalan "Uji " supaya ikut dibersihkan hapusDataUji().
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, hapusDataUji } from '../db/helpers';

export const EMAIL = 'gate@test.local';
export const NOL = '00000000-0000-4000-8000-000000000000';

export let editor: SupabaseClient;
export const id: Record<string, string> = {};

export function tanggal(geserHari: number): string {
  const d = new Date(Date.now() + 7 * 3600_000 + geserHari * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function satu<T>(q: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await q;
  if (error) throw error;
  return data as NonNullable<T>;
}

async function idByNama(tabel: string, nama: string): Promise<string> {
  return (await satu(editor.from(tabel).select('id').eq('nama', nama).single())).id as string;
}

async function vendor(nama: string, kategori: string, status: string, extra: object, acara: string[]) {
  const v = await satu(
    editor
      .from('vendor')
      .insert({ nama, kategori_vendor_id: id[kategori], status, ...extra })
      .select('id')
      .single(),
  );
  for (const a of acara) await satu(editor.from('vendor_acara').insert({ vendor_id: v.id, acara_id: id[a] }));
  return v.id as string;
}

async function paket(vendorId: string, nama: string, harga: number, nilai: Record<string, string>) {
  const p = await satu(editor.from('paket').insert({ vendor_id: vendorId, nama, harga }).select('id').single());
  for (const [k, n] of Object.entries(nilai)) {
    await satu(editor.from('nilai_komponen').insert({ paket_id: p.id, komponen_id: id[k], nilai: n }));
  }
  return p.id as string;
}

export async function seed() {
  editor = await buatEditorTest(EMAIL);
  await hapusDataUji();
  await admin.from('komponen').delete().like('nama', 'Uji %');
  await admin.from('share_link').delete().like('label', 'Uji %');
  await admin.from('pihak').delete().like('nama', 'Uji %');
  await admin.from('kategori_vendor').delete().like('nama', 'Uji %');

  for (const k of ['Venue', 'Katering']) id[k] = await idByNama('kategori_vendor', k);
  for (const a of ['Lamaran', 'Akad', 'Resepsi']) id[a] = await idByNama('acara', a);
  for (const p of ['Rendy']) id[p] = await idByNama('pihak', p);
  id.editor = (await satu(editor.from('editor').select('id').eq('email', EMAIL).single())).id;
  await satu(editor.from('acara').update({ tanggal: tanggal(30), lokasi: 'Gedung Uji' }).eq('id', id.Resepsi));

  id.kapasitas = (
    await satu(
      editor
        .from('komponen')
        .insert({ kategori_vendor_id: id.Venue, nama: 'Uji Kapasitas', tipe: 'angka', satuan: 'orang', urutan: 1 })
        .select('id')
        .single(),
    )
  ).id;
  id.parkir = (
    await satu(
      editor
        .from('komponen')
        .insert({ kategori_vendor_id: id.Venue, nama: 'Uji Parkir Luas', tipe: 'ya_tidak', urutan: 2 })
        .select('id')
        .single(),
    )
  ).id;

  id.alpha = await vendor(
    'Uji Gate Venue Alpha',
    'Venue',
    'survei_nego',
    {
      nama_kontak: 'Bu Sari',
      whatsapp: '081234567890',
      instagram: 'venuealpha',
      link: 'https://contoh-venue-alpha-yang-alamatnya-sangat-panjang.example.com/paket/pernikahan/2027/lengkap',
      catatan: 'Catatan uji untuk vendor Alpha.',
    },
    ['Resepsi'],
  );
  id.paketAlpha = await paket(id.alpha, 'Uji Paket Alpha Gold', 85_000_000, { kapasitas: '500', parkir: 'ya' });
  await satu(editor.rpc('pilih_paket', { p_paket_id: id.paketAlpha }));
  id.kontrakAlpha = (await satu(editor.from('kontrak').select('id').eq('vendor_id', id.alpha).single())).id;
  await satu(
    editor.from('pembayaran').insert({
      kontrak_id: id.kontrakAlpha,
      jenis: 'dp',
      nominal: 25_000_000,
      status: 'dibayar',
      tanggal_bayar: tanggal(-20),
      pihak_id: id.Rendy,
    }),
  );
  await satu(
    editor.from('pembayaran').insert({
      kontrak_id: id.kontrakAlpha,
      jenis: 'termin',
      nominal: 30_000_000,
      status: 'terjadwal',
      jatuh_tempo: tanggal(-1),
    }),
  );
  await satu(
    editor.from('pembayaran').insert({
      kontrak_id: id.kontrakAlpha,
      jenis: 'pelunasan',
      nominal: 30_000_000,
      status: 'terjadwal',
      jatuh_tempo: tanggal(5),
    }),
  );
  const log = await satu(
    editor
      .from('log_kontak')
      .insert({ vendor_id: id.alpha, tanggal: tanggal(-3), saluran: 'whatsapp', isi: 'Uji tanya ketersediaan tanggal.' })
      .select('id')
      .single(),
  );
  await satu(
    editor.from('tugas').insert({
      judul: 'Uji Gate Follow-up Alpha',
      pic_id: id.editor,
      jatuh_tempo: tanggal(0),
      vendor_id: id.alpha,
      log_kontak_id: log.id,
    }),
  );

  id.beta = await vendor('Uji Gate Venue Beta', 'Venue', 'survei_nego', { whatsapp: '12345' }, ['Resepsi', 'Akad']);
  await paket(id.beta, 'Uji Paket Beta Silver', 70_000_000, { kapasitas: '350' });
  id.gamma = await vendor('Uji Gate Venue Gamma', 'Venue', 'kandidat', {}, []);
  await paket(id.gamma, 'Uji Paket Gamma Hemat', 45_000_000, { parkir: 'tidak' });
  id.delta = await vendor('Uji Gate Katering Delta', 'Katering', 'survei_nego', {}, ['Lamaran']);
  id.epsilon = await vendor('Uji Gate Katering Epsilon', 'Katering', 'survei_nego', {}, []);

  await satu(
    editor.from('tugas').insert([
      { judul: 'Uji Gate Tugas Terlambat', pic_id: id.editor, jatuh_tempo: tanggal(-2), acara_id: id.Resepsi },
      { judul: 'Uji Gate Tugas Minggu Ini', pic_id: id.editor, jatuh_tempo: tanggal(3) },
      { judul: 'Uji Gate Tugas Tanpa Tanggal', pic_id: id.editor, jatuh_tempo: null },
    ]),
  );

  const aktif = await satu(
    editor.from('share_link').insert({ label: 'Uji Gate Keluarga', bagian: ['acara', 'vendor', 'tugas'] }).select('token').single(),
  );
  const cabut = await satu(
    editor.from('share_link').insert({ label: 'Uji Gate Dicabut', bagian: ['acara', 'keuangan'] }).select('id, token').single(),
  );
  await satu(editor.from('share_link').update({ dicabut_pada: new Date().toISOString() }).eq('id', cabut.id));
  id.tokenAktif = aktif.token;
  id.tokenCabut = cabut.token;
}

export async function bersihkanGate() {
  await hapusDataUji();
  await admin.from('komponen').delete().like('nama', 'Uji %');
  await admin.from('share_link').delete().like('label', 'Uji %');
  await admin.from('pihak').delete().like('nama', 'Uji %');
  await admin.from('kategori_vendor').delete().like('nama', 'Uji %');
  await bersihkanTest();
}
