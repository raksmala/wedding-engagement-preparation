'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="pesan-galat">
      <p>Pengaturan belum bisa dimuat.</p>
      <button type="button" className="tombol-utama" onClick={reset}>
        Coba lagi
      </button>
    </div>
  );
}
