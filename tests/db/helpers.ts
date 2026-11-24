import { randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('test', process.cwd(), '');
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  throw new Error('Env Supabase dev belum lengkap di .env.local');
}
if (!env.SUPABASE_DEV_PROJECT_REF || !URL.includes(env.SUPABASE_DEV_PROJECT_REF)) {
  throw new Error('Test db hanya boleh berjalan terhadap project dev');
}

const opsi = { auth: { persistSession: false, autoRefreshToken: false } };
const PASSWORD = randomBytes(24).toString('hex');
const EMAIL_TEST = '@test.local';

export const admin: SupabaseClient = createClient(URL, SERVICE, opsi);

function pastikanEmailTest(email: string) {
  if (!email.endsWith(EMAIL_TEST)) throw new Error('Email test harus berakhiran @test.local');
}

async function buatUser(email: string): Promise<SupabaseClient> {
  pastikanEmailTest(email);
  const { error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) {
    // Sisa dari run yang gagal: pakai ulang user itu dengan password run ini.
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const ada = data?.users.find((u) => u.email === email);
    if (!ada) throw error;
    const { error: e2 } = await admin.auth.admin.updateUserById(ada.id, { password: PASSWORD });
    if (e2) throw e2;
  }
  const klien = createClient(URL, ANON, opsi);
  const { error: eLogin } = await klien.auth.signInWithPassword({ email, password: PASSWORD });
  if (eLogin) throw eLogin;
  return klien;
}

export async function buatEditorTest(email: string): Promise<SupabaseClient> {
  pastikanEmailTest(email);
  const { error } = await admin.from('editor_diizinkan').upsert({ email });
  if (error) throw error;
  const klien = await buatUser(email);
  const { error: ePastikan } = await klien.rpc('pastikan_editor');
  if (ePastikan) throw ePastikan;
  return klien;
}

export async function buatOrangLuar(email: string): Promise<SupabaseClient> {
  return buatUser(email);
}

// Trigger vendor_punya_pembayaran menolak hapus Vendor dengan Pembayaran dibayar,
// jadi Pembayaran milik Vendor "Uji " dihapus lebih dulu.
async function hapusPembayaranUji(): Promise<void> {
  const { data: vendor } = await admin.from('vendor').select('id').like('nama', 'Uji %');
  const ids = (vendor ?? []).map((v) => v.id);
  if (ids.length === 0) return;
  const { data: kontrak } = await admin.from('kontrak').select('id').in('vendor_id', ids);
  const kids = (kontrak ?? []).map((k) => k.id);
  if (kids.length === 0) return;
  const { error } = await admin.from('pembayaran').delete().in('kontrak_id', kids);
  if (error) throw error;
}

// tugas.pic_id menolak hapus Editor yang masih jadi PIC, jadi Tugas milik Editor test dihapus dulu.
async function hapusTugasUji(): Promise<void> {
  const { data: editor } = await admin.from('editor').select('id').like('email', `%${EMAIL_TEST}`);
  const ids = (editor ?? []).map((e) => e.id);
  if (ids.length === 0) return;
  const { error } = await admin.from('tugas').delete().in('pic_id', ids);
  if (error) throw error;
}

export async function bersihkanTest(): Promise<void> {
  await hapusPembayaranUji();
  await hapusTugasUji();
  const { error: e1 } = await admin.from('editor_diizinkan').delete().like('email', `%${EMAIL_TEST}`);
  if (e1) throw e1;
  const { error: e2 } = await admin.from('editor').delete().like('email', `%${EMAIL_TEST}`);
  if (e2) throw e2;
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith(EMAIL_TEST)) await admin.auth.admin.deleteUser(u.id);
  }
}

export const klienAnon: SupabaseClient = createClient(URL, ANON, opsi);
