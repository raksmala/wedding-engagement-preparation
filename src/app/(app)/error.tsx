'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="pesan-galat">
      <p>Halaman ini belum bisa dimuat.</p>
      <button type="button" className="tombol-utama" onClick={reset}>
        Coba lagi
      </button>
    </div>
  );
}
