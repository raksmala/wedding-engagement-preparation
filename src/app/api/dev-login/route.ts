import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Hanya untuk e2e terhadap project Supabase dev. Semua guard wajib lolos, kalau tidak 404.
function diizinkan(email: string | null): email is string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const ref = process.env.SUPABASE_DEV_PROJECT_REF ?? '';
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_LOGIN === '1' &&
    ref !== '' &&
    url.includes(ref) &&
    !!email &&
    email.endsWith('@test.local')
  );
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!diizinkan(email)) return new NextResponse('Not found', { status: 404 });

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: link, error: errLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  // User yang belum ada dibuat oleh generateLink, dan tipenya jadi signup.
  const tipe = link?.properties?.verification_type ?? 'magiclink';
  if (errLink || !tokenHash) return new NextResponse('Not found', { status: 404 });

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: tipe, token_hash: tokenHash });
  if (error) return new NextResponse('Not found', { status: 404 });

  const { error: errEditor } = await supabase.rpc('pastikan_editor');
  if (errEditor) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=bukan-editor`);
  }
  return NextResponse.redirect(`${request.nextUrl.origin}/`);
}
