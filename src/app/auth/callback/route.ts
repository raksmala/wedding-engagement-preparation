import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { error: errEditor } = await supabase.rpc('pastikan_editor');
      if (!errEditor) return NextResponse.redirect(`${origin}/`);
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=bukan-editor`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=gagal-masuk`);
}
