import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest } from './helpers';

// Halaman Pengaturan memetakan kode galat ini ke pesan: 23505 untuk nama ganda, 23503 untuk item yang dipakai.
let editor: SupabaseClient;
// pastikan_editor() menghubungkan Editor ke Pihak yang namanya sama dengan nama depan dari email.
const PIHAK_EDITOR = 'Ujipihak';

async function hapusPihakEditor() {
  const { error } = await admin.from('pihak').delete().eq('nama', PIHAK_EDITOR);
  if (error) throw error;
}

async function bersihkan() {
  const { error: e1 } = await admin.from('pihak').delete().like('nama', 'Uji %');
  if (e1) throw e1;
  // komponen.kategori_vendor_id memakai on delete restrict, jadi Komponen di Kategori uji dihapus lebih dulu.
  const { data: kategori, error: e2 } = await admin.from('kategori_vendor').select('id').like('nama', 'Uji %');
  if (e2) throw e2;
  const ids = (kategori ?? []).map((k) => k.id);
  if (ids.length > 0) {
    const { error: e3 } = await admin.from('komponen').delete().in('kategori_vendor_id', ids);
    if (e3) throw e3;
  }
  const { error: e4 } = await admin.from('kategori_vendor').delete().like('nama', 'Uji %');
  if (e4) throw e4;
}

beforeAll(async () => {
  // Sisa run yang terhenti: Editor test yang masih terhubung ke Pihak uji harus hilang dulu.
  await bersihkanTest();
  await hapusPihakEditor();
  await bersihkan();
  editor = await buatEditorTest('pengaturan-db@test.local');
});

afterAll(async () => {
  try {
    await bersihkan();
  } finally {
    // Editor test dihapus dulu supaya Pihak yang terhubung ke Editor itu bisa dihapus.
    await bersihkanTest();
    await hapusPihakEditor();
  }
});

describe('pengaturan pihak dan kategori', () => {
  test('nama Pihak dan Kategori Vendor yang sama ditolak dengan 23505', async () => {
    const { error: e1 } = await editor.from('pihak').insert({ nama: 'Uji Pihak Ganda', urutan: 99 });
    expect(e1).toBeNull();
    const { error: e2 } = await editor.from('pihak').insert({ nama: 'Uji Pihak Ganda', urutan: 100 });
    expect(e2?.code).toBe('23505');
    // Index unik lower(nama): beda huruf besar kecil tetap dianggap sama.
    const { error: e2b } = await editor.from('pihak').insert({ nama: 'uji pihak ganda', urutan: 101 });
    expect(e2b?.code).toBe('23505');

    const { error: e3 } = await editor.from('kategori_vendor').insert({ nama: 'Uji Kategori Ganda', urutan: 99 });
    expect(e3).toBeNull();
    const { error: e4 } = await editor.from('kategori_vendor').insert({ nama: 'Uji Kategori Ganda', urutan: 100 });
    expect(e4?.code).toBe('23505');
    const { error: e4b } = await editor.from('kategori_vendor').insert({ nama: 'UJI KATEGORI GANDA', urutan: 101 });
    expect(e4b?.code).toBe('23505');
  });

  test('Kategori Vendor yang punya Komponen tidak bisa dihapus', async () => {
    const { data: k, error } = await editor
      .from('kategori_vendor')
      .insert({ nama: 'Uji Kategori Berkomponen', urutan: 99 })
      .select('id')
      .single();
    if (error) throw error;
    const { error: eKom } = await editor
      .from('komponen')
      .insert({ kategori_vendor_id: k.id, nama: 'Uji Durasi', tipe: 'angka', satuan: 'jam' });
    if (eKom) throw eKom;

    const { error: eHapus } = await editor.from('kategori_vendor').delete().eq('id', k.id);
    expect(eHapus?.code).toBe('23503');
    const { data: masih } = await admin.from('komponen').select('id').eq('kategori_vendor_id', k.id);
    expect(masih).toHaveLength(1);
  });

  test('Pihak yang terhubung ke Editor tidak bisa dihapus', async () => {
    const { data: p, error } = await editor
      .from('pihak')
      .insert({ nama: PIHAK_EDITOR, urutan: 99 })
      .select('id')
      .single();
    if (error) throw error;
    await buatEditorTest('ujipihak@test.local');
    const { data: e } = await admin.from('editor').select('pihak_id').eq('email', 'ujipihak@test.local').single();
    expect(e?.pihak_id).toBe(p.id);

    const { error: eHapus } = await editor.from('pihak').delete().eq('id', p.id);
    expect(eHapus?.code).toBe('23503');
  });

  test('arsip bisa diubah bolak-balik dan Pihak yang belum dipakai bisa dihapus', async () => {
    const { data: p, error } = await editor
      .from('pihak')
      .insert({ nama: 'Uji Pihak Lepas', urutan: 99 })
      .select('id')
      .single();
    if (error) throw error;
    const { data: a1 } = await editor.from('pihak').update({ arsip: true }).eq('id', p.id).select('arsip').single();
    expect(a1?.arsip).toBe(true);
    const { data: a2 } = await editor.from('pihak').update({ arsip: false }).eq('id', p.id).select('arsip').single();
    expect(a2?.arsip).toBe(false);
    const { data: hapus, error: eHapus } = await editor.from('pihak').delete().eq('id', p.id).select('id');
    expect(eHapus).toBeNull();
    expect(hapus).toHaveLength(1);
  });
});
