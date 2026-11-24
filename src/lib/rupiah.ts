const formatAngka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function formatRupiah(nilai: number): string {
  const angka = formatAngka.format(nilai).replace(/[^\d.,-]/g, '');
  return `Rp ${angka}`;
}

export function parseRupiah(input: string): number | null {
  const cocok = /^(?:Rp\s*)?(\d{1,3}(?:\.\d{3})+|\d+)$/.exec(input.trim());
  if (!cocok) return null;
  const nilai = Number(cocok[1].replaceAll('.', ''));
  return Number.isSafeInteger(nilai) ? nilai : null;
}
