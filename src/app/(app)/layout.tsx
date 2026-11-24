import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  return <main style={{ padding: '2rem 1rem', maxWidth: 720, margin: '0 auto' }}>{children}</main>;
}
