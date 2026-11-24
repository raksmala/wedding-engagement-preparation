import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { bersihkanTest, buatEditorTest, buatOrangLuar } from './helpers';

const KATEGORI = [
  'Venue',
  'Katering',
  'Dekorasi',
  'MUA',
  'Busana',
  'Foto & Video',
  'WO/MC',
  'Hiburan',
  'Undangan',
  'Souvenir',
  'Cincin',
  'Hias Seserahan',
  'Lainnya',
];

let editor: SupabaseClient;

beforeAll(async () => {
  editor = await buatEditorTest('vendor-db@test.local');
});

afterAll(async () => {
  try {
    await editor.from('vendor').delete().like('nama', 'Vendor Uji %');
    await editor.from('kategori_vendor').delete().like('nama', 'Kategori Uji %');
  } finally {
    await bersihkanTest();
  }
});

async function idKategori(nama: string): Promise<string> {
  const { data, error } = await editor.from('kategori_vendor').select('id').eq('nama', nama).single();
  if (error) throw error;
  return data.id;
}

describe('vendor', () => {
  test('ada 13 Kategori Vendor default dengan urutan dari PRD', async () => {
    const { data, error } = await editor
      .from('kategori_vendor')
      .select('nama, urutan')
      .in('nama', KATEGORI)
      .order('urutan');
    expect(error).toBeNull();
    expect(data?.map((k) => k.nama)).toEqual(KATEGORI);
  });

  test('Vendor bisa dihubungkan ke Lamaran dan Resepsi sekaligus', async () => {
    const { data: v, error } = await editor
      .from('vendor')
      .insert({ nama: 'Vendor Uji Dua Acara', kategori_vendor_id: await idKategori('Venue') })
      .select('id, status')
      .single();
    expect(error).toBeNull();
    expect(v?.status).toBe('kandidat');

    const { data: acara } = await editor.from('acara').select('id').in('nama', ['Lamaran', 'Resepsi']);
    expect(acara).toHaveLength(2);
    const { error: eRel } = await editor
      .from('vendor_acara')
      .insert(acara!.map((a) => ({ vendor_id: v!.id, acara_id: a.id })));
    expect(eRel).toBeNull();

    const { data: rel } = await editor.from('vendor_acara').select('acara_id').eq('vendor_id', v!.id);
    expect(rel).toHaveLength(2);

    // Pasangan yang sama tidak boleh dobel (primary key gabungan).
    const { error: eDobel } = await editor
      .from('vendor_acara')
      .insert({ vendor_id: v!.id, acara_id: acara![0].id });
    expect(eDobel?.code).toBe('23505');
  });

  test('menghapus Acara yang dipakai Vendor ditolak', async () => {
    const { data: v } = await editor
      .from('vendor')
      .select('id')
      .eq('nama', 'Vendor Uji Dua Acara')
      .single();
    const { data: a } = await editor.from('acara').select('id').eq('nama', 'Lamaran').single();
    const { data, error } = await editor.from('acara').delete().eq('id', a!.id).select('id');
    expect(error?.code).toBe('23503');
    expect(data).toBeNull();
    expect(v).toBeTruthy();
  });

  test('menghapus Vendor ikut melepas relasi Acara', async () => {
    const { data: v } = await editor
      .from('vendor')
      .insert({ nama: 'Vendor Uji Lepas', kategori_vendor_id: await idKategori('Katering') })
      .select('id')
      .single();
    const { data: a } = await editor.from('acara').select('id').eq('nama', 'Akad').single();
    await editor.from('vendor_acara').insert({ vendor_id: v!.id, acara_id: a!.id });
    const { error } = await editor.from('vendor').delete().eq('id', v!.id);
    expect(error).toBeNull();
    const { data: rel } = await editor.from('vendor_acara').select('acara_id').eq('vendor_id', v!.id);
    expect(rel).toEqual([]);
  });

  test('menghapus Kategori Vendor yang dipakai Vendor ditolak', async () => {
    const { data: k } = await editor
      .from('kategori_vendor')
      .insert({ nama: 'Kategori Uji Terpakai', urutan: 99 })
      .select('id')
      .single();
    await editor.from('vendor').insert({ nama: 'Vendor Uji Kategori', kategori_vendor_id: k!.id });
    const { error } = await editor.from('kategori_vendor').delete().eq('id', k!.id);
    expect(error?.code).toBe('23503');
  });

  test('orang luar tidak melihat Vendor', async () => {
    const luar = await buatOrangLuar('vendor-luar@test.local');
    const { data } = await luar.from('vendor').select('id');
    expect(data).toEqual([]);
    const { data: k } = await luar.from('kategori_vendor').select('id');
    expect(k).toEqual([]);
  });

  test('log_kontak tersimpan per Vendor dan ikut terhapus bersama Vendor', async () => {
    const { data: v } = await editor
      .from('vendor')
      .insert({ nama: 'Vendor Uji Log', kategori_vendor_id: await idKategori('MUA') })
      .select('id')
      .single();
    const { error } = await editor
      .from('log_kontak')
      .insert({ vendor_id: v!.id, tanggal: '2026-11-20', saluran: 'whatsapp', isi: 'Tanya jadwal' });
    expect(error).toBeNull();
    await editor.from('vendor').delete().eq('id', v!.id);
    const { data } = await editor.from('log_kontak').select('id').eq('vendor_id', v!.id);
    expect(data).toEqual([]);
  });
});
