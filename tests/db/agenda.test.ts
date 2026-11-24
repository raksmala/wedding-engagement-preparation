import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, buatOrangLuar, klienAnon } from './helpers';

let editor: SupabaseClient;
let picId: string;
let vendorId: string;
let kontrakId: string;
let acaraId: string;
let pihakId: string;

// Vendor dengan Pembayaran dibayar tidak bisa dihapus, jadi Pembayarannya dihapus dulu.
async function bersihkan() {
  const { error: eTugas } = await admin.from('tugas').delete().like('judul', 'Uji %');
  if (eTugas) throw eTugas;
  const { data: vendor } = await admin.from('vendor').select('id').like('nama', 'Uji %');
  const ids = (vendor ?? []).map((v) => v.id);
  if (ids.length) {
    const { data: kontrak } = await admin.from('kontrak').select('id').in('vendor_id', ids);
    const kids = (kontrak ?? []).map((k) => k.id);
    if (kids.length) {
      const { error } = await admin.from('pembayaran').delete().in('kontrak_id', kids);
      if (error) throw error;
    }
  }
  const { error } = await admin.from('vendor').delete().like('nama', 'Uji %');
  if (error) throw error;
}

async function idByNama(tabel: string, nama: string): Promise<string> {
  const { data, error } = await editor.from(tabel).select('id').eq('nama', nama).single();
  if (error) throw error;
  return data.id;
}

beforeAll(async () => {
  editor = await buatEditorTest('agenda-db@test.local');
  await bersihkan();
  const { data: id, error } = await editor.rpc('editor_saat_ini');
  if (error) throw error;
  picId = id as string;
  acaraId = await idByNama('acara', 'Resepsi');
  pihakId = await idByNama('pihak', 'Rendy');

  const { data: v, error: ev } = await editor
    .from('vendor')
    .insert({ nama: 'Uji Agenda Venue', kategori_vendor_id: await idByNama('kategori_vendor', 'Venue') })
    .select('id')
    .single();
  if (ev) throw ev;
  vendorId = v.id;
  const { error: eva } = await editor.from('vendor_acara').insert({ vendor_id: vendorId, acara_id: acaraId });
  if (eva) throw eva;
  const { data: paket, error: ep } = await editor
    .from('paket')
    .insert({ vendor_id: vendorId, nama: 'Uji Paket Agenda', harga: 9000000 })
    .select('id')
    .single();
  if (ep) throw ep;
  const { error: epp } = await editor.rpc('pilih_paket', { p_paket_id: paket.id });
  if (epp) throw epp;
  const { data: k, error: ek } = await editor.from('kontrak').select('id').eq('vendor_id', vendorId).single();
  if (ek) throw ek;
  kontrakId = k.id;
});

afterAll(async () => {
  try {
    await bersihkan();
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
      ])
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
