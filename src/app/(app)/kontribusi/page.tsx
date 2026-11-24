import Link from 'next/link';
import { JudulHalaman } from '@/components/JudulHalaman';
import { Kosong } from '@/components/Kosong';
import { Rupiah } from '@/components/Rupiah';
import { createClient } from '@/lib/supabase/server';

export default async function KontribusiPage() {
  const supabase = await createClient();
  const [pihak, urutan, rincian] = await Promise.all([
    supabase.from('kontribusi_pihak').select('pihak_id, nama, total'),
    supabase.from('pihak').select('id, urutan'),
    supabase.from('kontribusi_pihak_vendor').select('pihak_id, vendor_id, total'),
  ]);
  if (pihak.error || urutan.error || rincian.error) throw new Error('Gagal memuat kontribusi');

  const rincianAda = rincian.data.filter((r) => Number(r.total) > 0);
  const idVendor = [...new Set(rincianAda.map((r) => r.vendor_id).filter((x): x is string => !!x))];
  const namaVendor = new Map<string, string>();
  if (idVendor.length > 0) {
    const { data, error } = await supabase.from('vendor').select('id, nama').in('id', idVendor);
    if (error) throw new Error('Gagal memuat kontribusi');
    for (const v of data) namaVendor.set(v.id, v.nama);
  }

  const urut = new Map(urutan.data.map((p) => [p.id, p.urutan]));
  const baris = pihak.data
    .filter((p): p is { pihak_id: string; nama: string; total: number } => !!p.pihak_id && !!p.nama)
    .map((p) => ({
      id: p.pihak_id,
      nama: p.nama,
      total: Number(p.total ?? 0),
      vendor: rincianAda
        .filter((r) => r.pihak_id === p.pihak_id && r.vendor_id)
        .map((r) => ({ id: r.vendor_id as string, nama: namaVendor.get(r.vendor_id as string) ?? 'Vendor', total: Number(r.total) }))
        .sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama)),
    }))
    .sort((a, b) => (urut.get(a.id) ?? 0) - (urut.get(b.id) ?? 0) || a.nama.localeCompare(b.nama));
  const jumlah = baris.reduce((t, p) => t + p.total, 0);

  return (
    <>
      <JudulHalaman judul="Kontribusi" />
      {jumlah === 0 ? (
        <Kosong
          pesan="Belum ada pembayaran yang dibayar. Kontribusi muncul setelah pembayaran ke vendor ditandai dibayar."
          aksi={{ label: 'Lihat vendor', href: '/vendor' }}
        />
      ) : (
        <>
          <p className="total-kontribusi" data-testid="total-kontribusi">
            <span>Total dibayar</span> <Rupiah nilai={jumlah} />
          </p>
          <ul className="daftar-kartu">
            {baris.map((p) => (
              <li key={p.id} className="kartu kartu-kontribusi">
                <details>
                  <summary>
                    <span className="nama-pihak">{p.nama}</span>
                    <Rupiah nilai={p.total} />
                  </summary>
                  {p.vendor.length === 0 ? (
                    <p className="teks-lembut">Belum ada pembayaran dari {p.nama}.</p>
                  ) : (
                    <ul className="daftar-alokasi">
                      {p.vendor.map((v) => (
                        <li key={v.id}>
                          <Link href={`/vendor/${v.id}`} className="tautan-aksi">
                            {v.nama}
                          </Link>
                          <Rupiah nilai={v.total} />
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
