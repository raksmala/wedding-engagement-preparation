import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, bersihkanTest, buatEditorTest, buatOrangLuar } from './helpers';

let editor: SupabaseClient;
let picId: string;
let kategoriId: string;

async function bersihkan() {
  const { error } = await admin.from('tugas').delete().like('judul', 'Uji %');
  if (error) throw error;
  const { error: e2 } = await admin.from('vendor').delete().like('nama', 'Uji %');
  if (e2) throw e2;
}

beforeAll(async () => {
  editor = await buatEditorTest('tugas-db@test.local');
  await bersihkan();
  const { data: id, error } = await editor.rpc('editor_saat_ini');
  if (error) throw error;
  picId = id as string;
  const { data: k, error: ek } = await editor.from('kategori_vendor').select('id').eq('nama', 'Foto & Video').single();
  if (ek) throw ek;
  kategoriId = k.id;
});

afterAll(async () => {
  try {
    await bersihkan();
  } finally {
    await bersihkanTest();
  }
});

async function buatVendorDenganLog(nama: string): Promise<{ vendorId: string; logId: string }> {
  const { data: v, error } = await editor
    .from('vendor')
    .insert({ nama: `Uji ${nama}`, kategori_vendor_id: kategoriId })
    .select('id')
    .single();
  if (error) throw error;
  const { data: l, error: e2 } = await editor
    .from('log_kontak')
    .insert({ vendor_id: v.id, tanggal: '2026-11-20', saluran: 'whatsapp', isi: 'Minta revisi pricelist' })
    .select('id')
    .single();
  if (e2) throw e2;
  return { vendorId: v.id, logId: l.id };
}

describe('tugas', () => {
  test('pic_id wajib diisi', async () => {
    const { error } = await editor.from('tugas').insert({ judul: 'Uji Tanpa PIC' } as never);
    expect(error?.code).toBe('23502');
  });

  test('judul kosong ditolak', async () => {
    const { error } = await editor.from('tugas').insert({ judul: '   ', pic_id: picId });
    expect(error?.code).toBe('23514');
  });

  test('selesai_pada terisi otomatis saat selesai dan kosong lagi saat dibuka kembali', async () => {
    const { data: t, error } = await editor
      .from('tugas')
      .insert({ judul: 'Uji Selesai', pic_id: picId, selesai_pada: '2020-01-01T00:00:00Z' })
      .select('id, status, selesai_pada')
      .single();
    expect(error).toBeNull();
    expect(t?.status).toBe('belum');
    expect(t?.selesai_pada).toBeNull();

    const sebelum = Date.now();
    const { data: s } = await editor
      .from('tugas')
      .update({ status: 'selesai' })
      .eq('id', t!.id)
      .select('selesai_pada')
      .single();
    expect(s?.selesai_pada).not.toBeNull();
    // Toleransi selisih jam server dan mesin test.
    expect(Date.parse(s!.selesai_pada!)).toBeGreaterThan(sebelum - 60_000);

    // Ubah judul Tugas yang sudah selesai tidak menggeser selesai_pada.
    const { data: s2 } = await editor
      .from('tugas')
      .update({ judul: 'Uji Selesai Diubah', selesai_pada: '2020-01-01T00:00:00Z' })
      .eq('id', t!.id)
      .select('selesai_pada')
      .single();
    expect(s2?.selesai_pada).toBe(s?.selesai_pada);

    const { data: b } = await editor
      .from('tugas')
      .update({ status: 'belum' })
      .eq('id', t!.id)
      .select('selesai_pada')
      .single();
    expect(b?.selesai_pada).toBeNull();
  });

  test('tugas dibuat langsung berstatus selesai juga punya selesai_pada', async () => {
    const { data, error } = await editor
      .from('tugas')
      .insert({ judul: 'Uji Langsung Selesai', pic_id: picId, status: 'selesai' })
      .select('selesai_pada')
      .single();
    expect(error).toBeNull();
    expect(data?.selesai_pada).not.toBeNull();
  });

  test('audit terisi otomatis', async () => {
    const { data } = await editor
      .from('tugas')
      .insert({ judul: 'Uji Audit', pic_id: picId })
      .select('dibuat_oleh, diubah_oleh')
      .single();
    expect(data?.dibuat_oleh).toBe(picId);
    expect(data?.diubah_oleh).toBe(picId);
  });

  test('follow-up dari log kontak vendor lain ditolak', async () => {
    const a = await buatVendorDenganLog('Log A');
    const b = await buatVendorDenganLog('Log B');
    const { error } = await editor
      .from('tugas')
      .insert({ judul: 'Uji Beda Vendor', pic_id: picId, vendor_id: b.vendorId, log_kontak_id: a.logId });
    expect(error?.message).toContain('log_beda_vendor');

    const { error: ok } = await editor
      .from('tugas')
      .insert({ judul: 'Uji Sama Vendor', pic_id: picId, vendor_id: a.vendorId, log_kontak_id: a.logId });
    expect(ok).toBeNull();
  });

  test('menghapus vendor tidak menghapus tugas follow-up', async () => {
    const a = await buatVendorDenganLog('Hapus');
    const { data: t } = await editor
      .from('tugas')
      .insert({ judul: 'Uji Tetap Ada', pic_id: picId, vendor_id: a.vendorId, log_kontak_id: a.logId })
      .select('id')
      .single();
    const { error } = await editor.from('vendor').delete().eq('id', a.vendorId);
    expect(error).toBeNull();
    const { data } = await editor.from('tugas').select('vendor_id, log_kontak_id').eq('id', t!.id).single();
    expect(data).toEqual({ vendor_id: null, log_kontak_id: null });
  });

  test('orang luar tidak bisa membaca atau menulis tugas', async () => {
    await editor.from('tugas').insert({ judul: 'Uji Rahasia', pic_id: picId });
    const luar = await buatOrangLuar('tugas-luar@test.local');
    const { data } = await luar.from('tugas').select('id');
    expect(data).toEqual([]);
    const { error } = await luar.from('tugas').insert({ judul: 'Uji Luar', pic_id: picId });
    expect(error).not.toBeNull();
  });
});
