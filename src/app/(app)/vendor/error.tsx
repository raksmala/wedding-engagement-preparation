'use client';

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert" className="pesan-galat">
      <p>Vendor belum bisa dimuat.</p>
      <button type="button" className="tombol-utama" onClick={retry}>
        Coba lagi
      </button>
    </div>
  );
}
