import type { Database } from '@/lib/database.types';

export type StatusVendor = Database['public']['Enums']['status_vendor'];
export type StatusLain = 'lunas' | 'belum_lunas' | 'terjadwal' | 'dibayar' | 'terlambat' | 'belum_bayar';

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
  // Status keuangan.
  lunas: { label: 'Lunas', warna: 'aksen' },
  belum_lunas: { label: 'Belum lunas', warna: 'teks' },
  terjadwal: { label: 'Terjadwal', warna: 'teks' },
  dibayar: { label: 'Dibayar', warna: 'aksen' },
  terlambat: { label: 'Terlambat', warna: 'primer' },
  belum_bayar: { label: 'Belum bayar', warna: 'primer' },
};

// Status selalu berupa teks, warna hanya penegas.
export function StatusLabel({ status }: { status: StatusVendor | StatusLain }) {
  const { label, warna } = TAMPIL[status];
  return <span className={`status-label status-${warna}`}>{label}</span>;
}

export type StatusPaket = Database['public']['Enums']['status_paket'];

export const LABEL_STATUS_PAKET: Record<StatusPaket, { label: string; warna: Warna }> = {
  aktif: { label: 'Aktif', warna: 'teks' },
  dipilih: { label: 'Dipilih', warna: 'aksen' },
  tidak_dipilih: { label: 'Tidak dipilih', warna: 'lembut' },
};

export function StatusPaketLabel({ status }: { status: StatusPaket }) {
  const { label, warna } = LABEL_STATUS_PAKET[status];
  return <span className={`status-label status-${warna}`}>{label}</span>;
}
