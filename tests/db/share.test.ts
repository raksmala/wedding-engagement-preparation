import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, buatOrangLuar, hapusDataUji, klienAnon } from './helpers';

let editor: SupabaseClient;
let vendorId: string;
let namaPic: string;

// Data rahasia milik Vendor "Uji Share Venue". Tidak satu pun boleh muncul lewat Share Link.
const RAHASIA = {
  whatsapp: '081298765432',
  instagram: '@ujisharerahasia',
  link: 'https://uji-share-rahasia.example',
  namaKontak: 'Kontak Uji Rahasia',
  catatanVendor: 'Catatan vendor uji rahasia',
  catatanPaket: 'Catatan paket uji rahasia',
  catatanKontrak: 'Catatan kontrak uji rahasia',
  catatanPembayaran: 'Catatan pembayaran uji rahasia',
  catatanTugas: 'Catatan tugas uji rahasia',
  harga: 12345678,
};
const TERBAYAR = 2000000;
const HARGA_BATAL = 4000000;
const TERBAYAR_BATAL = 1500000;

async function idByNama(tabel: string, nama: string): Promise<string> {
  const { data, error } = await editor.from(tabel).select('id').eq('nama', nama).single();
  if (error) throw error;
  return data.id;
}

async function hapusShareLinkUji() {
  const { error } = await admin.from('share_link').delete().like('label', 'Uji %');
  if (error) throw error;
}

async function buatLink(label: string, bagian: string[]): Promise<{ id: string; token: string }> {
  const { data, error } = await editor.from('share_link').insert({ label, bagian }).select('id, token').single();
  if (error) throw error;
  return data;
}

async function baca(token: string | null) {
  const { data, error } = await klienAnon.rpc('baca_share_link', { p_token: token });
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  editor = await buatEditorTest('share-db@test.local');
  await hapusDataUji();
  await hapusShareLinkUji();
  const { data: picId, error: ePic } = await editor.rpc('editor_saat_ini');
  if (ePic) throw ePic;
  const { data: e, error: eNama } = await editor.from('editor').select('nama').eq('id', picId).single();
  if (eNama) throw eNama;
  namaPic = e.nama;

  // Vendor Booked lewat pilih_paket, lengkap dengan kontak, catatan, lampiran, dan bukti Pembayaran.
  const { data: v, error: ev } = await editor
    .from('vendor')
    .insert({
      nama: 'Uji Share Venue',
      kategori_vendor_id: await idByNama('kategori_vendor', 'Venue'),
      nama_kontak: RAHASIA.namaKontak,
      whatsapp: RAHASIA.whatsapp,
      instagram: RAHASIA.instagram,
      link: RAHASIA.link,
      catatan: RAHASIA.catatanVendor,
    })
    .select('id')
    .single();
  if (ev) throw ev;
  vendorId = v.id;
  const { error: eva } = await editor
    .from('vendor_acara')
    .insert({ vendor_id: vendorId, acara_id: await idByNama('acara', 'Resepsi') });
  if (eva) throw eva;
  const { data: paket, error: ep } = await editor
    .from('paket')
    .insert({
      vendor_id: vendorId,
      nama: 'Paket Uji Share',
      harga: RAHASIA.harga,
      catatan: RAHASIA.catatanPaket,
      lampiran: [`paket/${vendorId}/uji-lampiran-rahasia.pdf`],
    })
    .select('id')
    .single();
  if (ep) throw ep;
  const { data: kontrakId, error: epp } = await editor.rpc('pilih_paket', { p_paket_id: paket.id });
  if (epp) throw epp;
  const { error: ek } = await editor
    .from('kontrak')
    .update({ catatan: RAHASIA.catatanKontrak, lampiran: [`kontrak/${kontrakId}/uji-lampiran-rahasia.pdf`] })
    .eq('id', kontrakId);
  if (ek) throw ek;
  const { error: eb } = await editor.from('pembayaran').insert({
    kontrak_id: kontrakId,
    jenis: 'dp',
    nominal: TERBAYAR,
    status: 'dibayar',
    tanggal_bayar: '2026-11-20',
    pihak_id: await idByNama('pihak', 'Rendy'),
    bukti: [`pembayaran/${kontrakId}/uji-bukti-rahasia.png`, `lampiran/pembayaran/${kontrakId}/uji-bukti-rahasia.png`],
    catatan: RAHASIA.catatanPembayaran,
  });
  if (eb) throw eb;

  const { error: et } = await editor.from('tugas').insert({
    judul: 'Uji Share Tugas',
    pic_id: picId as string,
    jatuh_tempo: '2026-12-01',
    vendor_id: vendorId,
    catatan: RAHASIA.catatanTugas,
  });
  if (et) throw et;

  // Vendor batal tidak tampil di bagian vendor. Di keuangan hanya tampil kalau sudah ada yang Dibayar.
  const { error: evb } = await editor.from('vendor').insert({
    nama: 'Uji Share Batal',
    kategori_vendor_id: await idByNama('kategori_vendor', 'Dekorasi'),
    status: 'batal',
  });
  if (evb) throw evb;
  await vendorBatalBerkontrak('Uji Share Batal Tanpa Bayar', 0);
  await vendorBatalBerkontrak('Uji Share Batal Sudah Bayar', TERBAYAR_BATAL);
});

// Vendor Booked lewat pilih_paket, opsional dengan satu Pembayaran Dibayar, lalu ditandai batal.
async function vendorBatalBerkontrak(nama: string, dibayar: number): Promise<void> {
  const { data: v, error } = await editor
    .from('vendor')
    .insert({ nama, kategori_vendor_id: await idByNama('kategori_vendor', 'MUA') })
    .select('id')
    .single();
  if (error) throw error;
  const { error: eva } = await editor
    .from('vendor_acara')
    .insert({ vendor_id: v.id, acara_id: await idByNama('acara', 'Akad') });
  if (eva) throw eva;
  const { data: paket, error: ep } = await editor
    .from('paket')
    .insert({ vendor_id: v.id, nama: `Paket ${nama}`, harga: HARGA_BATAL })
    .select('id')
    .single();
  if (ep) throw ep;
  const { data: kontrakId, error: epp } = await editor.rpc('pilih_paket', { p_paket_id: paket.id });
  if (epp) throw epp;
  if (dibayar > 0) {
    const { error: eb } = await editor.from('pembayaran').insert({
      kontrak_id: kontrakId,
      jenis: 'dp',
      nominal: dibayar,
      status: 'dibayar',
      tanggal_bayar: '2026-11-21',
      pihak_id: await idByNama('pihak', 'Dinar'),
    });
    if (eb) throw eb;
  }
  const { error: es } = await editor.from('vendor').update({ status: 'batal' }).eq('id', v.id);
  if (es) throw es;
}

afterAll(async () => {
  try {
    await hapusShareLinkUji();
    await hapusDataUji();
  } finally {
    await bersihkanTest();
  }
});

function cekTanpaRahasia(raw: string) {
  expect(raw).not.toContain('lampiran/');
  expect(raw).not.toContain('uji-bukti-rahasia');
  expect(raw).not.toContain('uji-lampiran-rahasia');
  expect(raw).not.toMatch(/"(bukti|lampiran|catatan|whatsapp|instagram|link|nama_kontak|harga|token)"/);
  for (const nilai of [
    RAHASIA.whatsapp,
    RAHASIA.instagram,
    RAHASIA.link,
    RAHASIA.namaKontak,
    RAHASIA.catatanVendor,
    RAHASIA.catatanPaket,
    RAHASIA.catatanKontrak,
    RAHASIA.catatanPembayaran,
    RAHASIA.catatanTugas,
  ]) {
    expect(raw).not.toContain(nilai);
  }
}

describe('baca_share_link', () => {
  test('tanpa keuangan, response tidak memuat nominal', async () => {
    const { token } = await buatLink('Uji Tanpa Keuangan', ['acara', 'vendor', 'tugas']);
    const data = await baca(token);
    expect(data).not.toBeNull();
    const raw = JSON.stringify(data);
    expect(raw).not.toMatch(/"(total|terbayar|sisa|nominal|harga)"/);
    expect(raw).not.toContain('lampiran/');
    expect(raw).not.toContain(String(RAHASIA.harga));
    expect(raw).not.toContain(String(TERBAYAR));
    expect(data).not.toHaveProperty('keuangan');
    cekTanpaRahasia(raw);
  });

  test('dengan keuangan, tetap tanpa bukti dan lampiran', async () => {
    const { token } = await buatLink('Uji Dengan Keuangan', ['acara', 'vendor', 'tugas', 'keuangan']);
    const data = await baca(token);
    const raw = JSON.stringify(data);
    cekTanpaRahasia(raw);

    expect(data.keuangan.vendor).toContainEqual({
      nama: 'Uji Share Venue',
      total: RAHASIA.harga,
      terbayar: TERBAYAR,
      sisa: RAHASIA.harga - TERBAYAR,
      status: 'booked',
    });
    const rendy = data.keuangan.kontribusi.find((k: { nama: string }) => k.nama === 'Rendy');
    expect(rendy.total).toBeGreaterThanOrEqual(TERBAYAR);
  });

  test('link dicabut mengembalikan null', async () => {
    const { id, token } = await buatLink('Uji Dicabut', ['acara']);
    expect(await baca(token)).not.toBeNull();

    const sebelum = Date.now();
    // Nilai yang dikirim diabaikan: waktu cabut diisi database.
    const { data, error } = await editor
      .from('share_link')
      .update({ dicabut_pada: '2000-01-01T00:00:00Z' })
      .eq('id', id)
      .select('dicabut_pada')
      .single();
    if (error) throw error;
    expect(Date.parse(data.dicabut_pada)).toBeGreaterThan(sebelum - 60_000);

    expect(await baca(token)).toBeNull();

    // Link yang sudah dicabut tidak bisa aktif lagi.
    const { error: eBuka } = await editor.from('share_link').update({ dicabut_pada: null }).eq('id', id);
    expect(eBuka?.message).toContain('share_link_sudah_dicabut');
    expect(await baca(token)).toBeNull();
  });

  test('token acak yang tidak ada mengembalikan null', async () => {
    expect(await baca(randomBytes(32).toString('hex'))).toBeNull();
    expect(await baca('')).toBeNull();
    expect(await baca(null)).toBeNull();
    expect(await baca("' or 1=1 --")).toBeNull();
  });

  test('anon tidak bisa select share_link langsung', async () => {
    const { data, error } = await klienAnon.from('share_link').select('token');
    expect(error).not.toBeNull();
    expect(data).toBeNull();

    const { error: eInsert } = await klienAnon.from('share_link').insert({ label: 'Uji Anon', bagian: ['acara'] });
    expect(eInsert).not.toBeNull();

    // Orang yang login tetapi bukan Editor juga tidak melihat atau membuat apa pun.
    await buatLink('Uji Milik Editor', ['acara']);
    const luar = await buatOrangLuar('share-luar@test.local');
    const { data: dataLuar, error: eLuar } = await luar.from('share_link').select('token');
    expect(eLuar).toBeNull();
    expect(dataLuar).toEqual([]);
    const { error: eLuarInsert } = await luar.from('share_link').insert({ label: 'Uji Luar', bagian: ['acara'] });
    expect(eLuarInsert).not.toBeNull();
  });

  test('kunci hasil persis sesuai bagian, tanpa kolom lain', async () => {
    const { token } = await buatLink('Uji Semua Bagian', ['acara', 'vendor', 'tugas', 'keuangan']);
    const data = await baca(token);
    const kunci = (o: object) => Object.keys(o).sort();

    expect(kunci(data)).toEqual(['acara', 'keuangan', 'label', 'tugas', 'vendor']);
    expect(data.label).toBe('Uji Semua Bagian');
    expect(data.acara.length).toBeGreaterThan(0);
    for (const a of data.acara) expect(kunci(a)).toEqual(['lokasi', 'nama', 'perkiraan', 'tanggal']);
    expect(data.vendor.length).toBeGreaterThan(0);
    for (const v of data.vendor) expect(kunci(v)).toEqual(['acara', 'kategori', 'nama', 'status']);
    expect(data.tugas.length).toBeGreaterThan(0);
    for (const t of data.tugas) expect(kunci(t)).toEqual(['jatuh_tempo', 'judul', 'pic', 'status']);
    expect(kunci(data.keuangan)).toEqual(['kontribusi', 'vendor']);
    expect(data.keuangan.vendor.length).toBeGreaterThan(0);
    for (const v of data.keuangan.vendor) expect(kunci(v)).toEqual(['nama', 'sisa', 'status', 'terbayar', 'total']);
    expect(data.keuangan.kontribusi.length).toBeGreaterThan(0);
    for (const k of data.keuangan.kontribusi) expect(kunci(k)).toEqual(['nama', 'total']);

    const { token: tokenAcara } = await buatLink('Uji Acara Saja', ['acara']);
    expect(kunci(await baca(tokenAcara))).toEqual(['acara', 'label']);
  });

  test('vendor tanpa kontak dan catatan, tugas tanpa catatan, vendor batal tidak tampil di vendor', async () => {
    const { token } = await buatLink('Uji Vendor', ['vendor', 'tugas', 'keuangan']);
    const data = await baca(token);

    expect(data.vendor).toContainEqual({
      nama: 'Uji Share Venue',
      kategori: 'Venue',
      status: 'booked',
      acara: ['Resepsi'],
    });
    expect(data.tugas).toContainEqual({
      judul: 'Uji Share Tugas',
      pic: namaPic,
      jatuh_tempo: '2026-12-01',
      status: 'belum',
    });
    const namaVendor = data.vendor.map((v: { nama: string }) => v.nama);
    for (const nama of ['Uji Share Batal', 'Uji Share Batal Tanpa Bayar', 'Uji Share Batal Sudah Bayar']) {
      expect(namaVendor).not.toContain(nama);
    }
    cekTanpaRahasia(JSON.stringify(data));
  });

  test('keuangan memuat vendor batal yang sudah dibayar, supaya Terbayar sama dengan Kontribusi', async () => {
    const { token } = await buatLink('Uji Keuangan Batal', ['keuangan']);
    const data = await baca(token);
    const namaKeuangan = data.keuangan.vendor.map((v: { nama: string }) => v.nama);

    expect(data.keuangan.vendor).toContainEqual({
      nama: 'Uji Share Batal Sudah Bayar',
      total: HARGA_BATAL,
      terbayar: TERBAYAR_BATAL,
      sisa: HARGA_BATAL - TERBAYAR_BATAL,
      status: 'batal',
    });
    expect(namaKeuangan).not.toContain('Uji Share Batal Tanpa Bayar');
    expect(namaKeuangan).not.toContain('Uji Share Batal');

    // Setiap Pembayaran Dibayar punya Pihak dan masuk ke Kontrak yang tampil, jadi kedua jumlah selalu sama.
    const terbayar = data.keuangan.vendor.reduce((t: number, v: { terbayar: number }) => t + v.terbayar, 0);
    const kontribusi = data.keuangan.kontribusi.reduce((t: number, k: { total: number }) => t + k.total, 0);
    expect(terbayar).toBe(kontribusi);
  });
});

describe('tabel share_link', () => {
  test('token 32 byte hex dibuat database, editor tidak bisa memilih token', async () => {
    const { token } = await buatLink('Uji Token', ['acara']);
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    const { error } = await editor
      .from('share_link')
      .insert({ label: 'Uji Token Sendiri', bagian: ['acara'], token: 'a'.repeat(64) });
    expect(error?.code).toBe('42501');
  });

  test('label dan bagian tidak bisa diubah setelah dibuat', async () => {
    const { id } = await buatLink('Uji Tetap', ['acara']);
    const { error } = await editor.from('share_link').update({ bagian: ['acara', 'keuangan'] }).eq('id', id);
    expect(error?.code).toBe('42501');
    const { error: e2 } = await editor.from('share_link').update({ label: 'Uji Ganti' }).eq('id', id);
    expect(e2?.code).toBe('42501');
  });

  test('bagian wajib subset tidak kosong dari acara, vendor, tugas, keuangan', async () => {
    for (const bagian of [[], ['tamu'], ['acara', 'barang'], ['acara', 'acara'], ['Acara']]) {
      const { error } = await editor.from('share_link').insert({ label: 'Uji Bagian', bagian });
      expect(error?.code, JSON.stringify(bagian)).toBe('23514');
    }
    const { error: eLabel } = await editor.from('share_link').insert({ label: '   ', bagian: ['acara'] });
    expect(eLabel?.code).toBe('23514');
    // Sama dengan PANJANG_LABEL_MAKS di aplikasi.
    const { error: ePanjang } = await editor
      .from('share_link')
      .insert({ label: `Uji ${'x'.repeat(77)}`, bagian: ['acara'] });
    expect(ePanjang?.code).toBe('23514');
    const { error: ePas } = await editor
      .from('share_link')
      .insert({ label: `Uji ${'x'.repeat(76)}`, bagian: ['acara'] });
    expect(ePas).toBeNull();
  });

  test('kolom audit diisi trigger', async () => {
    const { id } = await buatLink('Uji Audit', ['acara']);
    const { data: saatIni } = await editor.rpc('editor_saat_ini');
    const { data, error } = await editor.from('share_link').select('dibuat_oleh, diubah_oleh').eq('id', id).single();
    if (error) throw error;
    expect(data).toEqual({ dibuat_oleh: saatIni, diubah_oleh: saatIni });
  });
});
