export function linkWhatsApp(nomor: string): string | null {
  const bersih = nomor.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(bersih)) return null;
  let internasional: string;
  if (bersih.startsWith('0')) internasional = `62${bersih.slice(1)}`;
  else if (bersih.startsWith('62')) internasional = bersih;
  else return null;
  const panjang = internasional.length - 2;
  if (panjang < 10 || panjang > 13) return null;
  return `https://wa.me/${internasional}`;
}
