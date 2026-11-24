import Link from 'next/link';
import { JudulHalaman } from '@/components/JudulHalaman';
import { createClient } from '@/lib/supabase/server';
import { DaftarPengaturan, type ItemPengaturan } from './DaftarPengaturan';

function teksPemakaian(bagian: [number, string][]): string | null {
  const ada = bagian.filter(([n]) => n > 0).map(([n, benda]) => `${n} ${benda}`);
  return ada.length > 0 ? `Dipakai: ${ada.join(', ')}` : null;
}

export default async function PengaturanPage() {
  const supabase = await createClient();
  const [pihak, kategori, editor] = await Promise.all([
    supabase.from('pihak').select('id, nama, arsip, pembayaran(count)').order('urutan').order('nama'),
    supabase
      .from('kategori_vendor')
      .select('id, nama, arsip, vendor(count), komponen(count)')
      .order('urutan')
      .order('nama'),
    supabase.from('editor').select('pihak_id'),
  ]);
  if (pihak.error || kategori.error || editor.error) throw new Error('Gagal memuat pengaturan');

  const editorPerPihak = new Map<string, number>();
  for (const e of editor.data) {
    if (e.pihak_id) editorPerPihak.set(e.pihak_id, (editorPerPihak.get(e.pihak_id) ?? 0) + 1);
  }

  const daftarPihak: ItemPengaturan[] = pihak.data.map((p) => ({
    id: p.id,
    nama: p.nama,
    arsip: p.arsip,
    pemakaian: teksPemakaian([
      [p.pembayaran[0]?.count ?? 0, 'pembayaran'],
      [editorPerPihak.get(p.id) ?? 0, 'Editor'],
    ]),
  }));
  const daftarKategori: ItemPengaturan[] = kategori.data.map((k) => ({
    id: k.id,
    nama: k.nama,
    arsip: k.arsip,
    pemakaian: teksPemakaian([
      [k.vendor[0]?.count ?? 0, 'vendor'],
      [k.komponen[0]?.count ?? 0, 'komponen'],
    ]),
  }));

  return (
    <>
      <JudulHalaman judul="Pengaturan" />
      <p>
        Pihak dan kategori yang sudah dipakai tidak bisa dihapus, hanya diarsipkan. Yang diarsipkan hilang dari
        pilihan form, tetapi tetap tampil di data lama.
      </p>

      <section className="bagian" aria-labelledby="judul-pihak">
        <h2 id="judul-pihak">Pihak</h2>
        <p className="teks-lembut">Sumber dana atau pembeli, dipilih saat menandai pembayaran Dibayar.</p>
        <DaftarPengaturan jenis="pihak" daftar={daftarPihak} />
      </section>

      <section className="bagian" aria-labelledby="judul-kategori">
        <h2 id="judul-kategori">Kategori Vendor</h2>
        <p className="teks-lembut">Jenis layanan vendor. Setiap vendor punya satu kategori.</p>
        <DaftarPengaturan jenis="kategori" daftar={daftarKategori} />
      </section>

      <section className="bagian" aria-labelledby="judul-komponen">
        <h2 id="judul-komponen">Komponen pembanding</h2>
        <p className="teks-lembut">Butir yang dibandingkan antarpaket, diatur per Kategori Vendor.</p>
        <Link href="/pengaturan/komponen" className="tautan-aksi">
          Atur komponen pembanding
        </Link>
      </section>
    </>
  );
}
