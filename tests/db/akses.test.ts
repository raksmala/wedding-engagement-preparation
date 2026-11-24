import { afterAll, describe, expect, test } from 'vitest';
import { admin, bersihkanTest, buatEditorTest, buatOrangLuar } from './helpers';

afterAll(async () => {
  await bersihkanTest();
});

describe('akses dasar', () => {
  test('editor bisa membaca acara default', async () => {
    const rendy = await buatEditorTest('rendy@test.local');
    const { data } = await rendy.from('acara').select('nama').order('nama');
    expect(data?.map((a) => a.nama)).toEqual(
      expect.arrayContaining(['Akad', 'Lamaran', 'Ngunduh Mantu', 'Resepsi']),
    );
  });

  test('orang luar tidak bisa membaca apa pun', async () => {
    const luar = await buatOrangLuar('luar@test.local');
    const { data } = await luar.from('acara').select('id');
    expect(data).toEqual([]);
    const { error } = await luar.rpc('pastikan_editor');
    expect(error?.message).toContain('bukan_editor');
  });

  test('audit terisi otomatis', async () => {
    const dinar = await buatEditorTest('dinar@test.local');
    const { data } = await dinar
      .from('acara')
      .insert({ nama: 'Pengajian', jenis: 'lainnya' })
      .select('id, dibuat_oleh, diubah_oleh')
      .single();
    try {
      expect(data?.dibuat_oleh).not.toBeNull();
      expect(data?.diubah_oleh).toBe(data?.dibuat_oleh);
    } finally {
      if (data?.id) await admin.from('acara').delete().eq('id', data.id);
    }
  });

  test('anon tidak bisa memanggil pastikan_editor', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const { loadEnv } = await import('vite');
    const e = loadEnv('test', process.cwd(), '');
    const anon = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { error } = await anon.rpc('pastikan_editor');
    expect(error).not.toBeNull();
  });
});
