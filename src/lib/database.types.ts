export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      acara: {
        Row: {
          catatan: string | null
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          id: string
          jenis: Database["public"]["Enums"]["jenis_acara"]
          lokasi: string | null
          nama: string
          perkiraan: string | null
          tanggal: string | null
        }
        Insert: {
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          jenis: Database["public"]["Enums"]["jenis_acara"]
          lokasi?: string | null
          nama: string
          perkiraan?: string | null
          tanggal?: string | null
        }
        Update: {
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          jenis?: Database["public"]["Enums"]["jenis_acara"]
          lokasi?: string | null
          nama?: string
          perkiraan?: string | null
          tanggal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acara_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acara_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
        ]
      }
      alokasi_acara: {
        Row: {
          acara_id: string
          catatan: string | null
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          id: string
          kontrak_id: string
          nominal: number
        }
        Insert: {
          acara_id: string
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          kontrak_id: string
          nominal: number
        }
        Update: {
          acara_id?: string
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          kontrak_id?: string
          nominal?: number
        }
        Relationships: [
          {
            foreignKeyName: "alokasi_acara_acara_id_fkey"
            columns: ["acara_id"]
            isOneToOne: false
            referencedRelation: "acara"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alokasi_acara_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alokasi_acara_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alokasi_acara_kontrak_id_fkey"
            columns: ["kontrak_id"]
            isOneToOne: false
            referencedRelation: "kontrak"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alokasi_acara_kontrak_id_fkey"
            columns: ["kontrak_id"]
            isOneToOne: false
            referencedRelation: "ringkasan_kontrak"
            referencedColumns: ["kontrak_id"]
          },
        ]
      }
      editor: {
        Row: {
          auth_user_id: string
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          email: string
          id: string
          nama: string
          pihak_id: string | null
        }
        Insert: {
          auth_user_id: string
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          email: string
          id?: string
          nama: string
          pihak_id?: string | null
        }
        Update: {
          auth_user_id?: string
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          email?: string
          id?: string
          nama?: string
          pihak_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editor_dibuat_oleh_fk"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editor_diubah_oleh_fk"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editor_pihak_id_fkey"
            columns: ["pihak_id"]
            isOneToOne: false
            referencedRelation: "kontribusi_pihak"
            referencedColumns: ["pihak_id"]
          },
          {
            foreignKeyName: "editor_pihak_id_fkey"
            columns: ["pihak_id"]
            isOneToOne: false
            referencedRelation: "kontribusi_pihak_vendor"
            referencedColumns: ["pihak_id"]
          },
          {
            foreignKeyName: "editor_pihak_id_fkey"
            columns: ["pihak_id"]
            isOneToOne: false
            referencedRelation: "pihak"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_diizinkan: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      kategori_vendor: {
        Row: {
          arsip: boolean
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          id: string
          nama: string
          urutan: number
        }
        Insert: {
          arsip?: boolean
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          nama: string
          urutan?: number
        }
        Update: {
          arsip?: boolean
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          nama?: string
          urutan?: number
        }
        Relationships: [
          {
            foreignKeyName: "kategori_vendor_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kategori_vendor_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
        ]
      }
      komponen: {
        Row: {
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          id: string
          kategori_vendor_id: string
          nama: string
          satuan: string | null
          tipe: Database["public"]["Enums"]["tipe_komponen"]
          urutan: number
        }
        Insert: {
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          kategori_vendor_id: string
          nama: string
          satuan?: string | null
          tipe: Database["public"]["Enums"]["tipe_komponen"]
          urutan?: number
        }
        Update: {
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          kategori_vendor_id?: string
          nama?: string
          satuan?: string | null
          tipe?: Database["public"]["Enums"]["tipe_komponen"]
          urutan?: number
        }
        Relationships: [
          {
            foreignKeyName: "komponen_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "komponen_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "komponen_kategori_vendor_id_fkey"
            columns: ["kategori_vendor_id"]
            isOneToOne: false
            referencedRelation: "kategori_vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      kontrak: {
        Row: {
          catatan: string | null
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          id: string
          lampiran: string[]
          paket_id: string | null
          tanggal_kesepakatan: string | null
          vendor_id: string
        }
        Insert: {
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          lampiran?: string[]
          paket_id?: string | null
          tanggal_kesepakatan?: string | null
          vendor_id: string
        }
        Update: {
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          lampiran?: string[]
          paket_id?: string | null
          tanggal_kesepakatan?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kontrak_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrak_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrak_paket_id_fkey"
            columns: ["paket_id"]
            isOneToOne: false
            referencedRelation: "paket"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrak_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      log_kontak: {
        Row: {
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          id: string
          isi: string
          saluran: Database["public"]["Enums"]["saluran_kontak"]
          tanggal: string
          vendor_id: string
        }
        Insert: {
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          isi: string
          saluran: Database["public"]["Enums"]["saluran_kontak"]
          tanggal: string
          vendor_id: string
        }
        Update: {
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          isi?: string
          saluran?: Database["public"]["Enums"]["saluran_kontak"]
          tanggal?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_kontak_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_kontak_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_kontak_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      nilai_komponen: {
        Row: {
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          komponen_id: string
          nilai: string
          paket_id: string
        }
        Insert: {
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          komponen_id: string
          nilai: string
          paket_id: string
        }
        Update: {
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          komponen_id?: string
          nilai?: string
          paket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nilai_komponen_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nilai_komponen_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nilai_komponen_komponen_id_fkey"
            columns: ["komponen_id"]
            isOneToOne: false
            referencedRelation: "komponen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nilai_komponen_paket_id_fkey"
            columns: ["paket_id"]
            isOneToOne: false
            referencedRelation: "paket"
            referencedColumns: ["id"]
          },
        ]
      }
      paket: {
        Row: {
          catatan: string | null
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          harga: number
          id: string
          lain_lain: string | null
          lampiran: string[]
          nama: string
          status: Database["public"]["Enums"]["status_paket"]
          syarat_dp: string | null
          vendor_id: string
        }
        Insert: {
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          harga: number
          id?: string
          lain_lain?: string | null
          lampiran?: string[]
          nama: string
          status?: Database["public"]["Enums"]["status_paket"]
          syarat_dp?: string | null
          vendor_id: string
        }
        Update: {
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          harga?: number
          id?: string
          lain_lain?: string | null
          lampiran?: string[]
          nama?: string
          status?: Database["public"]["Enums"]["status_paket"]
          syarat_dp?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paket_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paket_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paket_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      pembayaran: {
        Row: {
          bukti: string[]
          catatan: string | null
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          id: string
          jatuh_tempo: string | null
          jenis: Database["public"]["Enums"]["jenis_pembayaran"]
          kontrak_id: string
          nominal: number
          pihak_id: string | null
          status: Database["public"]["Enums"]["status_pembayaran"]
          tanggal_bayar: string | null
        }
        Insert: {
          bukti?: string[]
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          jatuh_tempo?: string | null
          jenis: Database["public"]["Enums"]["jenis_pembayaran"]
          kontrak_id: string
          nominal: number
          pihak_id?: string | null
          status: Database["public"]["Enums"]["status_pembayaran"]
          tanggal_bayar?: string | null
        }
        Update: {
          bukti?: string[]
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          jatuh_tempo?: string | null
          jenis?: Database["public"]["Enums"]["jenis_pembayaran"]
          kontrak_id?: string
          nominal?: number
          pihak_id?: string | null
          status?: Database["public"]["Enums"]["status_pembayaran"]
          tanggal_bayar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pembayaran_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembayaran_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembayaran_kontrak_id_fkey"
            columns: ["kontrak_id"]
            isOneToOne: false
            referencedRelation: "kontrak"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembayaran_kontrak_id_fkey"
            columns: ["kontrak_id"]
            isOneToOne: false
            referencedRelation: "ringkasan_kontrak"
            referencedColumns: ["kontrak_id"]
          },
          {
            foreignKeyName: "pembayaran_pihak_id_fkey"
            columns: ["pihak_id"]
            isOneToOne: false
            referencedRelation: "kontribusi_pihak"
            referencedColumns: ["pihak_id"]
          },
          {
            foreignKeyName: "pembayaran_pihak_id_fkey"
            columns: ["pihak_id"]
            isOneToOne: false
            referencedRelation: "kontribusi_pihak_vendor"
            referencedColumns: ["pihak_id"]
          },
          {
            foreignKeyName: "pembayaran_pihak_id_fkey"
            columns: ["pihak_id"]
            isOneToOne: false
            referencedRelation: "pihak"
            referencedColumns: ["id"]
          },
        ]
      }
      pihak: {
        Row: {
          arsip: boolean
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          id: string
          nama: string
          urutan: number
        }
        Insert: {
          arsip?: boolean
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          nama: string
          urutan?: number
        }
        Update: {
          arsip?: boolean
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          nama?: string
          urutan?: number
        }
        Relationships: [
          {
            foreignKeyName: "pihak_dibuat_oleh_fk"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pihak_diubah_oleh_fk"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
        ]
      }
      tugas: {
        Row: {
          acara_id: string | null
          catatan: string | null
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          id: string
          jatuh_tempo: string | null
          judul: string
          log_kontak_id: string | null
          pic_id: string
          selesai_pada: string | null
          status: Database["public"]["Enums"]["status_tugas"]
          vendor_id: string | null
        }
        Insert: {
          acara_id?: string | null
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          jatuh_tempo?: string | null
          judul: string
          log_kontak_id?: string | null
          pic_id: string
          selesai_pada?: string | null
          status?: Database["public"]["Enums"]["status_tugas"]
          vendor_id?: string | null
        }
        Update: {
          acara_id?: string | null
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          jatuh_tempo?: string | null
          judul?: string
          log_kontak_id?: string | null
          pic_id?: string
          selesai_pada?: string | null
          status?: Database["public"]["Enums"]["status_tugas"]
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tugas_acara_id_fkey"
            columns: ["acara_id"]
            isOneToOne: false
            referencedRelation: "acara"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tugas_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tugas_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tugas_log_kontak_id_fkey"
            columns: ["log_kontak_id"]
            isOneToOne: false
            referencedRelation: "log_kontak"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tugas_pic_id_fkey"
            columns: ["pic_id"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tugas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor: {
        Row: {
          catatan: string | null
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          id: string
          instagram: string | null
          kategori_vendor_id: string
          link: string | null
          nama: string
          nama_kontak: string | null
          status: Database["public"]["Enums"]["status_vendor"]
          whatsapp: string | null
        }
        Insert: {
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          instagram?: string | null
          kategori_vendor_id: string
          link?: string | null
          nama: string
          nama_kontak?: string | null
          status?: Database["public"]["Enums"]["status_vendor"]
          whatsapp?: string | null
        }
        Update: {
          catatan?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: string
          instagram?: string | null
          kategori_vendor_id?: string
          link?: string | null
          nama?: string
          nama_kontak?: string | null
          status?: Database["public"]["Enums"]["status_vendor"]
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_kategori_vendor_id_fkey"
            columns: ["kategori_vendor_id"]
            isOneToOne: false
            referencedRelation: "kategori_vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_acara: {
        Row: {
          acara_id: string
          dibuat_oleh: string | null
          dibuat_pada: string
          diubah_oleh: string | null
          diubah_pada: string
          vendor_id: string
        }
        Insert: {
          acara_id: string
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          vendor_id: string
        }
        Update: {
          acara_id?: string
          dibuat_oleh?: string | null
          dibuat_pada?: string
          diubah_oleh?: string | null
          diubah_pada?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_acara_acara_id_fkey"
            columns: ["acara_id"]
            isOneToOne: false
            referencedRelation: "acara"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_acara_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_acara_diubah_oleh_fkey"
            columns: ["diubah_oleh"]
            isOneToOne: false
            referencedRelation: "editor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_acara_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kontribusi_pihak: {
        Row: {
          nama: string | null
          pihak_id: string | null
          total: number | null
        }
        Relationships: []
      }
      kontribusi_pihak_vendor: {
        Row: {
          pihak_id: string | null
          total: number | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kontrak_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      ringkasan_kontrak: {
        Row: {
          kontrak_id: string | null
          lunas: boolean | null
          sisa: number | null
          terbayar: number | null
          total: number | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kontrak_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      editor_saat_ini: { Args: never; Returns: string }
      hapus_lampiran: {
        Args: { p_id: string; p_path: string; p_tabel: string }
        Returns: undefined
      }
      is_editor: { Args: never; Returns: boolean }
      pastikan_editor: { Args: never; Returns: string }
      periksa_alokasi: {
        Args: { p_alokasi: Json; p_vendor_id: string }
        Returns: undefined
      }
      pilih_paket: {
        Args: { p_alokasi?: Json; p_paket_id: string }
        Returns: string
      }
      simpan_alokasi: {
        Args: { p_alokasi: Json; p_kontrak_id: string }
        Returns: undefined
      }
      simpan_kontrak: {
        Args: { p_alokasi: Json; p_data: Json; p_vendor_id: string }
        Returns: string
      }
      simpan_paket: {
        Args: { p_data: Json; p_id: string; p_nilai: Json; p_vendor_id: string }
        Returns: string
      }
      simpan_vendor: {
        Args: { p_acara_ids: string[]; p_data: Json; p_id: string }
        Returns: string
      }
      tambah_lampiran: {
        Args: { p_id: string; p_path: string; p_tabel: string }
        Returns: undefined
      }
      urutkan_komponen: {
        Args: { p_kategori_id: string; p_urutan: string[] }
        Returns: undefined
      }
    }
    Enums: {
      jenis_acara: "lamaran" | "akad" | "resepsi" | "ngunduh_mantu" | "lainnya"
      jenis_pembayaran: "dp" | "termin" | "pelunasan"
      saluran_kontak: "whatsapp" | "telepon" | "bertemu" | "email" | "lainnya"
      status_paket: "aktif" | "dipilih" | "tidak_dipilih"
      status_pembayaran: "terjadwal" | "dibayar"
      status_tugas: "belum" | "selesai"
      status_vendor: "kandidat" | "survei_nego" | "booked" | "selesai" | "batal"
      tipe_komponen: "teks" | "angka" | "ya_tidak"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      jenis_acara: ["lamaran", "akad", "resepsi", "ngunduh_mantu", "lainnya"],
      jenis_pembayaran: ["dp", "termin", "pelunasan"],
      saluran_kontak: ["whatsapp", "telepon", "bertemu", "email", "lainnya"],
      status_paket: ["aktif", "dipilih", "tidak_dipilih"],
      status_pembayaran: ["terjadwal", "dibayar"],
      status_tugas: ["belum", "selesai"],
      status_vendor: ["kandidat", "survei_nego", "booked", "selesai", "batal"],
      tipe_komponen: ["teks", "angka", "ya_tidak"],
    },
  },
} as const
