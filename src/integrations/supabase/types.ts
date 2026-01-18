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
      aprovacoes: {
        Row: {
          aprovador_id: string | null
          comentarios: string | null
          created_at: string
          data_aprovacao: string | null
          data_solicitacao: string
          id: string
          referencia_id: string
          solicitante_id: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aprovador_id?: string | null
          comentarios?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_solicitacao?: string
          id?: string
          referencia_id: string
          solicitante_id?: string | null
          status?: string
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aprovador_id?: string | null
          comentarios?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_solicitacao?: string
          id?: string
          referencia_id?: string
          solicitante_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprovacoes_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprovacoes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artigos_orcamento: {
        Row: {
          capitulo_id: string
          codigo: string | null
          created_at: string
          descricao: string
          id: string
          linked_element_id: string | null
          linked_rule_id: string | null
          ordem: number
          preco_unitario: number
          quantidade: number
          quantity_source: string
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
          linked_element_id?: string | null
          linked_rule_id?: string | null
          ordem?: number
          preco_unitario?: number
          quantidade?: number
          quantity_source?: string
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
          linked_element_id?: string | null
          linked_rule_id?: string | null
          ordem?: number
          preco_unitario?: number
          quantidade?: number
          quantity_source?: string
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
      calculated_parameters: {
        Row: {
          created_at: string | null
          element_id: string
          id: string
          key: string
          unit: string
          value: number
        }
        Insert: {
          created_at?: string | null
          element_id: string
          id?: string
          key: string
          unit: string
          value: number
        }
        Update: {
          created_at?: string | null
          element_id?: string
          id?: string
          key?: string
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "calculated_parameters_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "constructive_elements"
            referencedColumns: ["id"]
          },
        ]
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
      checklist_conformidade: {
        Row: {
          created_at: string
          data_verificacao: string | null
          descricao: string | null
          id: string
          itens: Json
          obra_id: string
          observacoes: string | null
          responsavel_id: string | null
          status: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_verificacao?: string | null
          descricao?: string | null
          id?: string
          itens?: Json
          obra_id: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_verificacao?: string | null
          descricao?: string | null
          id?: string
          itens?: Json
          obra_id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_conformidade_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_conformidade_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          cidade: string | null
          codigo_postal: string | null
          created_at: string
          criado_por: string | null
          email: string | null
          empresa: string | null
          endereco: string | null
          id: string
          nif: string | null
          nivel_acesso: string
          nome: string
          observacoes: string | null
          pais: string | null
          telefone: string | null
          telemovel: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          codigo_postal?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          id?: string
          nif?: string | null
          nivel_acesso?: string
          nome: string
          observacoes?: string | null
          pais?: string | null
          telefone?: string | null
          telemovel?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          codigo_postal?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          id?: string
          nif?: string | null
          nivel_acesso?: string
          nome?: string
          observacoes?: string | null
          pais?: string | null
          telefone?: string | null
          telemovel?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_parametric_coefficients: {
        Row: {
          coefficient_key: string
          created_at: string | null
          description: string | null
          id: string
          orcamento_id: string | null
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          coefficient_key: string
          created_at?: string | null
          description?: string | null
          id?: string
          orcamento_id?: string | null
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          coefficient_key?: string
          created_at?: string | null
          description?: string | null
          id?: string
          orcamento_id?: string | null
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_parametric_coefficients_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      constructive_elements: {
        Row: {
          configuration_type: string
          construction_method: string
          created_at: string | null
          element_type: string
          functional_type: string
          id: string
          insulation_thickness_cm: number | null
          insulation_type: string | null
          name: string
          orcamento_id: string
          parameters: Json
          updated_at: string | null
        }
        Insert: {
          configuration_type: string
          construction_method: string
          created_at?: string | null
          element_type: string
          functional_type: string
          id?: string
          insulation_thickness_cm?: number | null
          insulation_type?: string | null
          name: string
          orcamento_id: string
          parameters?: Json
          updated_at?: string | null
        }
        Update: {
          configuration_type?: string
          construction_method?: string
          created_at?: string | null
          element_type?: string
          functional_type?: string
          id?: string
          insulation_thickness_cm?: number | null
          insulation_type?: string | null
          name?: string
          orcamento_id?: string
          parameters?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "constructive_elements_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assigned_user_id: string
          customer_id: string
          id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_user_id: string
          customer_id: string
          id?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_user_id?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "clientes"
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
      documentos: {
        Row: {
          aprovado: boolean | null
          categoria: string | null
          created_at: string
          data_validade: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          nome: string
          obra_id: string
          tipo: string
          updated_at: string
          uploaded_by: string | null
          url: string
          user_id: string
        }
        Insert: {
          aprovado?: boolean | null
          categoria?: string | null
          created_at?: string
          data_validade?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          nome: string
          obra_id: string
          tipo: string
          updated_at?: string
          uploaded_by?: string | null
          url: string
          user_id: string
        }
        Update: {
          aprovado?: boolean | null
          categoria?: string | null
          created_at?: string
          data_validade?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          nome?: string
          obra_id?: string
          tipo?: string
          updated_at?: string
          uploaded_by?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      element_openings: {
        Row: {
          created_at: string | null
          element_id: string
          height_m: number
          id: string
          name: string | null
          opening_type: string
          width_m: number
        }
        Insert: {
          created_at?: string | null
          element_id: string
          height_m: number
          id?: string
          name?: string | null
          opening_type: string
          width_m: number
        }
        Update: {
          created_at?: string | null
          element_id?: string
          height_m?: number
          id?: string
          name?: string | null
          opening_type?: string
          width_m?: number
        }
        Relationships: [
          {
            foreignKeyName: "element_openings_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "constructive_elements"
            referencedColumns: ["id"]
          },
        ]
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
      livro_obra: {
        Row: {
          created_at: string
          data_aprovacao: string | null
          data_submissao: string | null
          descricao: string | null
          fiscal_id: string | null
          gestor_id: string | null
          id: string
          obra_id: string
          observacoes_fiscal: string | null
          rdos_incluidos: string[] | null
          status: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_aprovacao?: string | null
          data_submissao?: string | null
          descricao?: string | null
          fiscal_id?: string | null
          gestor_id?: string | null
          id?: string
          obra_id: string
          observacoes_fiscal?: string | null
          rdos_incluidos?: string[] | null
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_aprovacao?: string | null
          data_submissao?: string | null
          descricao?: string | null
          fiscal_id?: string | null
          gestor_id?: string | null
          id?: string
          obra_id?: string
          observacoes_fiscal?: string | null
          rdos_incluidos?: string[] | null
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livro_obra_fiscal_id_fkey"
            columns: ["fiscal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livro_obra_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livro_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      material_categories: {
        Row: {
          ativa: boolean
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      material_price_raw: {
        Row: {
          created_at: string
          data_referencia: string
          id: string
          material_id: string
          motivo_rejeicao: string | null
          observacoes: string | null
          preco: number
          preco_normalizado: number | null
          region_id: string
          source_id: string
          status: string
          unidade_original: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_referencia?: string
          id?: string
          material_id: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          preco: number
          preco_normalizado?: number | null
          region_id: string
          source_id: string
          status?: string
          unidade_original: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_referencia?: string
          id?: string
          material_id?: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          preco?: number
          preco_normalizado?: number | null
          region_id?: string
          source_id?: string
          status?: string
          unidade_original?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_price_raw_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_price_raw_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_price_raw_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "price_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      material_price_reference: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          material_id: string
          preco_medio: number
          preco_p10: number | null
          preco_p50: number | null
          preco_p90: number | null
          region_id: string
          sample_size: number
          ultima_atualizacao: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          id?: string
          material_id: string
          preco_medio: number
          preco_p10?: number | null
          preco_p50?: number | null
          preco_p90?: number | null
          region_id: string
          sample_size?: number
          ultima_atualizacao?: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          material_id?: string
          preco_medio?: number
          preco_p10?: number | null
          preco_p50?: number | null
          preco_p90?: number | null
          region_id?: string
          sample_size?: number
          ultima_atualizacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_price_reference_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_price_reference_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          ativo: boolean
          category_id: string
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          unidade_base: string
          unidades_alternativas: Json | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          category_id: string
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          unidade_base: string
          unidades_alternativas?: Json | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          category_id?: string
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          unidade_base?: string
          unidades_alternativas?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
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
          cliente_id: string | null
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
          cliente_id?: string | null
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
          cliente_id?: string | null
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
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
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
          cliente_id: string | null
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
          cliente_id?: string | null
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
          cliente_id?: string | null
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
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      parametric_audit_logs: {
        Row: {
          action: string
          budget_item_id: string | null
          created_at: string | null
          element_id: string | null
          id: string
          metadata: Json | null
          new_value: number | null
          old_value: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          budget_item_id?: string | null
          created_at?: string | null
          element_id?: string | null
          id?: string
          metadata?: Json | null
          new_value?: number | null
          old_value?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          budget_item_id?: string | null
          created_at?: string | null
          element_id?: string | null
          id?: string
          metadata?: Json | null
          new_value?: number | null
          old_value?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      parametric_rules: {
        Row: {
          base_parameter: string
          coefficient: number | null
          configuration_type: string | null
          construction_method: string
          created_at: string | null
          defaults: Json | null
          element_type: string
          formula: string
          functional_type: string | null
          id: string
          is_system: boolean | null
          locked: boolean | null
          market: string[] | null
          notes: string | null
          output_unit: string | null
          rule_key: string | null
          rule_name: string
          trade: string | null
          unit: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          base_parameter: string
          coefficient?: number | null
          configuration_type?: string | null
          construction_method: string
          created_at?: string | null
          defaults?: Json | null
          element_type: string
          formula: string
          functional_type?: string | null
          id?: string
          is_system?: boolean | null
          locked?: boolean | null
          market?: string[] | null
          notes?: string | null
          output_unit?: string | null
          rule_key?: string | null
          rule_name: string
          trade?: string | null
          unit: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          base_parameter?: string
          coefficient?: number | null
          configuration_type?: string | null
          construction_method?: string
          created_at?: string | null
          defaults?: Json | null
          element_type?: string
          formula?: string
          functional_type?: string | null
          id?: string
          is_system?: boolean | null
          locked?: boolean | null
          market?: string[] | null
          notes?: string | null
          output_unit?: string | null
          rule_key?: string | null
          rule_name?: string
          trade?: string | null
          unit?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      price_audit_log: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          executado_por: string
          id: string
          material_id: string | null
          region_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          executado_por?: string
          id?: string
          material_id?: string | null
          region_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          executado_por?: string
          id?: string
          material_id?: string | null
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_audit_log_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_audit_log_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_sources: {
        Row: {
          ativa: boolean
          base_weight: number
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          base_weight?: number
          created_at?: string
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          base_weight?: number
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
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
      regions: {
        Row: {
          ativa: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      relatorios_diarios: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          condicoes_meteorologicas: string | null
          created_at: string
          criado_por: string | null
          data: string
          id: string
          mao_de_obra_presente: number | null
          obra_id: string
          observacoes: string | null
          ocorrencias: string | null
          status: string
          trabalhos_executados: string | null
          trabalhos_quantificados: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          condicoes_meteorologicas?: string | null
          created_at?: string
          criado_por?: string | null
          data: string
          id?: string
          mao_de_obra_presente?: number | null
          obra_id: string
          observacoes?: string | null
          ocorrencias?: string | null
          status?: string
          trabalhos_executados?: string | null
          trabalhos_quantificados?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          condicoes_meteorologicas?: string | null
          created_at?: string
          criado_por?: string | null
          data?: string
          id?: string
          mao_de_obra_presente?: number | null
          obra_id?: string
          observacoes?: string | null
          ocorrencias?: string | null
          status?: string
          trabalhos_executados?: string | null
          trabalhos_quantificados?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_diarios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          categoria: string | null
          created_at: string
          data_agendada: string | null
          data_conclusao: string | null
          dependencias: string[] | null
          descricao: string | null
          id: string
          obra_id: string
          ordem: number | null
          prioridade: string
          responsavel_id: string | null
          status: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_agendada?: string | null
          data_conclusao?: string | null
          dependencias?: string[] | null
          descricao?: string | null
          id?: string
          obra_id: string
          ordem?: number | null
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_agendada?: string | null
          data_conclusao?: string | null
          dependencias?: string[] | null
          descricao?: string | null
          id?: string
          obra_id?: string
          ordem?: number | null
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_cronograma: {
        Row: {
          categoria: string | null
          cor: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          obra_id: string
          progresso: number | null
          recursos: string | null
          responsavel: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string | null
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          obra_id: string
          progresso?: number | null
          recursos?: string | null
          responsavel?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string | null
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          obra_id?: string
          progresso?: number | null
          recursos?: string | null
          responsavel?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_cronograma_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
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
      calculate_element_parameters: {
        Args: { p_element_id: string }
        Returns: undefined
      }
      execute_parametric_rule: {
        Args: { p_element_id: string; p_rule_id: string }
        Returns: number
      }
      execute_parametric_rule_v2: {
        Args: {
          p_coefficient_overrides?: Json
          p_element_id: string
          p_rule_id: string
        }
        Returns: number
      }
      sync_parametric_quantities: {
        Args: { p_element_id: string }
        Returns: undefined
      }
      validate_element_parameters: {
        Args: { p_element_id: string }
        Returns: {
          field: string
          level: string
          message: string
        }[]
      }
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
