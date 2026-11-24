'use server';

import { revalidatePath } from 'next/cache';
import { BUCKET_LAMPIRAN } from '@/lib/lampiran';
import { parseRupiah } from '@/lib/rupiah';
import { createClient } from '@/lib/supabase/server';
import { tanggalValid } from '@/lib/tanggal';
import { adalahUuid } from '@/lib/validasi';

const TIDAK_DITEMUKAN = 'Data tidak ditemukan atau tidak bisa diubah.';
const PESAN_NOMINAL = 'Tulis nominal dengan angka, contoh 1.500.000';
const PESAN_ALOKASI_KOSONG = 'Isi harga untuk minimal satu acara.';
const PESAN_ALOKASI_SALAH = 'Harga per acara tidak valid. Isi nominal dengan angka bulat.';
const PESAN_PIHAK = 'Pilih siapa yang membayar';
const JENIS = ['dp', 'termin', 'pelunasan'] as const;
const STATUS = ['terjadwal', 'dibayar'] as const;
type Jenis = (typeof JENIS)[number];
type Status = (typeof STATUS)[number];

export type AlokasiInput = { acara_id: string; nominal: number };

function segarkan() {
  revalidatePath('/vendor/[id]', 'page');
  revalidatePath('/kontribusi');
  // Dashboard (Task 11) menampilkan Pembayaran Terjadwal.
  revalidatePath('/');
}

function teks(formData: FormData, kunci: string): string {
  const nilai = formData.get(kunci);
  return typeof nilai === 'string' ? nilai.trim() : '';
}

function alokasiValid(a: unknown): a is AlokasiInput[] {
  return (
    Array.isArray(a) &&
    a.length > 0 &&
    a.every(
      (r) =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as AlokasiInput).acara_id === 'string' &&
        adalahUuid((r as AlokasiInput).acara_id) &&
        Number.isSafeInteger((r as AlokasiInput).nominal) &&
        (r as AlokasiInput).nominal >= 0,
    )
  );
}

function pesanAlokasi(pesan: string): string | null {
  if (pesan.includes('alokasi_wajib')) return PESAN_ALOKASI_KOSONG;
  if (pesan.includes('alokasi_tidak_valid')) return PESAN_ALOKASI_SALAH;
  if (pesan.includes('acara_bukan_milik_vendor')) return 'Ada acara yang tidak terhubung ke vendor ini.';
  return null;
}

// Kontrak manual untuk Vendor tanpa Paket.
export type NilaiKontrak = { tanggal: string; catatan: string; harga: Record<string, string> };
export type HasilKontrak = { ok?: boolean; error?: string; nilai?: NilaiKontrak };

export async function simpanKontrak(formData: FormData): Promise<HasilKontrak> {
  const vendorId = teks(formData, 'vendor_id');
  const nilai: NilaiKontrak = { tanggal: teks(formData, 'tanggal'), catatan: teks(formData, 'catatan'), harga: {} };
  for (const [kunci] of formData.entries()) {
    if (kunci.startsWith('harga_')) nilai.harga[kunci.slice(6)] = teks(formData, kunci);
  }
  const gagal = (error: string): HasilKontrak => ({ error, nilai });

  if (!adalahUuid(vendorId)) return gagal(TIDAK_DITEMUKAN);
  if (nilai.tanggal && !tanggalValid(nilai.tanggal)) return gagal('Tanggal kesepakatan tidak valid.');

  const alokasi: AlokasiInput[] = [];
  for (const [acaraId, isi] of Object.entries(nilai.harga)) {
    if (isi === '') continue;
    const nominal = parseRupiah(isi);
    if (nominal === null) return gagal(PESAN_NOMINAL);
    if (!adalahUuid(acaraId)) return gagal(TIDAK_DITEMUKAN);
    alokasi.push({ acara_id: acaraId, nominal });
  }
  if (alokasi.length === 0) return gagal(PESAN_ALOKASI_KOSONG);

  const supabase = await createClient();
  const { error } = await supabase.rpc('simpan_kontrak', {
    p_vendor_id: vendorId,
    p_data: { tanggal_kesepakatan: nilai.tanggal || null, catatan: nilai.catatan || null },
    p_alokasi: alokasi,
  });
  if (error) {
    console.error('simpanKontrak:', error.message);
    const m = error.message;
    if (m.includes('kontrak_sudah_ada')) return gagal('Vendor ini sudah punya kontrak.');
    if (m.includes('vendor_tidak_ditemukan')) return gagal(TIDAK_DITEMUKAN);
    if (m.includes('status_vendor_tidak_sesuai')) {
      return gagal('Kontrak hanya bisa dibuat untuk vendor di tahap Survei/Nego atau Booked.');
    }
    return gagal(pesanAlokasi(m) ?? 'Kontrak belum tersimpan. Coba lagi.');
  }

  segarkan();
  return { ok: true };
}

export async function simpanAlokasi(kontrakId: string, alokasi: AlokasiInput[]): Promise<{ error?: string }> {
  if (!adalahUuid(kontrakId)) return { error: TIDAK_DITEMUKAN };
  if (!Array.isArray(alokasi) || alokasi.length === 0) return { error: PESAN_ALOKASI_KOSONG };
  if (!alokasiValid(alokasi)) return { error: PESAN_ALOKASI_SALAH };

  const supabase = await createClient();
  const { error } = await supabase.rpc('simpan_alokasi', { p_kontrak_id: kontrakId, p_alokasi: alokasi });
  if (error) {
    console.error('simpanAlokasi:', error.message);
    if (error.message.includes('kontrak_tidak_ditemukan')) return { error: TIDAK_DITEMUKAN };
    return { error: pesanAlokasi(error.message) ?? 'Harga belum tersimpan. Coba lagi.' };
  }

  segarkan();
  return {};
}

// Tanggal kesepakatan dan catatan Kontrak.
export type NilaiDataKontrak = { kontrak_id: string; tanggal: string; catatan: string };
export type HasilDataKontrak = { ok?: boolean; error?: string; nilai?: NilaiDataKontrak };

export async function simpanDataKontrak(formData: FormData): Promise<HasilDataKontrak> {
  const nilai: NilaiDataKontrak = {
    kontrak_id: teks(formData, 'kontrak_id'),
    tanggal: teks(formData, 'tanggal'),
    catatan: teks(formData, 'catatan'),
  };
  const gagal = (error: string): HasilDataKontrak => ({ error, nilai });

  if (!adalahUuid(nilai.kontrak_id)) return gagal(TIDAK_DITEMUKAN);
  if (nilai.tanggal && !tanggalValid(nilai.tanggal)) return gagal('Tanggal kesepakatan tidak valid.');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('kontrak')
    .update({ tanggal_kesepakatan: nilai.tanggal || null, catatan: nilai.catatan || null })
    .eq('id', nilai.kontrak_id)
    .select('id');
  if (error) {
    console.error('simpanDataKontrak:', error.message);
    return gagal('Kontrak belum tersimpan. Coba lagi.');
  }
  if (!data || data.length === 0) return gagal(TIDAK_DITEMUKAN);

  segarkan();
  return { ok: true };
}

export type NilaiPembayaran = {
  id: string;
  kontrak_id: string;
  jenis: string;
  nominal: string;
  status: string;
  jatuh_tempo: string;
  tanggal_bayar: string;
  pihak_id: string;
  catatan: string;
};
export type HasilPembayaran = { ok?: boolean; error?: string; nilai?: NilaiPembayaran };

export async function simpanPembayaran(formData: FormData): Promise<HasilPembayaran> {
  const nilai: NilaiPembayaran = {
    id: teks(formData, 'id'),
    kontrak_id: teks(formData, 'kontrak_id'),
    jenis: teks(formData, 'jenis'),
    nominal: teks(formData, 'nominal'),
    status: teks(formData, 'status'),
    jatuh_tempo: teks(formData, 'jatuh_tempo'),
    tanggal_bayar: teks(formData, 'tanggal_bayar'),
    pihak_id: teks(formData, 'pihak_id'),
    catatan: teks(formData, 'catatan'),
  };
  const gagal = (error: string): HasilPembayaran => ({ error, nilai });

  if (!adalahUuid(nilai.kontrak_id)) return gagal(TIDAK_DITEMUKAN);
  if (nilai.id && !adalahUuid(nilai.id)) return gagal(TIDAK_DITEMUKAN);
  if (!JENIS.includes(nilai.jenis as Jenis)) return gagal('Pilih jenis pembayaran.');
  if (!STATUS.includes(nilai.status as Status)) return gagal('Pilih status pembayaran.');
  if (!nilai.nominal) return gagal('Nominal wajib diisi.');
  const nominal = parseRupiah(nilai.nominal);
  if (nominal === null) return gagal(PESAN_NOMINAL);
  if (nominal <= 0) return gagal('Nominal harus lebih dari 0.');

  const dibayar = nilai.status === 'dibayar';
  if (dibayar) {
    if (!tanggalValid(nilai.tanggal_bayar)) return gagal('Isi tanggal bayar dengan tanggal yang benar.');
    if (!adalahUuid(nilai.pihak_id)) return gagal(PESAN_PIHAK);
  }
  if (nilai.jatuh_tempo && !tanggalValid(nilai.jatuh_tempo)) return gagal('Jatuh tempo tidak valid.');
  if (!dibayar && !nilai.jatuh_tempo) return gagal('Isi jatuh tempo untuk pembayaran yang terjadwal.');

  const baris = {
    jenis: nilai.jenis as Jenis,
    nominal,
    status: nilai.status as Status,
    jatuh_tempo: nilai.jatuh_tempo || null,
    tanggal_bayar: dibayar ? nilai.tanggal_bayar : null,
    pihak_id: dibayar ? nilai.pihak_id : null,
    catatan: nilai.catatan || null,
  };

  const supabase = await createClient();

  // Pihak yang diarsipkan hanya boleh tetap dipakai oleh Pembayaran yang sudah memakainya.
  if (dibayar) {
    const { data: pihak, error: ePihak } = await supabase
      .from('pihak')
      .select('arsip')
      .eq('id', nilai.pihak_id)
      .maybeSingle();
    if (ePihak) {
      console.error('simpanPembayaran:', ePihak.message);
      return gagal('Pembayaran belum tersimpan. Coba lagi.');
    }
    if (!pihak) return gagal(PESAN_PIHAK);
    if (pihak.arsip) {
      let pihakLama: string | null = null;
      if (nilai.id) {
        const { data: lama, error: eLama } = await supabase
          .from('pembayaran')
          .select('pihak_id')
          .eq('id', nilai.id)
          .maybeSingle();
        if (eLama) {
          console.error('simpanPembayaran:', eLama.message);
          return gagal('Pembayaran belum tersimpan. Coba lagi.');
        }
        pihakLama = lama?.pihak_id ?? null;
      }
      if (pihakLama !== nilai.pihak_id) return gagal('Pihak ini sudah diarsipkan. Pilih pihak lain.');
    }
  }

  if (nilai.id) {
    const { data, error } = await supabase
      .from('pembayaran')
      .update(baris)
      .eq('id', nilai.id)
      .eq('kontrak_id', nilai.kontrak_id)
      .select('id');
    if (error) {
      console.error('simpanPembayaran:', error.message);
      if (error.code === '23503') return gagal(TIDAK_DITEMUKAN);
      return gagal('Pembayaran belum tersimpan. Coba lagi.');
    }
    if (!data || data.length === 0) return gagal(TIDAK_DITEMUKAN);
  } else {
    const { error } = await supabase.from('pembayaran').insert({ ...baris, kontrak_id: nilai.kontrak_id });
    if (error) {
      console.error('simpanPembayaran:', error.message);
      if (error.code === '23503') return gagal(TIDAK_DITEMUKAN);
      return gagal('Pembayaran belum tersimpan. Coba lagi.');
    }
  }

  segarkan();
  return { ok: true };
}

// Dipakai juga oleh dashboard (Task 11).
export async function tandaiDibayar(
  pembayaranId: string,
  tanggalBayar: string,
  pihakId: string,
): Promise<{ error?: string }> {
  if (!adalahUuid(pembayaranId)) return { error: TIDAK_DITEMUKAN };
  if (!pihakId || !adalahUuid(pihakId)) return { error: PESAN_PIHAK };
  if (!tanggalValid(tanggalBayar)) return { error: 'Isi tanggal bayar dengan tanggal yang benar.' };

  const supabase = await createClient();
  const { data: pihak, error: ePihak } = await supabase
    .from('pihak')
    .select('id')
    .eq('id', pihakId)
    .eq('arsip', false)
    .maybeSingle();
  if (ePihak) {
    console.error('tandaiDibayar:', ePihak.message);
    return { error: 'Pembayaran belum tersimpan. Coba lagi.' };
  }
  if (!pihak) return { error: PESAN_PIHAK };

  const { data, error } = await supabase
    .from('pembayaran')
    .update({ status: 'dibayar', tanggal_bayar: tanggalBayar, pihak_id: pihakId })
    .eq('id', pembayaranId)
    .select('id');
  if (error) {
    console.error('tandaiDibayar:', error.message);
    return { error: 'Pembayaran belum tersimpan. Coba lagi.' };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };

  segarkan();
  return {};
}

export async function hapusPembayaran(pembayaranId: string): Promise<{ error?: string }> {
  if (!adalahUuid(pembayaranId)) return { error: TIDAK_DITEMUKAN };

  const supabase = await createClient();
  const { data, error } = await supabase.from('pembayaran').delete().eq('id', pembayaranId).select('id, bukti');
  if (error) {
    console.error('hapusPembayaran:', error.message);
    return { error: 'Pembayaran belum terhapus. Coba lagi.' };
  }
  if (!data || data.length === 0) return { error: TIDAK_DITEMUKAN };

  // Baris sudah hilang. Objek bukti yang gagal terhapus hanya menyisakan file yatim.
  const berkas = data.flatMap((d) => d.bukti);
  if (berkas.length > 0) {
    const { error: eObjek } = await supabase.storage.from(BUCKET_LAMPIRAN).remove(berkas);
    if (eObjek) console.error('hapusPembayaran: objek tidak terhapus', eObjek.message);
  }

  segarkan();
  return {};
}
