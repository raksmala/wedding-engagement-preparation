import { redirect } from 'next/navigation';
import { NavigasiBawah } from '@/components/NavigasiBawah';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  return (
    <>
      <main className="isi-utama">{children}</main>
      <NavigasiBawah />
    </>
  );
}
