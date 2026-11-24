import { formatRupiah } from '@/lib/rupiah';

export function Rupiah({ nilai }: { nilai: number }) {
  return <span className="rupiah">{formatRupiah(nilai)}</span>;
}
