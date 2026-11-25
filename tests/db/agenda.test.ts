import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { bersihkanTest, buatEditorTest, buatOrangLuar, hapusDataUji, klienAnon } from './helpers';

let editor: SupabaseClient;
let picId: string;
let vendorId: string;
let kontrakId: string;
let acaraId: string;
let pihakId: string;

async function idByNama(tabel: string, nama: string): Promise<string> {
  const { data, error } = await editor.from(tabel).select('id').eq('nama', nama).single();
  if (error) throw error;
  return data.id;
}

// Vendor Booked lewat pilih_paket, sehingga punya Kontrak untuk Pembayaran.
async function buatVendorBooked(nama: string): Promise<{ vendorId: string; kontrakId: string }> {
  const { data: v, error: ev } = await editor
    .from('vendor')
    .insert({ nama, kategori_vendor_id: await idByNama('kategori_vendor', 'Venue') })
    .select('id')
    .single();
  if (ev) throw ev;
  const { error: eva } = await editor.from('vendor_acara').insert({ vendor_id: v.id, acara_id: acaraId });
  if (eva) throw eva;
  const { data: paket, error: ep } = await editor
    .from('paket')
    .insert({ vendor_id: v.id, nama: `Paket ${nama}`, harga: 9000000 })
    .select('id')
    .single();
  if (ep) throw ep;
  const { error: epp } = await editor.rpc('pilih_paket', { p_paket_id: paket.id });
  if (epp) throw epp;
  const { data: k, error: ek } = await editor.from('kontrak').select('id').eq('vendor_id', v.id).single();
  if (ek) throw ek;
  return { vendorId: v.id, kontrakId: k.id };
}

beforeAll(async () => {
  editor = await buatEditorTest('agenda-db@test.local');
  await hapusDataUji();
  const { data: id, error } = await editor.rpc('editor_saat_ini');
  if (error) throw error;
  picId = id as string;
  acaraId = await idByNama('acara', 'Resepsi');
  pihakId = await idByNama('pihak', 'Rendy');

  ({ vendorId, kontrakId } = await buatVendorBooked('Uji Agenda Venue'));
});

afterAll(async () => {
  try {
    await hapusDataUji();
  } finally {
    await bersihkanTest();
  }
});

async function bacaAgenda(ids: string[]) {
  const { data, error } = await editor
    .from('agenda')
    .select('jenis, id, judul, jatuh_tempo, pic_id, vendor_id, acara_id, nominal')
    .in('id', ids);
  if (error) throw error;
  return data ?? [];
}

describe('view agenda', () => {
  test('pembayaran terjadwal tampil dengan judul jenis dan nama vendor', async () => {
    const { data, error } = await editor
      .from('pembayaran')
      .insert([
        { kontrak_id: kontrakId, jenis: 'dp', nominal: 2000000, status: 'terjadwal', jatuh_tempo: '2026-12-01' },
        { kontrak_id: kontrakId, jenis: 'termin', nominal: 3000000, status: 'terjadwal', jatuh_tempo: '2026-12-10' },
        { kontrak_id: kontrakId, jenis: 'pelunasan', nominal: 4000000, status: 'terjadwal', jatuh_tempo: '2026-12-20' },
      ])
      .select('id, jenis');
    if (error) throw error;
    const id = Object.fromEntries(data.map((p) => [p.jenis, p.id]));

    const baris = await bacaAgenda(Object.values(id));
    const per = Object.fromEntries(baris.map((b) => [b.id, b]));
    expect(per[id.dp]).toEqual({
      jenis: 'pembayaran',
      id: id.dp,
      judul: 'DP Uji Agenda Venue',
      jatuh_tempo: '2026-12-01',
      pic_id: null,
      vendor_id: vendorId,
      acara_id: null,
      nominal: 2000000,
    });
    expect(per[id.termin]?.judul).toBe('Termin Uji Agenda Venue');
    expect(per[id.pelunasan]?.judul).toBe('Pelunasan Uji Agenda Venue');
  });

  test('pembayaran dibayar tidak tampil, dan hilang setelah ditandai dibayar', async () => {
    const { data: dibayar, error } = await editor
      .from('pembayaran')
      .insert({
        kontrak_id: kontrakId,
        jenis: 'dp',
        nominal: 1000000,
        status: 'dibayar',
        jatuh_tempo: '2026-12-01',
        tanggal_bayar: '2026-11-20',
        pihak_id: pihakId,
      })
      .select('id')
      .single();
    if (error) throw error;
    const { data: terjadwal, error: e2 } = await editor
      .from('pembayaran')
      .insert({ kontrak_id: kontrakId, jenis: 'termin', nominal: 1500000, status: 'terjadwal', jatuh_tempo: '2026-12-05' })
      .select('id')
      .single();
    if (e2) throw e2;

    expect((await bacaAgenda([dibayar.id, terjadwal.id])).map((b) => b.id)).toEqual([terjadwal.id]);

    const { error: e3 } = await editor
      .from('pembayaran')
      .update({ status: 'dibayar', tanggal_bayar: '2026-11-24', pihak_id: pihakId })
      .eq('id', terjadwal.id);
    if (e3) throw e3;
    expect(await bacaAgenda([terjadwal.id])).toEqual([]);
  });

  test('tugas belum dengan jatuh tempo tampil, tanpa jatuh tempo dan selesai tidak', async () => {
    const { data, error } = await editor
      .from('tugas')
      .insert([
        { judul: 'Uji Agenda Ada', pic_id: picId, jatuh_tempo: '2026-12-03', vendor_id: vendorId, acara_id: acaraId },
        { judul: 'Uji Agenda Tanpa Tanggal', pic_id: picId },
        { judul: 'Uji Agenda Selesai', pic_id: picId, jatuh_tempo: '2026-12-03', status: 'selesai' },
      ], { defaultToNull: false })
      .select('id, judul');
    if (error) throw error;
    const id = Object.fromEntries(data.map((t) => [t.judul, t.id]));

    const baris = await bacaAgenda(Object.values(id));
    expect(baris).toEqual([
      {
        jenis: 'tugas',
        id: id['Uji Agenda Ada'],
        judul: 'Uji Agenda Ada',
        jatuh_tempo: '2026-12-03',
        pic_id: picId,
        vendor_id: vendorId,
        acara_id: acaraId,
        nominal: null,
      },
    ]);

    const { error: e2 } = await editor.from('tugas').update({ status: 'selesai' }).eq('id', id['Uji Agenda Ada']);
    if (e2) throw e2;
    expect(await bacaAgenda([id['Uji Agenda Ada']])).toEqual([]);
  });

  test('pembayaran terjadwal vendor batal tidak tampil, tugasnya tetap tampil', async () => {
    const batal = await buatVendorBooked('Uji Agenda Batal');
    const { data: bayar, error } = await editor
      .from('pembayaran')
      .insert({ kontrak_id: batal.kontrakId, jenis: 'dp', nominal: 1000000, status: 'terjadwal', jatuh_tempo: '2026-12-02' })
      .select('id')
      .single();
    if (error) throw error;
    const { data: tugas, error: e2 } = await editor
      .from('tugas')
      .insert({ judul: 'Uji Agenda Urus Batal', pic_id: picId, jatuh_tempo: '2026-12-02', vendor_id: batal.vendorId })
      .select('id')
      .single();
    if (e2) throw e2;
    expect((await bacaAgenda([bayar.id, tugas.id])).map((b) => b.id).sort()).toEqual([bayar.id, tugas.id].sort());

    const { error: e3 } = await editor.from('vendor').update({ status: 'batal' }).eq('id', batal.vendorId);
    if (e3) throw e3;
    expect((await bacaAgenda([bayar.id, tugas.id])).map((b) => b.id)).toEqual([tugas.id]);
  });

  test('anon tidak bisa membaca agenda, orang luar tidak melihat isinya', async () => {
    const { data: t, error } = await editor
      .from('tugas')
      .insert({ judul: 'Uji Agenda Rahasia', pic_id: picId, jatuh_tempo: '2026-12-03' })
      .select('id')
      .single();
    if (error) throw error;

    const { error: eAnon } = await klienAnon.from('agenda').select('*').limit(1);
    expect(eAnon).not.toBeNull();

    const luar = await buatOrangLuar('agenda-luar@test.local');
    const { data, error: eLuar } = await luar.from('agenda').select('id').eq('id', t.id);
    expect(eLuar).toBeNull();
    expect(data).toEqual([]);
  });
});
