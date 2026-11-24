import { JudulHalaman } from '@/components/JudulHalaman';
import { Kosong } from '@/components/Kosong';
import { embedSatu } from '@/lib/embed';
import { jejakAudit } from '@/lib/jejak';
import { createClient } from '@/lib/supabase/server';
import { hariIniJakarta } from '@/lib/tanggal';
import { tugasTerlambat } from '@/lib/tugas';
import { adalahUuid } from '@/lib/validasi';
import { DaftarTugas, type BarisTugas } from './DaftarTugas';

const FILTER_STATUS = { belum: 'Belum selesai', selesai: 'Selesai', semua: 'Semua status' } as const;
type FilterStatus = keyof typeof FILTER_STATUS;

function satu(nilai: string | string[] | undefined): string | undefined {
  return Array.isArray(nilai) ? nilai[0] : nilai;
}

export default async function TugasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const picParam = satu(sp.pic);
  const statusParam = satu(sp.status);
  const acaraParam = satu(sp.acara);
  const vendorParam = satu(sp.vendor);
  const picId = picParam && adalahUuid(picParam) ? picParam : '';
  const acaraId = acaraParam && adalahUuid(acaraParam) ? acaraParam : '';
  const vendorId = vendorParam && adalahUuid(vendorParam) ? vendorParam : '';
  const status: FilterStatus =
    statusParam && Object.hasOwn(FILTER_STATUS, statusParam) ? (statusParam as FilterStatus) : 'belum';
  const adaFilter = !!(picId || acaraId || vendorId) || status !== 'belum';

  const supabase = await createClient();

  let kueri = supabase
    .from('tugas')
    .select(
      'id, judul, catatan, pic_id, jatuh_tempo, status, selesai_pada, diubah_pada, diubah_oleh, vendor(id, nama), acara(id, nama), log_kontak(tanggal)',
    );
  if (picId) kueri = kueri.eq('pic_id', picId);
  if (acaraId) kueri = kueri.eq('acara_id', acaraId);
  if (vendorId) kueri = kueri.eq('vendor_id', vendorId);
  if (status !== 'semua') kueri = kueri.eq('status', status);
  // Belum selesai: Jatuh Tempo terdekat dulu, tanpa Jatuh Tempo di akhir. Selesai: yang terbaru dulu.
  kueri =
    status === 'selesai'
      ? kueri.order('selesai_pada', { ascending: false })
      : kueri.order('status').order('jatuh_tempo', { nullsFirst: false }).order('dibuat_pada');

  const [tugas, editor, vendor, acara, saatIni] = await Promise.all([
    kueri,
    supabase.from('editor').select('id, nama').order('nama'),
    supabase.from('vendor').select('id, nama').order('nama'),
    supabase.from('acara').select('id, nama').order('tanggal', { nullsFirst: false }).order('nama'),
    supabase.rpc('editor_saat_ini'),
  ]);
  if (tugas.error || editor.error || vendor.error || acara.error || saatIni.error) {
    throw new Error('Gagal memuat tugas');
  }

  const hariIni = hariIniJakarta();
  const nama = new Map(editor.data.map((e) => [e.id, e.nama]));
  const baris: BarisTugas[] = tugas.data.map((t) => ({
    id: t.id,
    judul: t.judul,
    catatan: t.catatan,
    pic_id: t.pic_id,
    pic_nama: nama.get(t.pic_id) ?? 'Editor tidak dikenal',
    jatuh_tempo: t.jatuh_tempo,
    status: t.status,
    terlambat: tugasTerlambat(t, hariIni),
    vendor: embedSatu(t.vendor),
    acara: embedSatu(t.acara),
    dari_log: embedSatu(t.log_kontak)?.tanggal ?? null,
    diubah: jejakAudit(t.diubah_oleh, t.diubah_pada, nama),
  }));

  return (
    <>
      <JudulHalaman judul="Tugas" />

      <form method="get" action="/tugas" className="filter filter-empat" role="search" aria-label="Filter tugas">
        <label>
          PIC
          <select name="pic" defaultValue={picId}>
            <option value="">Semua PIC</option>
            {editor.data.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nama}
              </option>
            ))}
          </select>
        </label>
        <label>
          Acara
          <select name="acara" defaultValue={acaraId}>
            <option value="">Semua acara</option>
            {acara.data.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nama}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vendor
          <select name="vendor" defaultValue={vendorId}>
            <option value="">Semua vendor</option>
            {vendor.data.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nama}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            {(Object.keys(FILTER_STATUS) as FilterStatus[]).map((s) => (
              <option key={s} value={s}>
                {FILTER_STATUS[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="tombol-utama">
          Terapkan
        </button>
      </form>

      <DaftarTugas
        baris={baris}
        editor={editor.data}
        vendor={vendor.data}
        acara={acara.data}
        picAwal={saatIni.data ?? ''}
        kosong={
          adaFilter ? (
            <Kosong
              pesan="Tidak ada tugas yang cocok dengan filter ini."
              aksi={{ label: 'Hapus filter', href: '/tugas' }}
            />
          ) : (
            <Kosong pesan="Belum ada tugas yang perlu dikerjakan." />
          )
        }
      />
    </>
  );
}
