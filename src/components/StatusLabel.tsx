import type { Database } from '@/lib/database.types';

export type StatusVendor = Database['public']['Enums']['status_vendor'];
export type StatusLain = 'lunas' | 'terlambat' | 'belum_bayar';

export const LABEL_STATUS_VENDOR: Record<StatusVendor, string> = {
  kandidat: 'Kandidat',
  survei_nego: 'Survei/Nego',
  booked: 'Booked',
  selesai: 'Selesai',
  batal: 'Batal',
};

type Warna = 'aksen' | 'primer' | 'lembut' | 'teks';

const TAMPIL: Record<StatusVendor | StatusLain, { label: string; warna: Warna }> = {
  kandidat: { label: LABEL_STATUS_VENDOR.kandidat, warna: 'teks' },
  survei_nego: { label: LABEL_STATUS_VENDOR.survei_nego, warna: 'teks' },
  booked: { label: LABEL_STATUS_VENDOR.booked, warna: 'aksen' },
  selesai: { label: LABEL_STATUS_VENDOR.selesai, warna: 'aksen' },
  batal: { label: LABEL_STATUS_VENDOR.batal, warna: 'lembut' },
  // Status keuangan, dipakai Task 9.
  lunas: { label: 'Lunas', warna: 'aksen' },
  terlambat: { label: 'Terlambat', warna: 'primer' },
  belum_bayar: { label: 'Belum bayar', warna: 'primer' },
};

// Status selalu berupa teks, warna hanya penegas.
export function StatusLabel({ status }: { status: StatusVendor | StatusLain }) {
  const { label, warna } = TAMPIL[status];
  return <span className={`status-label status-${warna}`}>{label}</span>;
}
