import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, buatOrangLuar, klienAnon } from './helpers';

const PATH = 'paket/uji-storage/1-uji.png';
// PNG 1x1
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let editor: SupabaseClient;
let luar: SupabaseClient;

beforeAll(async () => {
  editor = await buatEditorTest('storage-db@test.local');
  luar = await buatOrangLuar('storage-luar@test.local');
  const { error } = await admin.storage.from('lampiran').upload(PATH, PNG, {
    contentType: 'image/png',
    upsert: true,
  });
  if (error) throw error;
});

afterAll(async () => {
  try {
    await admin.storage.from('lampiran').remove([PATH, 'paket/uji-storage/2-editor.png']);
  } finally {
    await bersihkanTest();
  }
});

describe('bucket lampiran', () => {
  test('privat, batas 10 MB, tipe file dibatasi', async () => {
    const { data, error } = await admin.storage.getBucket('lampiran');
    expect(error).toBeNull();
    expect(data?.public).toBe(false);
    expect(data?.file_size_limit).toBe(10485760);
    expect([...(data?.allowed_mime_types ?? [])].sort()).toEqual(
      ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].sort(),
    );
  });

  test('anon tidak bisa membaca objek', async () => {
    const { data, error } = await klienAnon.storage.from('lampiran').download(PATH);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    const { data: signed } = await klienAnon.storage.from('lampiran').createSignedUrl(PATH, 60);
    expect(signed).toBeNull();
    const { data: daftar } = await klienAnon.storage.from('lampiran').list('paket/uji-storage');
    expect(daftar ?? []).toEqual([]);
  });

  test('orang login yang bukan Editor tidak bisa membaca atau menulis', async () => {
    const { data } = await luar.storage.from('lampiran').download(PATH);
    expect(data).toBeNull();
    const { error } = await luar.storage
      .from('lampiran')
      .upload('paket/uji-storage/3-luar.png', PNG, { contentType: 'image/png' });
    expect(error).not.toBeNull();
  });

  test('Editor bisa unggah, membuat signed URL, dan menghapus', async () => {
    const path = 'paket/uji-storage/2-editor.png';
    const { error } = await editor.storage.from('lampiran').upload(path, PNG, { contentType: 'image/png' });
    expect(error).toBeNull();
    const { data: signed, error: eSigned } = await editor.storage.from('lampiran').createSignedUrl(path, 3600);
    expect(eSigned).toBeNull();
    expect(signed?.signedUrl).toContain('token=');
    const { data: hapus, error: eHapus } = await editor.storage.from('lampiran').remove([path]);
    expect(eHapus).toBeNull();
    expect(hapus).toHaveLength(1);
  });

  test('tipe file di luar JPG, PNG, WEBP, PDF ditolak', async () => {
    const { error } = await editor.storage
      .from('lampiran')
      .upload('paket/uji-storage/4-teks.txt', Buffer.from('halo'), { contentType: 'text/plain' });
    expect(error).not.toBeNull();
  });
});
