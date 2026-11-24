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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      editor_saat_ini: { Args: never; Returns: string }
      is_editor: { Args: never; Returns: boolean }
      pastikan_editor: { Args: never; Returns: string }
    }
    Enums: {
      jenis_acara: "lamaran" | "akad" | "resepsi" | "ngunduh_mantu" | "lainnya"
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
    },
  },
} as const
