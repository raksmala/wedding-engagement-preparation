import Link from 'next/link';

export function Kosong({ pesan, aksi }: { pesan: string; aksi?: { label: string; href: string } }) {
  return (
    <div className="kosong">
      <p>{pesan}</p>
      {aksi && (
        <Link href={aksi.href} className="tombol-utama">
          {aksi.label}
        </Link>
      )}
    </div>
  );
}
