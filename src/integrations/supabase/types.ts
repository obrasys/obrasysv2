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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      artigos_orcamento: {
        Row: {
          capitulo_id: string
          codigo: string | null
          created_at: string
          descricao: string
          id: string
          ordem: number
          preco_unitario: number
          quantidade: number
          unidade: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          capitulo_id: string
          codigo?: string | null
          created_at?: string
          descricao: string
          id?: string
          ordem?: number
          preco_unitario?: number
          quantidade?: number
          unidade: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          capitulo_id?: string
          codigo?: string | null
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          preco_unitario?: number
          quantidade?: number
          unidade?: string
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artigos_orcamento_capitulo_id_fkey"
            columns: ["capitulo_id"]
            isOneToOne: false
            referencedRelation: "capitulos_orcamento"
            referencedColumns: ["id"]
          },
        ]
      }
      artigos_trabalho: {
        Row: {
          ativo: boolean
          categoria: string
          codigo: string
          created_at: string
          descricao: string
          id: string
          preco_unitario: number
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          preco_unitario?: number
          unidade: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          preco_unitario?: number
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      base_precos_personalizada: {
        Row: {
          categoria: string
          codigo: string
          created_at: string
          descricao: string
          id: string
          preco_unitario: number
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria: string
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          preco_unitario?: number
          unidade: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          preco_unitario?: number
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      capitulos_orcamento: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          numero: number
          orcamento_id: string
          ordem: number
          titulo: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          numero: number
          orcamento_id: string
          ordem?: number
          titulo: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          numero?: number
          orcamento_id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "capitulos_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      default_articles: {
        Row: {
          categoria: string
          codigo: string
          created_at: string
          descricao: string
          id: string
          preco_unitario: number
          unidade: string
        }
        Insert: {
          categoria: string
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          preco_unitario?: number
          unidade: string
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          preco_unitario?: number
          unidade?: string
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      obra_progress_tracking: {
        Row: {
          capitulo_id: string | null
          created_at: string
          descricao: string
          id: string
          obra_id: string
          percentagem: number
          quantidade_executada: number
          quantidade_prevista: number
          unidade: string
          updated_at: string
        }
        Insert: {
          capitulo_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          obra_id: string
          percentagem?: number
          quantidade_executada?: number
          quantidade_prevista?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          capitulo_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          obra_id?: string
          percentagem?: number
          quantidade_executada?: number
          quantidade_prevista?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_progress_tracking_capitulo_id_fkey"
            columns: ["capitulo_id"]
            isOneToOne: false
            referencedRelation: "capitulos_orcamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_progress_tracking_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          arquivada: boolean
          cliente: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          endereco: string | null
          gestor_id: string | null
          id: string
          nome: string
          progresso: number
          status: string
          updated_at: string
          user_id: string
          valor_previsto: number | null
        }
        Insert: {
          arquivada?: boolean
          cliente?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          endereco?: string | null
          gestor_id?: string | null
          id?: string
          nome: string
          progresso?: number
          status?: string
          updated_at?: string
          user_id: string
          valor_previsto?: number | null
        }
        Update: {
          arquivada?: boolean
          cliente?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          endereco?: string | null
          gestor_id?: string | null
          id?: string
          nome?: string
          progresso?: number
          status?: string
          updated_at?: string
          user_id?: string
          valor_previsto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          created_at: string
          custos_indiretos: Json | null
          data_criacao: string
          data_envio: string | null
          id: string
          margem_lucro: number | null
          obra_id: string | null
          status: string
          titulo: string
          updated_at: string
          user_id: string
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          custos_indiretos?: Json | null
          data_criacao?: string
          data_envio?: string | null
          id?: string
          margem_lucro?: number | null
          obra_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          custos_indiretos?: Json | null
          data_criacao?: string
          data_envio?: string | null
          id?: string
          margem_lucro?: number | null
          obra_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          empresa: string | null
          id: string
          nif: string | null
          nome: string
          role: string
          telefone: string | null
          trial_end: string
          trial_expired: boolean
          trial_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          empresa?: string | null
          id?: string
          nif?: string | null
          nome: string
          role?: string
          telefone?: string | null
          trial_end?: string
          trial_expired?: boolean
          trial_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          empresa?: string | null
          id?: string
          nif?: string | null
          nome?: string
          role?: string
          telefone?: string | null
          trial_end?: string
          trial_expired?: boolean
          trial_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      templates_capitulos: {
        Row: {
          artigos: Json | null
          created_at: string
          descricao: string | null
          id: string
          is_system: boolean
          titulo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          artigos?: Json | null
          created_at?: string
          descricao?: string | null
          id?: string
          is_system?: boolean
          titulo: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          artigos?: Json | null
          created_at?: string
          descricao?: string | null
          id?: string
          is_system?: boolean
          titulo?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
