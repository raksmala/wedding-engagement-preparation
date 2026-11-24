import { JudulHalaman } from '@/components/JudulHalaman';
import { TombolGoogle } from './TombolGoogle';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main style={{ padding: '2rem 1rem', maxWidth: 480, margin: '0 auto' }}>
      <JudulHalaman judul="Rendy & Dinar" />
      <p>Masuk untuk melihat persiapan pernikahan.</p>
      {error === 'bukan-editor' && (
        <p role="alert" className="pesan-galat">
          Akun ini tidak terdaftar sebagai Editor.
        </p>
      )}
      {error === 'gagal-masuk' && (
        <p role="alert" className="pesan-galat">
          Gagal masuk. Coba lagi.
        </p>
      )}
      <TombolGoogle />
    </main>
  );
}
