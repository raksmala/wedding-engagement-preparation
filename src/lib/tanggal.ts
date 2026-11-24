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
