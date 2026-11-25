'use client';

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="halaman-pembaca">
      <div role="alert" className="pesan-galat">
        <p>Halaman ini belum bisa dimuat.</p>
        <button type="button" className="tombol-utama" onClick={retry}>
          Coba lagi
        </button>
      </div>
    </main>
  );
}
