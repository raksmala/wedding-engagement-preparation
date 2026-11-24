'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export function TombolGoogle() {
  const [memproses, setMemproses] = useState(false);

  async function masuk() {
    setMemproses(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setMemproses(false);
  }

  return (
    <button type="button" className="tombol-utama" onClick={masuk} disabled={memproses}>
      {memproses ? 'Mengalihkan ke Google...' : 'Masuk dengan Google'}
    </button>
  );
}
