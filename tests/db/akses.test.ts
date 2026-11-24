import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  test('audit terisi otomatis dan tidak bisa dipalsukan', async () => {
    const dinar = await buatEditorTest('dinar@test.local');
    const rendy = await buatEditorTest('rendy@test.local');
    const { data: idDinar, error: e0 } = await dinar.rpc('pastikan_editor');
    expect(e0).toBeNull();
    const { data: idRendy } = await rendy.rpc('pastikan_editor');
    expect(idRendy).toBeTruthy();
    expect(idRendy).not.toBe(idDinar);

    const { data, error } = await dinar
      .from('acara')
      .insert({ nama: 'Pengajian', jenis: 'lainnya' })
      .select('id, dibuat_oleh, diubah_oleh')
      .single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
    try {
      expect(data?.dibuat_oleh).toBe(idDinar);
      expect(data?.diubah_oleh).toBe(idDinar);
    } finally {
      if (data?.id) await admin.from('acara').delete().eq('id', data.id);
    }

    const { data: palsu, error: ePalsu } = await dinar
      .from('acara')
      .insert({ nama: 'Pengajian Palsu', jenis: 'lainnya', dibuat_oleh: idRendy, diubah_oleh: idRendy })
      .select('id, dibuat_oleh, diubah_oleh')
      .single();
    expect(ePalsu).toBeNull();
    try {
      expect(palsu?.dibuat_oleh).toBe(idDinar);
      expect(palsu?.diubah_oleh).toBe(idDinar);
      const { data: ubah } = await dinar
        .from('acara')
        .update({ lokasi: 'Bandung', dibuat_oleh: idRendy, diubah_oleh: idRendy })
        .eq('id', palsu!.id)
        .select('dibuat_oleh, diubah_oleh')
        .single();
      expect(ubah?.dibuat_oleh).toBe(idDinar);
      expect(ubah?.diubah_oleh).toBe(idDinar);
    } finally {
      if (palsu?.id) await admin.from('acara').delete().eq('id', palsu.id);
    }
  });

  test('orang luar tidak bisa menulis ke tabel mana pun', async () => {
    const luar = await buatOrangLuar('luar2@test.local');

    await luar.from('editor_diizinkan').insert({ email: 'luar2@test.local' });
    const { data: al } = await admin.from('editor_diizinkan').select('email').eq('email', 'luar2@test.local');
    expect(al).toEqual([]);

    await luar.from('acara').insert({ nama: 'Acara Luar', jenis: 'lainnya' });
    const { data: ac } = await admin.from('acara').select('id').eq('nama', 'Acara Luar');
    expect(ac).toEqual([]);

    await luar.from('acara').update({ nama: 'Diretas' }).eq('nama', 'Akad');
    const { data: akad } = await admin.from('acara').select('nama').eq('nama', 'Akad');
    expect(akad?.length).toBe(1);
    const { data: diretas } = await admin.from('acara').select('id').eq('nama', 'Diretas');
    expect(diretas).toEqual([]);

    await luar.from('pihak').insert({ nama: 'Pihak Luar' });
    const { data: pi } = await admin.from('pihak').select('id').eq('nama', 'Pihak Luar');
    expect(pi).toEqual([]);

    await luar.from('pihak').update({ nama: 'Diretas' }).eq('nama', 'Rendy');
    const { data: rendyAda } = await admin.from('pihak').select('nama').eq('nama', 'Rendy');
    expect(rendyAda?.length).toBe(1);
  });

  test('editor tidak bisa menulis langsung ke tabel editor', async () => {
    const rendy = await buatEditorTest('rendy@test.local');
    const { data: id } = await rendy.rpc('pastikan_editor');
    const { data: sebelum } = await admin.from('editor').select('nama').eq('id', id).single();

    const { error: eIns } = await rendy
      .from('editor')
      .insert({ auth_user_id: crypto.randomUUID(), email: 'palsu@test.local', nama: 'Palsu' });
    expect(eIns).not.toBeNull();
    const { data: palsu } = await admin.from('editor').select('id').eq('email', 'palsu@test.local');
    expect(palsu).toEqual([]);

    await rendy.from('editor').update({ nama: 'Diretas' }).eq('id', id);
    const { data: sesudah } = await admin.from('editor').select('nama').eq('id', id).single();
    expect(sesudah?.nama).toBe(sebelum?.nama);
  });

  // Password login menolak user yang belum terkonfirmasi, jadi tidak ada sesi yang bisa dipakai.
  // Pemeriksaan dijalankan lewat CLI sebagai role authenticated dengan klaim JWT untuk user itu
  // (transaksi di-rollback), yaitu kondisi yang sama dengan yang dilihat RLS.
  function lihatSebagai(userId: string): { editor: boolean; jumlahAcara: number } {
    const sql = [
      'begin;',
      'set local role authenticated;',
      `select set_config('request.jwt.claims', '{"sub":"${userId}","role":"authenticated","email":"belum@test.local"}', true);`,
      'select is_editor() as ed, (select count(*) from acara) as n;',
      'rollback;',
    ].join(String.fromCharCode(10));
    const dir = mkdtempSync(join(tmpdir(), 'akses-'));
    const file = join(dir, 'q.sql');
    writeFileSync(file, sql);
    try {
      const out = execFileSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['supabase', 'db', 'query', '--linked', '--yes', '-f', file],
        { encoding: 'utf8', shell: process.platform === 'win32' },
      );
      const json = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
      return { editor: json.rows[0].ed, jumlahAcara: Number(json.rows[0].n) };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  test('email di allowlist tapi belum terkonfirmasi bukan editor', () => {
    return (async () => {
      const email = 'belum@test.local';
      await admin.from('editor_diizinkan').upsert({ email });
      const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: false });
      expect(error).toBeNull();
      const id = data.user!.id;
      expect(data.user!.email_confirmed_at ?? null).toBeNull();

      expect(lihatSebagai(id)).toEqual({ editor: false, jumlahAcara: 0 });

      // Kontrol: setelah dikonfirmasi, user yang sama menjadi editor dan bisa membaca acara.
      await admin.auth.admin.updateUserById(id, { email_confirm: true });
      const sesudah = lihatSebagai(id);
      expect(sesudah.editor).toBe(true);
      expect(sesudah.jumlahAcara).toBeGreaterThanOrEqual(4);
    })();
  }, 60_000);

  test('anon tidak bisa memanggil pastikan_editor', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const { loadEnv } = await import('vite');
    const e = loadEnv('test', process.cwd(), '');
    const anon = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { error } = await anon.rpc('pastikan_editor');
    expect(error).not.toBeNull();
  });
});
