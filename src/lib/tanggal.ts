const formatJakarta = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function hariIniJakarta(sekarang: Date = new Date()): string {
  return formatJakarta.format(sekarang);
}

const HARI_MS = 86_400_000;

function selisihHari(dari: string, ke: string): number {
  return Math.round((Date.parse(ke) - Date.parse(dari)) / HARI_MS);
}

const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatTanggal(tanggal: string): string {
  const [tahun, bulan, hari] = tanggal.split('-').map(Number);
  return `${hari} ${NAMA_BULAN[bulan - 1]} ${tahun}`;
}

export function kelompokJatuhTempo(
  jatuhTempo: string | null,
  hariIni: string,
): 'terlambat' | 'hari_ini' | 'tujuh_hari' | null {
  if (!jatuhTempo) return null;
  const selisih = selisihHari(hariIni, jatuhTempo);
  if (selisih < 0) return 'terlambat';
  if (selisih === 0) return 'hari_ini';
  if (selisih <= 7) return 'tujuh_hari';
  return null;
}

const formatJam = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// Contoh: "24 November 2026 15.05 WIB". Input berupa timestamp ISO.
export function formatTanggalJamWib(iso: string): string {
  const waktu = new Date(iso);
  const [jam, menit] = formatJam.format(waktu).split(':');
  return `${formatTanggal(hariIniJakarta(waktu))} ${jam}.${menit} WIB`;
}

// Tanggal nyata berformat YYYY-MM-DD. Tanggal seperti 2026-02-30 ditolak.
export function tanggalValid(s: string): boolean {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!cocok) return false;
  const [tahun, bulan, hari] = [Number(cocok[1]), Number(cocok[2]), Number(cocok[3])];
  const d = new Date(Date.UTC(tahun, bulan - 1, hari));
  return d.getUTCFullYear() === tahun && d.getUTCMonth() === bulan - 1 && d.getUTCDate() === hari;
}
