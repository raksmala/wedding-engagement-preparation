import { JudulHalaman } from '@/components/JudulHalaman';
import { Kosong } from '@/components/Kosong';
import { createClient } from '@/lib/supabase/server';
import { hariIniJakarta, kelompokJatuhTempo } from '@/lib/tanggal';
import { ItemAgenda, type BarisAgenda } from './ItemAgenda';

type Kelompok = 'terlambat' | 'hari_ini' | 'tujuh_hari';

// Terlambat selalu paling atas, walaupun kosong, karena jadi titik fokus dashboard.
const KELOMPOK: { kunci: Kelompok; judul: string; kosong: string }[] = [
  { kunci: 'terlambat', judul: 'Terlambat', kosong: 'Tidak ada yang terlambat.' },
  { kunci: 'hari_ini', judul: 'Hari ini', kosong: 'Tidak ada yang jatuh tempo hari ini.' },
  { kunci: 'tujuh_hari', judul: '7 hari ke depan', kosong: 'Tidak ada yang jatuh tempo dalam 7 hari ke depan.' },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  // Semua baris agenda dibaca, lalu dikelompokkan di server dengan tanggal Asia/Jakarta.
  // Yang jatuh tempo lebih dari 7 hari lagi tidak ditampilkan.
  const [agenda, vendor, tugas, editor, acara, pihak] = await Promise.all([
    supabase
      .from('agenda')
      .select('jenis, id, judul, jatuh_tempo, pic_id, vendor_id, acara_id, nominal')
      .order('jatuh_tempo')
      .order('judul'),
    supabase.from('vendor').select('id, nama'),
    // Hanya jumlah, untuk membedakan "belum ada data sama sekali" dari "semua sudah selesai".
    supabase.from('tugas').select('id', { count: 'exact', head: true }),
    supabase.from('editor').select('id, nama'),
    supabase.from('acara').select('id, nama'),
    // Tandai dibayar hanya menerima Pihak yang tidak diarsipkan.
    supabase.from('pihak').select('id, nama').eq('arsip', false).order('urutan').order('nama'),
  ]);
  if (agenda.error || vendor.error || tugas.error || editor.error || acara.error || pihak.error) {
    throw new Error('Gagal memuat dashboard');
  }

  // Pembayaran selalu milik Vendor, jadi tanpa Vendor dan tanpa Tugas agenda pasti kosong.
  // Tugas yang sudah selesai tetap dihitung, supaya menyelesaikan Tugas terakhir tidak memunculkan ajakan ini.
  if (vendor.data.length === 0 && (tugas.count ?? 0) === 0) {
    return (
      <>
        <JudulHalaman judul="Dashboard" />
        <Kosong
          pesan="Belum ada jadwal yang perlu dikerjakan. Mulai dengan mencatat vendor pertama."
          aksi={{ label: 'Tambah vendor', href: '/vendor/baru' }}
        />
      </>
    );
  }

  const hariIni = hariIniJakarta();
  const namaVendor = new Map(vendor.data.map((v) => [v.id, v.nama]));
  const namaEditor = new Map(editor.data.map((e) => [e.id, e.nama]));
  const namaAcara = new Map(acara.data.map((a) => [a.id, a.nama]));
  const tautan = (id: string | null, nama: Map<string, string>) => {
    const n = id ? nama.get(id) : undefined;
    return id && n ? { id, nama: n } : null;
  };

  const grup: Record<Kelompok, BarisAgenda[]> = { terlambat: [], hari_ini: [], tujuh_hari: [] };
  for (const a of agenda.data) {
    const jenis: BarisAgenda['jenis'] | null =
      a.jenis === 'tugas' ? 'tugas' : a.jenis === 'pembayaran' ? 'pembayaran' : null;
    if (!jenis || !a.id || !a.judul || !a.jatuh_tempo) continue;
    const kelompok = kelompokJatuhTempo(a.jatuh_tempo, hariIni);
    if (!kelompok) continue;
    grup[kelompok].push({
      jenis,
      id: a.id,
      judul: a.judul,
      jatuh_tempo: a.jatuh_tempo,
      nominal: a.nominal === null ? null : Number(a.nominal),
      pic_nama: a.pic_id ? (namaEditor.get(a.pic_id) ?? 'Editor tidak dikenal') : null,
      vendor: tautan(a.vendor_id, namaVendor),
      acara: tautan(a.acara_id, namaAcara),
    });
  }

  return (
    <>
      <JudulHalaman judul="Dashboard" />
      {KELOMPOK.map(({ kunci, judul, kosong }) => {
        const isi = grup[kunci];
        const idJudul = `kelompok-${kunci}`;
        return (
          <section
            key={kunci}
            aria-labelledby={idJudul}
            className={kunci === 'terlambat' ? 'bagian kelompok-agenda kelompok-terlambat' : 'bagian kelompok-agenda'}
          >
            <h2 id={idJudul} tabIndex={-1}>
              {`${judul} (${isi.length})`}
            </h2>
            {isi.length === 0 ? (
              <p className="teks-lembut">{kosong}</p>
            ) : (
              <ul className="daftar-kartu">
                {isi.map((item) => (
                  <ItemAgenda
                    key={`${item.jenis}-${item.id}`}
                    item={item}
                    terlambat={kunci === 'terlambat'}
                    pihak={pihak.data}
                    hariIni={hariIni}
                    idJudulKelompok={idJudul}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}
