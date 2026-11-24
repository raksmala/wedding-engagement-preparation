import { createClient } from '@/lib/supabase/server';
import { jejakAudit } from '@/lib/jejak';
import { hariIniJakarta } from '@/lib/tanggal';
import { tugasTerlambat } from '@/lib/tugas';
import { DaftarLogKontak, type BarisLog } from './DaftarLogKontak';

export async function SeksiLogKontak({ vendorId }: { vendorId: string }) {
  const supabase = await createClient();

  const [logRes, editorRes, saatIniRes] = await Promise.all([
    supabase
      .from('log_kontak')
      .select('id, tanggal, saluran, isi, diubah_pada, diubah_oleh, tugas(id, judul, status, jatuh_tempo, dibuat_pada)')
      .eq('vendor_id', vendorId)
      .order('tanggal', { ascending: false })
      .order('dibuat_pada', { ascending: false }),
    supabase.from('editor').select('id, nama').order('nama'),
    supabase.rpc('editor_saat_ini'),
  ]);
  if (logRes.error || editorRes.error || saatIniRes.error) throw new Error('Gagal memuat log kontak');

  const hariIni = hariIniJakarta();
  const nama = new Map(editorRes.data.map((e) => [e.id, e.nama]));
  const baris: BarisLog[] = logRes.data.map((l) => ({
    id: l.id,
    tanggal: l.tanggal,
    saluran: l.saluran,
    isi: l.isi,
    diubah: jejakAudit(l.diubah_oleh, l.diubah_pada, nama),
    tugas: [...l.tugas]
      .sort((a, b) => a.dibuat_pada.localeCompare(b.dibuat_pada))
      .map((t) => ({
        id: t.id,
        judul: t.judul,
        status: t.status,
        jatuh_tempo: t.jatuh_tempo,
        terlambat: tugasTerlambat(t, hariIni),
      })),
  }));

  return (
    <section aria-labelledby="judul-log-kontak" className="bagian">
      <h2 id="judul-log-kontak">Log Kontak</h2>
      <DaftarLogKontak
        vendorId={vendorId}
        baris={baris}
        editor={editorRes.data}
        picAwal={saatIniRes.data ?? ''}
        hariIni={hariIni}
      />
    </section>
  );
}
