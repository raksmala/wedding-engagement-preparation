import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest } from './helpers';

// Halaman Pengaturan memetakan kode galat ini ke pesan: 23505 untuk nama ganda, 23503 untuk item yang dipakai.
let editor: SupabaseClient;
// pastikan_editor() menghubungkan Editor ke Pihak yang namanya sama dengan nama depan dari email.
const PIHAK_EDITOR = 'Ujipihak';

async function bersihkan() {
  await admin.from('pihak').delete().like('nama', 'Uji %');
  await admin.from('kategori_vendor').delete().like('nama', 'Uji %');
}

beforeAll(async () => {
  // Sisa run yang terhenti: Editor test yang masih terhubung ke Pihak uji harus hilang dulu.
  await bersihkanTest();
  await admin.from('pihak').delete().eq('nama', PIHAK_EDITOR);
  await bersihkan();
  editor = await buatEditorTest('pengaturan-db@test.local');
});

afterAll(async () => {
  try {
    await bersihkan();
  } finally {
    // Editor test dihapus dulu supaya Pihak yang terhubung ke Editor itu bisa dihapus.
    await bersihkanTest();
    await admin.from('pihak').delete().eq('nama', PIHAK_EDITOR);
  }
});

describe('pengaturan pihak dan kategori', () => {
  test('nama Pihak dan Kategori Vendor yang sama ditolak dengan 23505', async () => {
    const { error: e1 } = await editor.from('pihak').insert({ nama: 'Uji Pihak Ganda', urutan: 99 });
    expect(e1).toBeNull();
    const { error: e2 } = await editor.from('pihak').insert({ nama: 'Uji Pihak Ganda', urutan: 100 });
    expect(e2?.code).toBe('23505');

    const { error: e3 } = await editor.from('kategori_vendor').insert({ nama: 'Uji Kategori Ganda', urutan: 99 });
    expect(e3).toBeNull();
    const { error: e4 } = await editor.from('kategori_vendor').insert({ nama: 'Uji Kategori Ganda', urutan: 100 });
    expect(e4?.code).toBe('23505');
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
