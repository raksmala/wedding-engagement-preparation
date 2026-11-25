/**
 * Ubah nomor WhatsApp ke format `62xxxxxxxxxx` (tanpa spasi, tanda, atau plus).
 * Menerima awalan `0`, `8`, `62`, `+62`, dan `0062`. Mengembalikan null jika tidak dikenali.
 */
export function normalisasiWhatsApp(nomor: string): string | null {
  let bersih = nomor.replace(/[\s\-().]/g, '');
  if (bersih.startsWith('+')) bersih = bersih.slice(1);
  else if (bersih.startsWith('00')) bersih = bersih.slice(2);
  if (!/^\d+$/.test(bersih)) return null;
  let internasional: string;
  if (bersih.startsWith('0')) internasional = `62${bersih.slice(1)}`;
  else if (bersih.startsWith('62')) internasional = bersih;
  else if (bersih.startsWith('8')) internasional = `62${bersih}`;
  else return null;
  if (internasional[2] === '0') return null;
  const panjang = internasional.length - 2;
  if (panjang < 10 || panjang > 13) return null;
  return internasional;
}

export function linkWhatsApp(nomor: string): string | null {
  const internasional = normalisasiWhatsApp(nomor);
  return internasional ? `https://wa.me/${internasional}` : null;
}
