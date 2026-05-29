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
      ai_budget_actions_log: {
        Row: {
          action: string
          actor_user_id: string
          after_snapshot: Json | null
          before_snapshot: Json | null
          budget_id: string
          created_at: string
          id: string
          insight_id: string
          user_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          budget_id: string
          created_at?: string
          id?: string
          insight_id: string
          user_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          budget_id?: string
          created_at?: string
          id?: string
          insight_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_budget_actions_log_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_budget_actions_log_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "ai_budget_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_budget_insights: {
        Row: {
          budget_id: string
          content_hash: string | null
          created_at: string
          id: string
          impact_percent: number | null
          impact_value: number | null
          message: string
          payload: Json
          severity: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_id: string
          content_hash?: string | null
          created_at?: string
          id?: string
          impact_percent?: number | null
          impact_value?: number | null
          message: string
          payload?: Json
          severity?: string
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_id?: string
          content_hash?: string | null
          created_at?: string
          id?: string
          impact_percent?: number | null
          impact_value?: number | null
          message?: string
          payload?: Json
          severity?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_budget_insights_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      alocacoes_obra: {
        Row: {
          ativo: boolean
          created_at: string
          custo_dia: number | null
          custo_hora: number | null
          data_fim: string | null
          data_inicio: string
          funcao: string | null
          id: string
          membro_id: string
          obra_id: string
          observacoes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_dia?: number | null
          custo_hora?: number | null
          data_fim?: string | null
          data_inicio?: string
          funcao?: string | null
          id?: string
          membro_id: string
          obra_id: string
          observacoes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_dia?: number | null
          custo_hora?: number | null
          data_fim?: string | null
          data_inicio?: string
          funcao?: string | null
          id?: string
          membro_id?: string
          obra_id?: string
          observacoes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_obra_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "equipa_membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_obra_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "equipa_membros_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "aprovacoes_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprovacoes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprovacoes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      artigos_orcamento: {
        Row: {
          article_code: string | null
          article_template_id: string | null
          capitulo_id: string
          chapter_code: string | null
          chapter_template_id: string | null
          codigo: string | null
          cost_center_id: string | null
          cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          created_at: string
          custo_alu: number
          custo_div: number
          custo_mat: number
          custo_mo: number
          custo_srv: number
          custo_sub: number
          descricao: string
          id: string
          linked_element_id: string | null
          linked_rule_id: string | null
          margem_lucro_artigo: number | null
          ordem: number
          preco_base: number | null
          preco_unitario: number
          quantidade: number
          quantity_source: string
          source: string | null
          unidade: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          article_code?: string | null
          article_template_id?: string | null
          capitulo_id: string
          chapter_code?: string | null
          chapter_template_id?: string | null
          codigo?: string | null
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          custo_alu?: number
          custo_div?: number
          custo_mat?: number
          custo_mo?: number
          custo_srv?: number
          custo_sub?: number
          descricao: string
          id?: string
          linked_element_id?: string | null
          linked_rule_id?: string | null
          margem_lucro_artigo?: number | null
          ordem?: number
          preco_base?: number | null
          preco_unitario?: number
          quantidade?: number
          quantity_source?: string
          source?: string | null
          unidade: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          article_code?: string | null
          article_template_id?: string | null
          capitulo_id?: string
          chapter_code?: string | null
          chapter_template_id?: string | null
          codigo?: string | null
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          custo_alu?: number
          custo_div?: number
          custo_mat?: number
          custo_mo?: number
          custo_srv?: number
          custo_sub?: number
          descricao?: string
          id?: string
          linked_element_id?: string | null
          linked_rule_id?: string | null
          margem_lucro_artigo?: number | null
          ordem?: number
          preco_base?: number | null
          preco_unitario?: number
          quantidade?: number
          quantity_source?: string
          source?: string | null
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
          {
            foreignKeyName: "artigos_orcamento_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
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
      auditoria_fiscal: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade_id: string
          entidade_tipo: string
          id: string
          ip_address: unknown
          justificacao: string | null
          regime_anterior_id: string | null
          regime_novo_id: string | null
          taxa_anterior: number | null
          taxa_nova: number | null
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          ip_address?: unknown
          justificacao?: string | null
          regime_anterior_id?: string | null
          regime_novo_id?: string | null
          taxa_anterior?: number | null
          taxa_nova?: number | null
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          ip_address?: unknown
          justificacao?: string | null
          regime_anterior_id?: string | null
          regime_novo_id?: string | null
          taxa_anterior?: number | null
          taxa_nova?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_fiscal_regime_anterior_id_fkey"
            columns: ["regime_anterior_id"]
            isOneToOne: false
            referencedRelation: "regimes_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_fiscal_regime_novo_id_fkey"
            columns: ["regime_novo_id"]
            isOneToOne: false
            referencedRelation: "regimes_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      autos_medicao: {
        Row: {
          codigo_referencia: string | null
          condicoes_execucao: string | null
          contrato_referencia: string | null
          cost_center_id: string | null
          created_at: string
          data_emissao: string
          data_fim: string
          data_inicio: string
          estado: string
          fase_obra: string | null
          fiscal_entidade: string | null
          fiscal_obra: string | null
          id: string
          idioma: string | null
          localizacao_obra: string | null
          nao_conformidades: string | null
          normas_aplicaveis: string[] | null
          numero_auto: number
          obra_id: string
          observacoes_tecnicas: string | null
          orcamento_id: string | null
          percentagem_global: number | null
          responsavel_cargo: string | null
          responsavel_medicao: string
          responsavel_ordem: string | null
          subempreiteiro_id: string | null
          taxa_iva: number | null
          tipo_contrato: string | null
          updated_at: string
          user_id: string
          validado_em: string | null
          validado_por: string | null
          valor_anterior_acumulado: number | null
          valor_iva: number | null
          valor_medido_acumulado: number | null
          valor_medido_atual: number | null
          valor_previsto: number | null
          valor_total_com_iva: number | null
          zona_medicao: string | null
        }
        Insert: {
          codigo_referencia?: string | null
          condicoes_execucao?: string | null
          contrato_referencia?: string | null
          cost_center_id?: string | null
          created_at?: string
          data_emissao?: string
          data_fim: string
          data_inicio: string
          estado?: string
          fase_obra?: string | null
          fiscal_entidade?: string | null
          fiscal_obra?: string | null
          id?: string
          idioma?: string | null
          localizacao_obra?: string | null
          nao_conformidades?: string | null
          normas_aplicaveis?: string[] | null
          numero_auto: number
          obra_id: string
          observacoes_tecnicas?: string | null
          orcamento_id?: string | null
          percentagem_global?: number | null
          responsavel_cargo?: string | null
          responsavel_medicao: string
          responsavel_ordem?: string | null
          subempreiteiro_id?: string | null
          taxa_iva?: number | null
          tipo_contrato?: string | null
          updated_at?: string
          user_id: string
          validado_em?: string | null
          validado_por?: string | null
          valor_anterior_acumulado?: number | null
          valor_iva?: number | null
          valor_medido_acumulado?: number | null
          valor_medido_atual?: number | null
          valor_previsto?: number | null
          valor_total_com_iva?: number | null
          zona_medicao?: string | null
        }
        Update: {
          codigo_referencia?: string | null
          condicoes_execucao?: string | null
          contrato_referencia?: string | null
          cost_center_id?: string | null
          created_at?: string
          data_emissao?: string
          data_fim?: string
          data_inicio?: string
          estado?: string
          fase_obra?: string | null
          fiscal_entidade?: string | null
          fiscal_obra?: string | null
          id?: string
          idioma?: string | null
          localizacao_obra?: string | null
          nao_conformidades?: string | null
          normas_aplicaveis?: string[] | null
          numero_auto?: number
          obra_id?: string
          observacoes_tecnicas?: string | null
          orcamento_id?: string | null
          percentagem_global?: number | null
          responsavel_cargo?: string | null
          responsavel_medicao?: string
          responsavel_ordem?: string | null
          subempreiteiro_id?: string | null
          taxa_iva?: number | null
          tipo_contrato?: string | null
          updated_at?: string
          user_id?: string
          validado_em?: string | null
          validado_por?: string | null
          valor_anterior_acumulado?: number | null
          valor_iva?: number | null
          valor_medido_acumulado?: number | null
          valor_medido_atual?: number | null
          valor_previsto?: number | null
          valor_total_com_iva?: number | null
          zona_medicao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autos_medicao_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autos_medicao_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autos_medicao_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autos_medicao_subempreiteiro_id_fkey"
            columns: ["subempreiteiro_id"]
            isOneToOne: false
            referencedRelation: "subempreiteiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autos_medicao_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autos_medicao_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      autos_medicao_anexos: {
        Row: {
          auto_id: string
          created_at: string
          data_captura: string | null
          descricao: string | null
          file_size: number | null
          geolocalizacao: Json | null
          id: string
          item_id: string | null
          mime_type: string | null
          nome: string
          tipo: string
          url: string
        }
        Insert: {
          auto_id: string
          created_at?: string
          data_captura?: string | null
          descricao?: string | null
          file_size?: number | null
          geolocalizacao?: Json | null
          id?: string
          item_id?: string | null
          mime_type?: string | null
          nome: string
          tipo: string
          url: string
        }
        Update: {
          auto_id?: string
          created_at?: string
          data_captura?: string | null
          descricao?: string | null
          file_size?: number | null
          geolocalizacao?: Json | null
          id?: string
          item_id?: string | null
          mime_type?: string | null
          nome?: string
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "autos_medicao_anexos_auto_id_fkey"
            columns: ["auto_id"]
            isOneToOne: false
            referencedRelation: "autos_medicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autos_medicao_anexos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "autos_medicao_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      autos_medicao_assinaturas: {
        Row: {
          assinatura_data: string | null
          assinatura_url: string | null
          auto_id: string
          cargo: string | null
          codigo_validacao: string | null
          created_at: string
          data_assinatura: string | null
          email: string | null
          entidade: string | null
          estado: string | null
          id: string
          ip_address: string | null
          nome: string
          observacoes: string | null
          qr_code_url: string | null
          tipo: string
        }
        Insert: {
          assinatura_data?: string | null
          assinatura_url?: string | null
          auto_id: string
          cargo?: string | null
          codigo_validacao?: string | null
          created_at?: string
          data_assinatura?: string | null
          email?: string | null
          entidade?: string | null
          estado?: string | null
          id?: string
          ip_address?: string | null
          nome: string
          observacoes?: string | null
          qr_code_url?: string | null
          tipo: string
        }
        Update: {
          assinatura_data?: string | null
          assinatura_url?: string | null
          auto_id?: string
          cargo?: string | null
          codigo_validacao?: string | null
          created_at?: string
          data_assinatura?: string | null
          email?: string | null
          entidade?: string | null
          estado?: string | null
          id?: string
          ip_address?: string | null
          nome?: string
          observacoes?: string | null
          qr_code_url?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "autos_medicao_assinaturas_auto_id_fkey"
            columns: ["auto_id"]
            isOneToOne: false
            referencedRelation: "autos_medicao"
            referencedColumns: ["id"]
          },
        ]
      }
      autos_medicao_historico: {
        Row: {
          alterado_por: string | null
          auto_id: string
          created_at: string
          dados_snapshot: Json
          descricao_alteracao: string | null
          id: string
          tipo_alteracao: string | null
          versao: number
        }
        Insert: {
          alterado_por?: string | null
          auto_id: string
          created_at?: string
          dados_snapshot: Json
          descricao_alteracao?: string | null
          id?: string
          tipo_alteracao?: string | null
          versao: number
        }
        Update: {
          alterado_por?: string | null
          auto_id?: string
          created_at?: string
          dados_snapshot?: Json
          descricao_alteracao?: string | null
          id?: string
          tipo_alteracao?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "autos_medicao_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autos_medicao_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autos_medicao_historico_auto_id_fkey"
            columns: ["auto_id"]
            isOneToOne: false
            referencedRelation: "autos_medicao"
            referencedColumns: ["id"]
          },
        ]
      }
      autos_medicao_itens: {
        Row: {
          artigo_orcamento_id: string | null
          auto_id: string
          capitulo: string | null
          codigo: string
          cost_center_id: string | null
          cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          created_at: string
          dentro_tolerancia: boolean | null
          descricao: string
          desvio_percentual: number | null
          id: string
          justificacao_desvio: string | null
          localizacao: string | null
          observacoes: string | null
          ordem: number | null
          piso: string | null
          preco_unitario: number | null
          quantidade_acumulada: number | null
          quantidade_anterior: number | null
          quantidade_atual: number | null
          quantidade_prevista: number | null
          tolerancia_maxima: number | null
          unidade: string
          updated_at: string
          valor_acumulado: number | null
          valor_anterior: number | null
          valor_atual: number | null
          valor_previsto: number | null
          zona: string | null
        }
        Insert: {
          artigo_orcamento_id?: string | null
          auto_id: string
          capitulo?: string | null
          codigo: string
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          dentro_tolerancia?: boolean | null
          descricao: string
          desvio_percentual?: number | null
          id?: string
          justificacao_desvio?: string | null
          localizacao?: string | null
          observacoes?: string | null
          ordem?: number | null
          piso?: string | null
          preco_unitario?: number | null
          quantidade_acumulada?: number | null
          quantidade_anterior?: number | null
          quantidade_atual?: number | null
          quantidade_prevista?: number | null
          tolerancia_maxima?: number | null
          unidade: string
          updated_at?: string
          valor_acumulado?: number | null
          valor_anterior?: number | null
          valor_atual?: number | null
          valor_previsto?: number | null
          zona?: string | null
        }
        Update: {
          artigo_orcamento_id?: string | null
          auto_id?: string
          capitulo?: string | null
          codigo?: string
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          dentro_tolerancia?: boolean | null
          descricao?: string
          desvio_percentual?: number | null
          id?: string
          justificacao_desvio?: string | null
          localizacao?: string | null
          observacoes?: string | null
          ordem?: number | null
          piso?: string | null
          preco_unitario?: number | null
          quantidade_acumulada?: number | null
          quantidade_anterior?: number | null
          quantidade_atual?: number | null
          quantidade_prevista?: number | null
          tolerancia_maxima?: number | null
          unidade?: string
          updated_at?: string
          valor_acumulado?: number | null
          valor_anterior?: number | null
          valor_atual?: number | null
          valor_previsto?: number | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autos_medicao_itens_artigo_orcamento_id_fkey"
            columns: ["artigo_orcamento_id"]
            isOneToOne: false
            referencedRelation: "artigos_orcamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autos_medicao_itens_auto_id_fkey"
            columns: ["auto_id"]
            isOneToOne: false
            referencedRelation: "autos_medicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autos_medicao_itens_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      axia_budget_stats: {
        Row: {
          canonical_label: string
          id: string
          median_value: number
          p25: number
          p75: number
          sample_size: number
          tipo_obra: string
          updated_at: string
        }
        Insert: {
          canonical_label: string
          id?: string
          median_value?: number
          p25?: number
          p75?: number
          sample_size?: number
          tipo_obra: string
          updated_at?: string
        }
        Update: {
          canonical_label?: string
          id?: string
          median_value?: number
          p25?: number
          p75?: number
          sample_size?: number
          tipo_obra?: string
          updated_at?: string
        }
        Relationships: []
      }
      axia_call_logs: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          input_size_bytes: number | null
          latency_ms: number | null
          model: string | null
          obra_id: string | null
          org_id: string | null
          page_id: string | null
          plan_import_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          input_size_bytes?: number | null
          latency_ms?: number | null
          model?: string | null
          obra_id?: string | null
          org_id?: string | null
          page_id?: string | null
          plan_import_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          input_size_bytes?: number | null
          latency_ms?: number | null
          model?: string | null
          obra_id?: string | null
          org_id?: string | null
          page_id?: string | null
          plan_import_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      axia_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          event_name: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_name: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_name?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      axia_intake_item_history: {
        Row: {
          action: string
          created_at: string
          from_status: string | null
          id: string
          intake_item_id: string
          metadata: Json
          notes: string | null
          to_status: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          from_status?: string | null
          id?: string
          intake_item_id: string
          metadata?: Json
          notes?: string | null
          to_status?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          from_status?: string | null
          id?: string
          intake_item_id?: string
          metadata?: Json
          notes?: string | null
          to_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "axia_intake_item_history_intake_item_id_fkey"
            columns: ["intake_item_id"]
            isOneToOne: false
            referencedRelation: "axia_intake_items"
            referencedColumns: ["id"]
          },
        ]
      }
      axia_intake_items: {
        Row: {
          axia_questions: Json
          confidence: number
          created_at: string
          extracted_data: Json
          id: string
          item_type: string
          missing_fields: Json
          obra_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          title: string
          user_id: string
          voice_command_id: string | null
        }
        Insert: {
          axia_questions?: Json
          confidence?: number
          created_at?: string
          extracted_data?: Json
          id?: string
          item_type: string
          missing_fields?: Json
          obra_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          title: string
          user_id: string
          voice_command_id?: string | null
        }
        Update: {
          axia_questions?: Json
          confidence?: number
          created_at?: string
          extracted_data?: Json
          id?: string
          item_type?: string
          missing_fields?: Json
          obra_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          title?: string
          user_id?: string
          voice_command_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "axia_intake_items_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "axia_intake_items_voice_command_id_fkey"
            columns: ["voice_command_id"]
            isOneToOne: false
            referencedRelation: "voice_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      axia_item_dictionary: {
        Row: {
          canonical_label: string
          confidence: number
          created_at: string
          id: string
          locale: string
          raw_text: string
        }
        Insert: {
          canonical_label: string
          confidence?: number
          created_at?: string
          id?: string
          locale?: string
          raw_text: string
        }
        Update: {
          canonical_label?: string
          confidence?: number
          created_at?: string
          id?: string
          locale?: string
          raw_text?: string
        }
        Relationships: []
      }
      axia_processing_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          input_summary: string | null
          latency_ms: number | null
          model_used: string | null
          output_summary: string | null
          process_type: string
          prompt_version: string | null
          rule_version: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_summary?: string | null
          latency_ms?: number | null
          model_used?: string | null
          output_summary?: string | null
          process_type: string
          prompt_version?: string | null
          rule_version?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_summary?: string | null
          latency_ms?: number | null
          model_used?: string | null
          output_summary?: string | null
          process_type?: string
          prompt_version?: string | null
          rule_version?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      axia_suggestions_log: {
        Row: {
          accepted: boolean | null
          created_at: string
          id: string
          orcamento_id: string | null
          suggestion_payload: Json
          suggestion_type: string
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string
          id?: string
          orcamento_id?: string | null
          suggestion_payload?: Json
          suggestion_type: string
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string
          id?: string
          orcamento_id?: string | null
          suggestion_payload?: Json
          suggestion_type?: string
          user_id?: string
        }
        Relationships: []
      }
      base_artigos_global: {
        Row: {
          artigo: string
          ativo: boolean
          capitulo: string
          codigo: string
          created_at: string
          custo_direto_eur: number
          data_atualizacao: string | null
          edicao_livre: boolean
          estado: string | null
          fonte_base: string | null
          id: string
          mao_obra_estimada_eur: number
          margem_configuravel_pct: number
          material_estimado_eur: number
          observacoes: string | null
          preco_indicativo_eur: number
          subcapitulo: string | null
          tipo_base: string
          tipo_linha: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          artigo: string
          ativo?: boolean
          capitulo: string
          codigo: string
          created_at?: string
          custo_direto_eur?: number
          data_atualizacao?: string | null
          edicao_livre?: boolean
          estado?: string | null
          fonte_base?: string | null
          id?: string
          mao_obra_estimada_eur?: number
          margem_configuravel_pct?: number
          material_estimado_eur?: number
          observacoes?: string | null
          preco_indicativo_eur?: number
          subcapitulo?: string | null
          tipo_base?: string
          tipo_linha?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          artigo?: string
          ativo?: boolean
          capitulo?: string
          codigo?: string
          created_at?: string
          custo_direto_eur?: number
          data_atualizacao?: string | null
          edicao_livre?: boolean
          estado?: string | null
          fonte_base?: string | null
          id?: string
          mao_obra_estimada_eur?: number
          margem_configuravel_pct?: number
          material_estimado_eur?: number
          observacoes?: string | null
          preco_indicativo_eur?: number
          subcapitulo?: string | null
          tipo_base?: string
          tipo_linha?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      base_artigos_user: {
        Row: {
          artigo: string
          ativo: boolean
          capitulo: string
          codigo: string
          created_at: string
          custo_direto_eur: number
          data_atualizacao: string | null
          estado: string | null
          fonte_base: string | null
          global_artigo_id: string | null
          id: string
          mao_obra_estimada_eur: number
          margem_configuravel_pct: number
          material_estimado_eur: number
          observacoes: string | null
          organization_id: string
          origem: string
          preco_indicativo_eur: number
          subcapitulo: string | null
          tipo_base: string
          tipo_linha: string | null
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artigo: string
          ativo?: boolean
          capitulo: string
          codigo: string
          created_at?: string
          custo_direto_eur?: number
          data_atualizacao?: string | null
          estado?: string | null
          fonte_base?: string | null
          global_artigo_id?: string | null
          id?: string
          mao_obra_estimada_eur?: number
          margem_configuravel_pct?: number
          material_estimado_eur?: number
          observacoes?: string | null
          organization_id: string
          origem?: string
          preco_indicativo_eur?: number
          subcapitulo?: string | null
          tipo_base?: string
          tipo_linha?: string | null
          unidade?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artigo?: string
          ativo?: boolean
          capitulo?: string
          codigo?: string
          created_at?: string
          custo_direto_eur?: number
          data_atualizacao?: string | null
          estado?: string | null
          fonte_base?: string | null
          global_artigo_id?: string | null
          id?: string
          mao_obra_estimada_eur?: number
          margem_configuravel_pct?: number
          material_estimado_eur?: number
          observacoes?: string | null
          organization_id?: string
          origem?: string
          preco_indicativo_eur?: number
          subcapitulo?: string | null
          tipo_base?: string
          tipo_linha?: string | null
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_artigos_user_global_artigo_id_fkey"
            columns: ["global_artigo_id"]
            isOneToOne: false
            referencedRelation: "base_artigos_global"
            referencedColumns: ["id"]
          },
        ]
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
      budget_article_templates: {
        Row: {
          active: boolean
          category: string | null
          chapter_template_id: string
          code: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          sort_order: number
          suggested_unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          chapter_template_id: string
          code: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          suggested_unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          chapter_template_id?: string
          code?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          suggested_unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_article_templates_chapter_template_id_fkey"
            columns: ["chapter_template_id"]
            isOneToOne: false
            referencedRelation: "budget_chapter_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_awards: {
        Row: {
          awarded_at: string
          awarded_by_user_id: string
          awarded_total_amount: number
          budget_id: string
          budget_version_id: string | null
          cost_center_id: string | null
          cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          created_at: string
          deposit_amount: number
          deposit_percent: number
          id: string
          notes: string | null
          obra_id: string | null
          package_id: string | null
          remaining_amount: number
          status: string
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by_user_id: string
          awarded_total_amount: number
          budget_id: string
          budget_version_id?: string | null
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          deposit_amount?: number
          deposit_percent?: number
          id?: string
          notes?: string | null
          obra_id?: string | null
          package_id?: string | null
          remaining_amount?: number
          status?: string
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by_user_id?: string
          awarded_total_amount?: number
          budget_id?: string
          budget_version_id?: string | null
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          deposit_amount?: number
          deposit_percent?: number
          id?: string
          notes?: string | null
          obra_id?: string | null
          package_id?: string | null
          remaining_amount?: number
          status?: string
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_awards_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_awards_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_awards_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_awards_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_awards_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "contracting_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_chapter_templates: {
        Row: {
          active: boolean
          code: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      budget_documents: {
        Row: {
          budget_id: string
          created_at: string
          document_type: string
          generated_at: string
          id: string
          sent_at: string | null
          sent_to_email: string | null
          storage_path: string
          user_id: string
          view_mode: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          document_type?: string
          generated_at?: string
          id?: string
          sent_at?: string | null
          sent_to_email?: string | null
          storage_path: string
          user_id: string
          view_mode?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          document_type?: string
          generated_at?: string
          id?: string
          sent_at?: string | null
          sent_to_email?: string | null
          storage_path?: string
          user_id?: string
          view_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_documents_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_events: {
        Row: {
          budget_version_id: string | null
          created_at: string
          created_by: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          new_value: Json | null
          obra_id: string | null
          organization_id: string | null
          previous_value: Json | null
          source_budget_id: string | null
          user_id: string
        }
        Insert: {
          budget_version_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          new_value?: Json | null
          obra_id?: string | null
          organization_id?: string | null
          previous_value?: Json | null
          source_budget_id?: string | null
          user_id: string
        }
        Update: {
          budget_version_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          new_value?: Json | null
          obra_id?: string | null
          organization_id?: string | null
          previous_value?: Json | null
          source_budget_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_events_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_events_source_budget_id_fkey"
            columns: ["source_budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_payment_plans: {
        Row: {
          amount: number
          budget_award_id: string
          created_at: string
          due_date: string
          id: string
          installment_no: number
          label: string
          obra_id: string | null
          percent_of_award: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          budget_award_id: string
          created_at?: string
          due_date: string
          id?: string
          installment_no: number
          label: string
          obra_id?: string | null
          percent_of_award?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          budget_award_id?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_no?: number
          label?: string
          obra_id?: string | null
          percent_of_award?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_payment_plans_budget_award_id_fkey"
            columns: ["budget_award_id"]
            isOneToOne: false
            referencedRelation: "budget_awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_payment_plans_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_version_items: {
        Row: {
          awarded_amount: number
          base_quantity: number
          base_total: number
          base_unit_price: number
          budget_version_id: string
          chapter_code: string | null
          chapter_name: string | null
          codigo: string | null
          contracting_status: string
          cost_center_id: string | null
          cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          created_at: string
          description: string
          id: string
          notes: string | null
          ordem: number
          package_id: string | null
          purchased_amount: number
          remaining_amount: number
          source_artigo_id: string | null
          source_capitulo_id: string | null
          supplier_id: string | null
          target_quantity: number
          target_total: number
          target_unit_price: number
          unit: string | null
          updated_at: string
          variance_from_base: number
          variance_from_previous: number
        }
        Insert: {
          awarded_amount?: number
          base_quantity?: number
          base_total?: number
          base_unit_price?: number
          budget_version_id: string
          chapter_code?: string | null
          chapter_name?: string | null
          codigo?: string | null
          contracting_status?: string
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          ordem?: number
          package_id?: string | null
          purchased_amount?: number
          remaining_amount?: number
          source_artigo_id?: string | null
          source_capitulo_id?: string | null
          supplier_id?: string | null
          target_quantity?: number
          target_total?: number
          target_unit_price?: number
          unit?: string | null
          updated_at?: string
          variance_from_base?: number
          variance_from_previous?: number
        }
        Update: {
          awarded_amount?: number
          base_quantity?: number
          base_total?: number
          base_unit_price?: number
          budget_version_id?: string
          chapter_code?: string | null
          chapter_name?: string | null
          codigo?: string | null
          contracting_status?: string
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          ordem?: number
          package_id?: string | null
          purchased_amount?: number
          remaining_amount?: number
          source_artigo_id?: string | null
          source_capitulo_id?: string | null
          supplier_id?: string | null
          target_quantity?: number
          target_total?: number
          target_unit_price?: number
          unit?: string | null
          updated_at?: string
          variance_from_base?: number
          variance_from_previous?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_version_items_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_version_items_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bvi_package_fk"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "contracting_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          id: string
          locked_at: string | null
          obra_id: string | null
          organization_id: string | null
          parent_version_id: string | null
          reason: string | null
          source_budget_id: string
          status: string
          total_awarded: number
          total_base: number
          total_purchased: number
          total_remaining: number
          total_target: number
          updated_at: string
          user_id: string
          variance_from_base: number
          variance_from_previous: number
          version_name: string | null
          version_number: number
          version_type: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          locked_at?: string | null
          obra_id?: string | null
          organization_id?: string | null
          parent_version_id?: string | null
          reason?: string | null
          source_budget_id: string
          status?: string
          total_awarded?: number
          total_base?: number
          total_purchased?: number
          total_remaining?: number
          total_target?: number
          updated_at?: string
          user_id: string
          variance_from_base?: number
          variance_from_previous?: number
          version_name?: string | null
          version_number?: number
          version_type: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          locked_at?: string | null
          obra_id?: string | null
          organization_id?: string | null
          parent_version_id?: string | null
          reason?: string | null
          source_budget_id?: string
          status?: string
          total_awarded?: number
          total_base?: number
          total_purchased?: number
          total_remaining?: number
          total_target?: number
          updated_at?: string
          user_id?: string
          variance_from_base?: number
          variance_from_previous?: number
          version_name?: string | null
          version_number?: number
          version_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_source_budget_id_fkey"
            columns: ["source_budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      caderno_item_match: {
        Row: {
          artigo_base_id: string | null
          caderno_item_id: string
          created_at: string
          id: string
          material_id: string | null
          metodo_construtivo: string | null
          nivel_confianca: number
          observacoes: string | null
          preco_estimado: number | null
          unidade_sugerida: string | null
          updated_at: string
          validado: boolean
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          artigo_base_id?: string | null
          caderno_item_id: string
          created_at?: string
          id?: string
          material_id?: string | null
          metodo_construtivo?: string | null
          nivel_confianca?: number
          observacoes?: string | null
          preco_estimado?: number | null
          unidade_sugerida?: string | null
          updated_at?: string
          validado?: boolean
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          artigo_base_id?: string | null
          caderno_item_id?: string
          created_at?: string
          id?: string
          material_id?: string | null
          metodo_construtivo?: string | null
          nivel_confianca?: number
          observacoes?: string | null
          preco_estimado?: number | null
          unidade_sugerida?: string | null
          updated_at?: string
          validado?: boolean
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caderno_item_match_artigo_base_id_fkey"
            columns: ["artigo_base_id"]
            isOneToOne: false
            referencedRelation: "default_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caderno_item_match_caderno_item_id_fkey"
            columns: ["caderno_item_id"]
            isOneToOne: false
            referencedRelation: "caderno_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caderno_item_match_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      caderno_itens: {
        Row: {
          classificacao: Json | null
          created_at: string
          descricao_original: string
          id: string
          ordem: number
          quantidade_detectada: number | null
          secao_id: string
          status: string
          texto_original: string | null
          unidade_detectada: string | null
        }
        Insert: {
          classificacao?: Json | null
          created_at?: string
          descricao_original: string
          id?: string
          ordem?: number
          quantidade_detectada?: number | null
          secao_id: string
          status?: string
          texto_original?: string | null
          unidade_detectada?: string | null
        }
        Update: {
          classificacao?: Json | null
          created_at?: string
          descricao_original?: string
          id?: string
          ordem?: number
          quantidade_detectada?: number | null
          secao_id?: string
          status?: string
          texto_original?: string | null
          unidade_detectada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caderno_itens_secao_id_fkey"
            columns: ["secao_id"]
            isOneToOne: false
            referencedRelation: "caderno_secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      caderno_secoes: {
        Row: {
          caderno_id: string
          codigo: string
          created_at: string
          id: string
          nivel: number
          nome: string
          ordem: number
          parent_id: string | null
        }
        Insert: {
          caderno_id: string
          codigo: string
          created_at?: string
          id?: string
          nivel?: number
          nome: string
          ordem?: number
          parent_id?: string | null
        }
        Update: {
          caderno_id?: string
          codigo?: string
          created_at?: string
          id?: string
          nivel?: number
          nome?: string
          ordem?: number
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caderno_secoes_caderno_id_fkey"
            columns: ["caderno_id"]
            isOneToOne: false
            referencedRelation: "cadernos_encargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caderno_secoes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "caderno_secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      caderno_validacao_historico: {
        Row: {
          artigo_id: string | null
          confianca_original: number | null
          created_at: string
          descricao_normalizada: string
          descricao_original: string
          foi_correcao: boolean
          id: string
          material_id: string | null
          metodo_construtivo: string | null
          tipo_trabalho: string | null
          unidade_correta: string | null
          unidade_original: string | null
          updated_at: string
          user_id: string
          vezes_usado: number
        }
        Insert: {
          artigo_id?: string | null
          confianca_original?: number | null
          created_at?: string
          descricao_normalizada: string
          descricao_original: string
          foi_correcao?: boolean
          id?: string
          material_id?: string | null
          metodo_construtivo?: string | null
          tipo_trabalho?: string | null
          unidade_correta?: string | null
          unidade_original?: string | null
          updated_at?: string
          user_id: string
          vezes_usado?: number
        }
        Update: {
          artigo_id?: string | null
          confianca_original?: number | null
          created_at?: string
          descricao_normalizada?: string
          descricao_original?: string
          foi_correcao?: boolean
          id?: string
          material_id?: string | null
          metodo_construtivo?: string | null
          tipo_trabalho?: string | null
          unidade_correta?: string | null
          unidade_original?: string | null
          updated_at?: string
          user_id?: string
          vezes_usado?: number
        }
        Relationships: [
          {
            foreignKeyName: "caderno_validacao_historico_artigo_id_fkey"
            columns: ["artigo_id"]
            isOneToOne: false
            referencedRelation: "default_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caderno_validacao_historico_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      cadernos_encargos: {
        Row: {
          created_at: string
          ficheiro_nome: string | null
          ficheiro_tipo: string | null
          ficheiro_url: string | null
          id: string
          itens_validados: number | null
          metadados: Json | null
          nome: string
          obra_id: string
          orcamento_id: string | null
          origem: string
          perfil_preco: string | null
          status: string
          total_itens: number | null
          updated_at: string
          user_id: string
          valor_estimado: number | null
        }
        Insert: {
          created_at?: string
          ficheiro_nome?: string | null
          ficheiro_tipo?: string | null
          ficheiro_url?: string | null
          id?: string
          itens_validados?: number | null
          metadados?: Json | null
          nome: string
          obra_id: string
          orcamento_id?: string | null
          origem: string
          perfil_preco?: string | null
          status?: string
          total_itens?: number | null
          updated_at?: string
          user_id: string
          valor_estimado?: number | null
        }
        Update: {
          created_at?: string
          ficheiro_nome?: string | null
          ficheiro_tipo?: string | null
          ficheiro_url?: string | null
          id?: string
          itens_validados?: number | null
          metadados?: Json | null
          nome?: string
          obra_id?: string
          orcamento_id?: string | null
          origem?: string
          perfil_preco?: string | null
          status?: string
          total_itens?: number | null
          updated_at?: string
          user_id?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cadernos_encargos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadernos_encargos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
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
          client_exclusions_text: string | null
          client_summary_order: number | null
          client_summary_text: string | null
          client_summary_title: string | null
          created_at: string
          default_cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          descricao: string | null
          id: string
          include_in_client_summary: boolean | null
          numero: number
          orcamento_id: string
          ordem: number
          titulo: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          client_exclusions_text?: string | null
          client_summary_order?: number | null
          client_summary_text?: string | null
          client_summary_title?: string | null
          created_at?: string
          default_cost_nature?:
            | Database["public"]["Enums"]["cost_nature"]
            | null
          descricao?: string | null
          id?: string
          include_in_client_summary?: boolean | null
          numero: number
          orcamento_id: string
          ordem?: number
          titulo: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          client_exclusions_text?: string | null
          client_summary_order?: number | null
          client_summary_text?: string | null
          client_summary_title?: string | null
          created_at?: string
          default_cost_nature?:
            | Database["public"]["Enums"]["cost_nature"]
            | null
          descricao?: string | null
          id?: string
          include_in_client_summary?: boolean | null
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
      catalog_items: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          description: string | null
          id: string
          item_type: string
          name: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_type?: string
          name: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_type?: string
          name?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categorias_financeiras: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string
          id: string
          nome: string
          origem: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          origem: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          origem?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "checklist_conformidade_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      client_obra_access: {
        Row: {
          ativo: boolean
          client_email: string | null
          client_name: string | null
          client_user_id: string
          created_at: string
          granted_by: string | null
          id: string
          obra_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          client_email?: string | null
          client_name?: string | null
          client_user_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          obra_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          client_email?: string | null
          client_name?: string | null
          client_user_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          obra_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_obra_access_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
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
      closing_sheet_sales_lines: {
        Row: {
          area_priv: number | null
          closing_sheet_id: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          preco_m2: number | null
          quantidade: number
          sort_order: number
          tipologia: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          area_priv?: number | null
          closing_sheet_id: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          preco_m2?: number | null
          quantidade?: number
          sort_order?: number
          tipologia: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          area_priv?: number | null
          closing_sheet_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          preco_m2?: number | null
          quantidade?: number
          sort_order?: number
          tipologia?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_sheet_sales_lines_closing_sheet_id_fkey"
            columns: ["closing_sheet_id"]
            isOneToOne: false
            referencedRelation: "closing_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_sheet_site_detail_lines: {
        Row: {
          category: string
          closing_sheet_id: string
          created_at: string
          description: string
          id: string
          monthly_cost: number | null
          months: number | null
          notes: string | null
          organization_id: string
          quantity: number | null
          sort_order: number
          total_amount: number | null
          updated_at: string
          useful_percent: number | null
        }
        Insert: {
          category: string
          closing_sheet_id: string
          created_at?: string
          description: string
          id?: string
          monthly_cost?: number | null
          months?: number | null
          notes?: string | null
          organization_id: string
          quantity?: number | null
          sort_order?: number
          total_amount?: number | null
          updated_at?: string
          useful_percent?: number | null
        }
        Update: {
          category?: string
          closing_sheet_id?: string
          created_at?: string
          description?: string
          id?: string
          monthly_cost?: number | null
          months?: number | null
          notes?: string | null
          organization_id?: string
          quantity?: number | null
          sort_order?: number
          total_amount?: number | null
          updated_at?: string
          useful_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "closing_sheet_site_detail_lines_closing_sheet_id_fkey"
            columns: ["closing_sheet_id"]
            isOneToOne: false
            referencedRelation: "closing_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_sheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget_version_id: string | null
          closing_type: string
          contingency_amount: number
          created_at: string
          details: Json
          expected_result: number
          final_result: number | null
          id: string
          locked_at: string | null
          margin_amount: number
          margin_percent: number
          notes: string | null
          obra_id: string | null
          organization_id: string | null
          sale_price: number
          site_costs: number
          snapshot: Json | null
          source_budget_id: string | null
          status: string
          structure_costs: number
          total_direct_cost: number
          total_indirect_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget_version_id?: string | null
          closing_type: string
          contingency_amount?: number
          created_at?: string
          details?: Json
          expected_result?: number
          final_result?: number | null
          id?: string
          locked_at?: string | null
          margin_amount?: number
          margin_percent?: number
          notes?: string | null
          obra_id?: string | null
          organization_id?: string | null
          sale_price?: number
          site_costs?: number
          snapshot?: Json | null
          source_budget_id?: string | null
          status?: string
          structure_costs?: number
          total_direct_cost?: number
          total_indirect_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget_version_id?: string | null
          closing_type?: string
          contingency_amount?: number
          created_at?: string
          details?: Json
          expected_result?: number
          final_result?: number | null
          id?: string
          locked_at?: string | null
          margin_amount?: number
          margin_percent?: number
          notes?: string | null
          obra_id?: string | null
          organization_id?: string | null
          sale_price?: number
          site_costs?: number
          snapshot?: Json | null
          source_budget_id?: string | null
          status?: string
          structure_costs?: number
          total_direct_cost?: number
          total_indirect_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_sheets_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_sheets_source_budget_id_fkey"
            columns: ["source_budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      company_ai_settings: {
        Row: {
          contextual_assistant_enabled: boolean
          country: string
          created_at: string
          enabled: boolean
          id: string
          llm_enabled: boolean
          min_margin_percent: number
          outlier_zscore: number
          param_profile_default: string
          ruleset: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          contextual_assistant_enabled?: boolean
          country?: string
          created_at?: string
          enabled?: boolean
          id?: string
          llm_enabled?: boolean
          min_margin_percent?: number
          outlier_zscore?: number
          param_profile_default?: string
          ruleset?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          contextual_assistant_enabled?: boolean
          country?: string
          created_at?: string
          enabled?: boolean
          id?: string
          llm_enabled?: boolean
          min_margin_percent?: number
          outlier_zscore?: number
          param_profile_default?: string
          ruleset?: Json
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
      contas_financeiras: {
        Row: {
          categoria_id: string | null
          cliente_id: string | null
          colaborador_id: string | null
          comprovante_url: string | null
          cost_center_id: string | null
          cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          created_at: string
          created_from: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          fornecedor_id: string | null
          id: string
          intake_status: string | null
          obra_id: string | null
          orcamento_id: string | null
          origem: string
          pago: boolean
          source: string | null
          source_axia_intake_item_id: string | null
          source_voice_command_id: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          cliente_id?: string | null
          colaborador_id?: string | null
          comprovante_url?: string | null
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          created_from?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          intake_status?: string | null
          obra_id?: string | null
          orcamento_id?: string | null
          origem: string
          pago?: boolean
          source?: string | null
          source_axia_intake_item_id?: string | null
          source_voice_command_id?: string | null
          tipo: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          cliente_id?: string | null
          colaborador_id?: string | null
          comprovante_url?: string | null
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          created_from?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          intake_status?: string | null
          obra_id?: string | null
          orcamento_id?: string | null
          origem?: string
          pago?: boolean
          source?: string | null
          source_axia_intake_item_id?: string | null
          source_voice_command_id?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_financeiras_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_source_axia_intake_item_id_fkey"
            columns: ["source_axia_intake_item_id"]
            isOneToOne: false
            referencedRelation: "axia_intake_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_source_voice_command_id_fkey"
            columns: ["source_voice_command_id"]
            isOneToOne: false
            referencedRelation: "voice_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      contracting_packages: {
        Row: {
          awarded_at: string | null
          awarded_supplier_id: string | null
          awarded_total: number
          budget_version_id: string | null
          chapter_code: string | null
          chapter_name: string | null
          cost_center_id: string | null
          cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          created_at: string
          description: string | null
          estimated_total: number
          id: string
          name: string
          notes: string | null
          obra_id: string | null
          organization_id: string | null
          source_budget_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          awarded_supplier_id?: string | null
          awarded_total?: number
          budget_version_id?: string | null
          chapter_code?: string | null
          chapter_name?: string | null
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          description?: string | null
          estimated_total?: number
          id?: string
          name: string
          notes?: string | null
          obra_id?: string | null
          organization_id?: string | null
          source_budget_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          awarded_supplier_id?: string | null
          awarded_total?: number
          budget_version_id?: string | null
          chapter_code?: string | null
          chapter_name?: string | null
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          description?: string | null
          estimated_total?: number
          id?: string
          name?: string
          notes?: string | null
          obra_id?: string | null
          organization_id?: string | null
          source_budget_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracting_packages_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracting_packages_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracting_packages_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracting_packages_source_budget_id_fkey"
            columns: ["source_budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          active: boolean
          code: string
          created_at: string
          fiscal_year: number | null
          id: string
          location: string | null
          name: string
          notes: string | null
          obra_id: string | null
          organization_id: string
          parent_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          fiscal_year?: number | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          obra_id?: string | null
          organization_id: string
          parent_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          fiscal_year?: number | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          obra_id?: string | null
          organization_id?: string
          parent_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
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
          {
            foreignKeyName: "customer_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "clientes_view"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_activities: {
        Row: {
          accumulated_deviation: number | null
          actual_percent_after_rdo: number | null
          actual_percent_before_rdo: number | null
          actual_productivity_day: number | null
          average_productivity_task: number | null
          confidence: number | null
          created_at: string
          criticality: string | null
          daily_deviation: number | null
          daily_report_id: string
          estimated_remaining_duration_days: number | null
          id: string
          impact_schedule_days: number | null
          not_started_or_suspension_reason: string | null
          notes: string | null
          obra_id: string
          plan_adherence_percent: number | null
          planned_percent_to_date: number | null
          planned_productivity_day: number | null
          quantity_done_accumulated: number | null
          quantity_done_today: number | null
          quantity_planned_today: number | null
          remaining_quantity: number | null
          requires_replanning: boolean | null
          schedule_performance_index: number | null
          schedule_task_id: string | null
          source: string
          task_status: string | null
          total_planned_quantity: number | null
          unit: string | null
          updated_at: string
          user_id: string
          voice_command_id: string | null
          wbs_code: string | null
          work_area: string | null
        }
        Insert: {
          accumulated_deviation?: number | null
          actual_percent_after_rdo?: number | null
          actual_percent_before_rdo?: number | null
          actual_productivity_day?: number | null
          average_productivity_task?: number | null
          confidence?: number | null
          created_at?: string
          criticality?: string | null
          daily_deviation?: number | null
          daily_report_id: string
          estimated_remaining_duration_days?: number | null
          id?: string
          impact_schedule_days?: number | null
          not_started_or_suspension_reason?: string | null
          notes?: string | null
          obra_id: string
          plan_adherence_percent?: number | null
          planned_percent_to_date?: number | null
          planned_productivity_day?: number | null
          quantity_done_accumulated?: number | null
          quantity_done_today?: number | null
          quantity_planned_today?: number | null
          remaining_quantity?: number | null
          requires_replanning?: boolean | null
          schedule_performance_index?: number | null
          schedule_task_id?: string | null
          source?: string
          task_status?: string | null
          total_planned_quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
          voice_command_id?: string | null
          wbs_code?: string | null
          work_area?: string | null
        }
        Update: {
          accumulated_deviation?: number | null
          actual_percent_after_rdo?: number | null
          actual_percent_before_rdo?: number | null
          actual_productivity_day?: number | null
          average_productivity_task?: number | null
          confidence?: number | null
          created_at?: string
          criticality?: string | null
          daily_deviation?: number | null
          daily_report_id?: string
          estimated_remaining_duration_days?: number | null
          id?: string
          impact_schedule_days?: number | null
          not_started_or_suspension_reason?: string | null
          notes?: string | null
          obra_id?: string
          plan_adherence_percent?: number | null
          planned_percent_to_date?: number | null
          planned_productivity_day?: number | null
          quantity_done_accumulated?: number | null
          quantity_done_today?: number | null
          quantity_planned_today?: number | null
          remaining_quantity?: number | null
          requires_replanning?: boolean | null
          schedule_performance_index?: number | null
          schedule_task_id?: string | null
          source?: string
          task_status?: string | null
          total_planned_quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          voice_command_id?: string | null
          wbs_code?: string | null
          work_area?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_activities_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_activities_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_activities_schedule_task_id_fkey"
            columns: ["schedule_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_activities_voice_command_id_fkey"
            columns: ["voice_command_id"]
            isOneToOne: false
            referencedRelation: "voice_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_client_inspection: {
        Row: {
          created_at: string
          daily_report_id: string
          extraordinary_requests: string | null
          id: string
          notes: string | null
          obra_id: string
          pending_approvals_count: number | null
          releases_issued_count: number | null
          scope_change_flag: boolean | null
          technical_pending_items: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_report_id: string
          extraordinary_requests?: string | null
          id?: string
          notes?: string | null
          obra_id: string
          pending_approvals_count?: number | null
          releases_issued_count?: number | null
          scope_change_flag?: boolean | null
          technical_pending_items?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          daily_report_id?: string
          extraordinary_requests?: string | null
          id?: string
          notes?: string | null
          obra_id?: string
          pending_approvals_count?: number | null
          releases_issued_count?: number | null
          scope_change_flag?: boolean | null
          technical_pending_items?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_client_inspection_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_client_inspection_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_constraints: {
        Row: {
          blocks_successors: boolean | null
          constraint_type: string
          created_at: string
          daily_report_id: string
          id: string
          impact_days: number | null
          impact_end_at: string | null
          impact_hours: number | null
          impact_start_at: string | null
          impacted_task_id: string | null
          objective_description: string
          obra_id: string
          resolution_due_date: string | null
          responsible_resolution_user_id: string | null
          severity: string
          status: string
          triggers_auto_replanning: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocks_successors?: boolean | null
          constraint_type: string
          created_at?: string
          daily_report_id: string
          id?: string
          impact_days?: number | null
          impact_end_at?: string | null
          impact_hours?: number | null
          impact_start_at?: string | null
          impacted_task_id?: string | null
          objective_description: string
          obra_id: string
          resolution_due_date?: string | null
          responsible_resolution_user_id?: string | null
          severity?: string
          status?: string
          triggers_auto_replanning?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocks_successors?: boolean | null
          constraint_type?: string
          created_at?: string
          daily_report_id?: string
          id?: string
          impact_days?: number | null
          impact_end_at?: string | null
          impact_hours?: number | null
          impact_start_at?: string | null
          impacted_task_id?: string | null
          objective_description?: string
          obra_id?: string
          resolution_due_date?: string | null
          responsible_resolution_user_id?: string | null
          severity?: string
          status?: string
          triggers_auto_replanning?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_constraints_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_constraints_impacted_task_id_fkey"
            columns: ["impacted_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_constraints_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_equipment_resources: {
        Row: {
          available_hours: number | null
          created_at: string
          daily_report_activity_id: string | null
          daily_report_id: string
          downtime_hours: number | null
          downtime_reason: string | null
          equipment_name: string
          equipment_status: string | null
          hours_in_use: number | null
          id: string
          obra_id: string
          quantity: number | null
          user_id: string
        }
        Insert: {
          available_hours?: number | null
          created_at?: string
          daily_report_activity_id?: string | null
          daily_report_id: string
          downtime_hours?: number | null
          downtime_reason?: string | null
          equipment_name: string
          equipment_status?: string | null
          hours_in_use?: number | null
          id?: string
          obra_id: string
          quantity?: number | null
          user_id: string
        }
        Update: {
          available_hours?: number | null
          created_at?: string
          daily_report_activity_id?: string | null
          daily_report_id?: string
          downtime_hours?: number | null
          downtime_reason?: string | null
          equipment_name?: string
          equipment_status?: string | null
          hours_in_use?: number | null
          id?: string
          obra_id?: string
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_equipment_resources_daily_report_activity_id_fkey"
            columns: ["daily_report_activity_id"]
            isOneToOne: false
            referencedRelation: "daily_report_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_equipment_resources_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_equipment_resources_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_labor_resources: {
        Row: {
          absences_count: number | null
          created_at: string
          daily_report_activity_id: string | null
          daily_report_id: string
          hours_per_resource: number | null
          id: string
          obra_id: string
          performance_notes: string | null
          planned_workers_count: number | null
          present_workers_count: number | null
          role_name: string
          team_productivity: number | null
          user_id: string
        }
        Insert: {
          absences_count?: number | null
          created_at?: string
          daily_report_activity_id?: string | null
          daily_report_id: string
          hours_per_resource?: number | null
          id?: string
          obra_id: string
          performance_notes?: string | null
          planned_workers_count?: number | null
          present_workers_count?: number | null
          role_name: string
          team_productivity?: number | null
          user_id: string
        }
        Update: {
          absences_count?: number | null
          created_at?: string
          daily_report_activity_id?: string | null
          daily_report_id?: string
          hours_per_resource?: number | null
          id?: string
          obra_id?: string
          performance_notes?: string | null
          planned_workers_count?: number | null
          present_workers_count?: number | null
          role_name?: string
          team_productivity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_labor_resources_daily_report_activity_id_fkey"
            columns: ["daily_report_activity_id"]
            isOneToOne: false
            referencedRelation: "daily_report_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_labor_resources_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_labor_resources_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_material_needs: {
        Row: {
          created_at: string
          daily_report_id: string
          id: string
          material_name: string
          quantity: number | null
          related_supplier_id: string | null
          source: string
          status: string
          unit: string | null
          urgency: string
          user_id: string
          voice_command_id: string | null
        }
        Insert: {
          created_at?: string
          daily_report_id: string
          id?: string
          material_name: string
          quantity?: number | null
          related_supplier_id?: string | null
          source?: string
          status?: string
          unit?: string | null
          urgency?: string
          user_id: string
          voice_command_id?: string | null
        }
        Update: {
          created_at?: string
          daily_report_id?: string
          id?: string
          material_name?: string
          quantity?: number | null
          related_supplier_id?: string | null
          source?: string
          status?: string
          unit?: string | null
          urgency?: string
          user_id?: string
          voice_command_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_material_needs_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "relatorios_diarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_material_needs_related_supplier_id_fkey"
            columns: ["related_supplier_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_material_needs_voice_command_id_fkey"
            columns: ["voice_command_id"]
            isOneToOne: false
            referencedRelation: "voice_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_materials: {
        Row: {
          batch_reference: string | null
          consumed_quantity_today: number | null
          created_at: string
          daily_report_activity_id: string | null
          daily_report_id: string
          id: string
          material_name: string
          obra_id: string
          received_quantity_today: number | null
          rejected_quantity: number | null
          shortage_flag: boolean | null
          stock_risk_flag: boolean | null
          supplier_name: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          batch_reference?: string | null
          consumed_quantity_today?: number | null
          created_at?: string
          daily_report_activity_id?: string | null
          daily_report_id: string
          id?: string
          material_name: string
          obra_id: string
          received_quantity_today?: number | null
          rejected_quantity?: number | null
          shortage_flag?: boolean | null
          stock_risk_flag?: boolean | null
          supplier_name?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          batch_reference?: string | null
          consumed_quantity_today?: number | null
          created_at?: string
          daily_report_activity_id?: string | null
          daily_report_id?: string
          id?: string
          material_name?: string
          obra_id?: string
          received_quantity_today?: number | null
          rejected_quantity?: number | null
          shortage_flag?: boolean | null
          stock_risk_flag?: boolean | null
          supplier_name?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_materials_daily_report_activity_id_fkey"
            columns: ["daily_report_activity_id"]
            isOneToOne: false
            referencedRelation: "daily_report_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_materials_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_materials_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_productions: {
        Row: {
          accumulated_production: number | null
          approved_production: number | null
          created_at: string
          daily_report_activity_id: string | null
          daily_report_id: string
          exact_location: string | null
          executed_percent_task: number | null
          id: string
          obra_id: string
          quantity_executed_today: number | null
          quantity_planned_today: number | null
          rejected_production: number | null
          related_schedule_task_id: string | null
          service_name: string
          subservice_name: string | null
          technical_notes: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          accumulated_production?: number | null
          approved_production?: number | null
          created_at?: string
          daily_report_activity_id?: string | null
          daily_report_id: string
          exact_location?: string | null
          executed_percent_task?: number | null
          id?: string
          obra_id: string
          quantity_executed_today?: number | null
          quantity_planned_today?: number | null
          rejected_production?: number | null
          related_schedule_task_id?: string | null
          service_name: string
          subservice_name?: string | null
          technical_notes?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          accumulated_production?: number | null
          approved_production?: number | null
          created_at?: string
          daily_report_activity_id?: string | null
          daily_report_id?: string
          exact_location?: string | null
          executed_percent_task?: number | null
          id?: string
          obra_id?: string
          quantity_executed_today?: number | null
          quantity_planned_today?: number | null
          rejected_production?: number | null
          related_schedule_task_id?: string | null
          service_name?: string
          subservice_name?: string | null
          technical_notes?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_productions_daily_report_activity_id_fkey"
            columns: ["daily_report_activity_id"]
            isOneToOne: false
            referencedRelation: "daily_report_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_productions_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_productions_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_productions_related_schedule_task_id_fkey"
            columns: ["related_schedule_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_quality: {
        Row: {
          blocked_tasks_by_quality: number | null
          created_at: string
          daily_report_id: string
          id: string
          inspections_count: number | null
          non_conformities_count: number | null
          notes: string | null
          obra_id: string
          quality_status: string | null
          reexecuted_quantity: number | null
          rejected_quantity: number | null
          rework_generated: boolean | null
          user_id: string
        }
        Insert: {
          blocked_tasks_by_quality?: number | null
          created_at?: string
          daily_report_id: string
          id?: string
          inspections_count?: number | null
          non_conformities_count?: number | null
          notes?: string | null
          obra_id: string
          quality_status?: string | null
          reexecuted_quantity?: number | null
          rejected_quantity?: number | null
          rework_generated?: boolean | null
          user_id: string
        }
        Update: {
          blocked_tasks_by_quality?: number | null
          created_at?: string
          daily_report_id?: string
          id?: string
          inspections_count?: number | null
          non_conformities_count?: number | null
          notes?: string | null
          obra_id?: string
          quality_status?: string | null
          reexecuted_quantity?: number | null
          rejected_quantity?: number | null
          rework_generated?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_quality_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_quality_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_safety: {
        Row: {
          created_at: string
          daily_report_id: string
          id: string
          incidents_count: number | null
          interdicted_workfronts_count: number | null
          lost_hours_due_safety: number | null
          near_misses_count: number | null
          notes: string | null
          obra_id: string
          stoppages_due_safety: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_report_id: string
          id?: string
          incidents_count?: number | null
          interdicted_workfronts_count?: number | null
          lost_hours_due_safety?: number | null
          near_misses_count?: number | null
          notes?: string | null
          obra_id: string
          stoppages_due_safety?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          daily_report_id?: string
          id?: string
          incidents_count?: number | null
          interdicted_workfronts_count?: number | null
          lost_hours_due_safety?: number | null
          near_misses_count?: number | null
          notes?: string | null
          obra_id?: string
          stoppages_due_safety?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_safety_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_safety_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          actual_work_hours: number | null
          approved_at: string | null
          approved_by: string | null
          closed_at: string | null
          created_at: string
          critical_occurrences: string | null
          daily_production_level: string | null
          day_type: string | null
          executive_summary: string | null
          filled_by_user_id: string | null
          geolocation_lat: number | null
          geolocation_lng: number | null
          id: string
          obra_id: string
          opened_at: string | null
          planned_work_hours: number | null
          report_date: string
          responsible_engineer_id: string | null
          responsible_site_manager_id: string | null
          shift: string | null
          status: string
          updated_at: string
          user_id: string
          weather_condition: string | null
          weather_impact: string | null
          weekday: string | null
          work_regime: string | null
          workfront_id: string | null
        }
        Insert: {
          actual_work_hours?: number | null
          approved_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          created_at?: string
          critical_occurrences?: string | null
          daily_production_level?: string | null
          day_type?: string | null
          executive_summary?: string | null
          filled_by_user_id?: string | null
          geolocation_lat?: number | null
          geolocation_lng?: number | null
          id?: string
          obra_id: string
          opened_at?: string | null
          planned_work_hours?: number | null
          report_date: string
          responsible_engineer_id?: string | null
          responsible_site_manager_id?: string | null
          shift?: string | null
          status?: string
          updated_at?: string
          user_id: string
          weather_condition?: string | null
          weather_impact?: string | null
          weekday?: string | null
          work_regime?: string | null
          workfront_id?: string | null
        }
        Update: {
          actual_work_hours?: number | null
          approved_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          created_at?: string
          critical_occurrences?: string | null
          daily_production_level?: string | null
          day_type?: string | null
          executive_summary?: string | null
          filled_by_user_id?: string | null
          geolocation_lat?: number | null
          geolocation_lng?: number | null
          id?: string
          obra_id?: string
          opened_at?: string | null
          planned_work_hours?: number | null
          report_date?: string
          responsible_engineer_id?: string | null
          responsible_site_manager_id?: string | null
          shift?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          weather_condition?: string | null
          weather_impact?: string | null
          weekday?: string | null
          work_regime?: string | null
          workfront_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_alerts: {
        Row: {
          action_label: string | null
          action_url: string | null
          alert_type: string
          created_at: string
          id: string
          message: string
          obra_id: string | null
          resolved_at: string | null
          severity: string
          source_entity_id: string | null
          source_entity_type: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          alert_type: string
          created_at?: string
          id?: string
          message: string
          obra_id?: string | null
          resolved_at?: string | null
          severity?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          obra_id?: string | null
          resolved_at?: string | null
          severity?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_alerts_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
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
          {
            foreignKeyName: "documentos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
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
      email_click_tracking: {
        Row: {
          campaign: string
          clicked_at: string
          email: string | null
          id: string
          ip_address: string | null
          token: string | null
          user_agent: string | null
        }
        Insert: {
          campaign?: string
          clicked_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          token?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign?: string
          clicked_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          token?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          assunto: string
          ativo: boolean
          created_at: string
          html_content: string
          id: string
          nome: string
          slug: string
          updated_at: string
          updated_by: string | null
          variaveis: Json
        }
        Insert: {
          assunto: string
          ativo?: boolean
          created_at?: string
          html_content: string
          id?: string
          nome: string
          slug: string
          updated_at?: string
          updated_by?: string | null
          variaveis?: Json
        }
        Update: {
          assunto?: string
          ativo?: boolean
          created_at?: string
          html_content?: string
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
          variaveis?: Json
        }
        Relationships: []
      }
      equipa_membros: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          data_admissao: string | null
          email: string | null
          foto_url: string | null
          id: string
          nif: string | null
          nome: string
          obra_atual_id: string | null
          observacoes: string | null
          salario_base: number | null
          subempreiteiro_id: string | null
          telefone: string | null
          tipo_contrato: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data_admissao?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          nif?: string | null
          nome: string
          obra_atual_id?: string | null
          observacoes?: string | null
          salario_base?: number | null
          subempreiteiro_id?: string | null
          telefone?: string | null
          tipo_contrato?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data_admissao?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          nif?: string | null
          nome?: string
          obra_atual_id?: string | null
          observacoes?: string | null
          salario_base?: number | null
          subempreiteiro_id?: string | null
          telefone?: string | null
          tipo_contrato?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipa_membros_obra_atual_id_fkey"
            columns: ["obra_atual_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipa_membros_subempreiteiro_id_fkey"
            columns: ["subempreiteiro_id"]
            isOneToOne: false
            referencedRelation: "subempreiteiros"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          categoria: string | null
          codigo: string | null
          created_at: string
          data_aquisicao: string | null
          estado: string
          foto_url: string | null
          id: string
          localizacao: string | null
          marca: string | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          obra_id: string | null
          observacoes: string | null
          updated_at: string
          user_id: string
          valor_aquisicao: number | null
        }
        Insert: {
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          data_aquisicao?: string | null
          estado?: string
          foto_url?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          obra_id?: string | null
          observacoes?: string | null
          updated_at?: string
          user_id: string
          valor_aquisicao?: number | null
        }
        Update: {
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          data_aquisicao?: string | null
          estado?: string
          foto_url?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          obra_id?: string | null
          observacoes?: string | null
          updated_at?: string
          user_id?: string
          valor_aquisicao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      essencial_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          modelo_utilizado: boolean | null
          orcamento_id: string | null
          quantidade_itens: number | null
          tempo_total_segundos: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          modelo_utilizado?: boolean | null
          orcamento_id?: string | null
          quantidade_itens?: number | null
          tempo_total_segundos?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          modelo_utilizado?: boolean | null
          orcamento_id?: string | null
          quantidade_itens?: number | null
          tempo_total_segundos?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "essencial_events_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
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
      feedback_pesquisa: {
        Row: {
          comentario: string | null
          created_at: string
          email: string
          id: string
          nome: string | null
          nota: number
          token: string
          trial_extendido: boolean
          user_id: string | null
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          email: string
          id?: string
          nome?: string | null
          nota: number
          token: string
          trial_extendido?: boolean
          user_id?: string | null
        }
        Update: {
          comentario?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string | null
          nota?: number
          token?: string
          trial_extendido?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      financeiro_obras: {
        Row: {
          created_at: string
          id: string
          obra_id: string
          updated_at: string
          valor_contrato: number
          valor_faturado: number
          valor_recebido: number
        }
        Insert: {
          created_at?: string
          id?: string
          obra_id: string
          updated_at?: string
          valor_contrato?: number
          valor_faturado?: number
          valor_recebido?: number
        }
        Update: {
          created_at?: string
          id?: string
          obra_id?: string
          updated_at?: string
          valor_contrato?: number
          valor_faturado?: number
          valor_recebido?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_obras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: true
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_access_audit: {
        Row: {
          action_type: string
          created_at: string
          error_message: string | null
          id: string
          obra_id: string | null
          success: boolean
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          obra_id?: string | null
          success?: boolean
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          obra_id?: string | null
          success?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_access_audit_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          dedupe_key: string | null
          detected_at: string
          explanation_json: Json | null
          id: string
          message: string
          obra_id: string
          related_milestone_id: string | null
          related_task_id: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          dedupe_key?: string | null
          detected_at?: string
          explanation_json?: Json | null
          id?: string
          message: string
          obra_id: string
          related_milestone_id?: string | null
          related_task_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          dedupe_key?: string | null
          detected_at?: string
          explanation_json?: Json | null
          id?: string
          message?: string
          obra_id?: string
          related_milestone_id?: string | null
          related_task_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_alerts_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_alerts_related_milestone_id_fkey"
            columns: ["related_milestone_id"]
            isOneToOne: false
            referencedRelation: "financial_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_alerts_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_milestones: {
        Row: {
          actual_amount: number | null
          actual_date: string | null
          created_at: string
          description: string
          forecast_amount: number | null
          forecast_date: string | null
          id: string
          milestone_type: string
          obra_id: string
          planned_amount: number | null
          planned_date: string | null
          related_task_id: string | null
          status: string | null
          trigger_mode: string
          trigger_progress_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_amount?: number | null
          actual_date?: string | null
          created_at?: string
          description: string
          forecast_amount?: number | null
          forecast_date?: string | null
          id?: string
          milestone_type: string
          obra_id: string
          planned_amount?: number | null
          planned_date?: string | null
          related_task_id?: string | null
          status?: string | null
          trigger_mode?: string
          trigger_progress_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_amount?: number | null
          actual_date?: string | null
          created_at?: string
          description?: string
          forecast_amount?: number | null
          forecast_date?: string | null
          id?: string
          milestone_type?: string
          obra_id?: string
          planned_amount?: number | null
          planned_date?: string | null
          related_task_id?: string | null
          status?: string | null
          trigger_mode?: string
          trigger_progress_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_milestones_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_milestones_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_project_assignments: {
        Row: {
          created_at: string
          granted_by: string
          id: string
          obra_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          obra_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          obra_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_project_assignments_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          area_atuacao: string | null
          ativo: boolean
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nif: string | null
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_atuacao?: string | null
          ativo?: boolean
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nif?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_atuacao?: string | null
          ativo?: boolean
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nif?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      icf_analysis_snapshots: {
        Row: {
          analysis_id: string
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          label: string | null
          payload: Json
          version_number: number
        }
        Insert: {
          analysis_id: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          label?: string | null
          payload: Json
          version_number: number
        }
        Update: {
          analysis_id?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          label?: string | null
          payload?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "icf_analysis_snapshots_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "icf_project_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_assistant_items: {
        Row: {
          assumptions: Json | null
          attributes: Json | null
          category: string
          confidence: number | null
          created_at: string | null
          id: string
          is_icf_candidate: boolean | null
          notes: string | null
          ordem: number | null
          organization_id: string
          quantity: number | null
          reference: string | null
          review_required: boolean | null
          session_id: string
          source_type: Database["public"]["Enums"]["icf_source_type"]
          unit: string | null
          updated_at: string | null
          user_confirmed: boolean | null
        }
        Insert: {
          assumptions?: Json | null
          attributes?: Json | null
          category: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_icf_candidate?: boolean | null
          notes?: string | null
          ordem?: number | null
          organization_id: string
          quantity?: number | null
          reference?: string | null
          review_required?: boolean | null
          session_id: string
          source_type: Database["public"]["Enums"]["icf_source_type"]
          unit?: string | null
          updated_at?: string | null
          user_confirmed?: boolean | null
        }
        Update: {
          assumptions?: Json | null
          attributes?: Json | null
          category?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_icf_candidate?: boolean | null
          notes?: string | null
          ordem?: number | null
          organization_id?: string
          quantity?: number | null
          reference?: string | null
          review_required?: boolean | null
          session_id?: string
          source_type?: Database["public"]["Enums"]["icf_source_type"]
          unit?: string | null
          updated_at?: string | null
          user_confirmed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "icf_assistant_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "icf_assistant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_assistant_sessions: {
        Row: {
          analysis_mode: string
          axia_audit: Json | null
          calibration_confidence: string | null
          calibration_declared_scale: string | null
          calibration_distance_px: number | null
          calibration_method: string | null
          calibration_override: boolean | null
          calibration_page: number | null
          calibration_point_a: Json | null
          calibration_point_b: Json | null
          calibration_real_distance_m: number | null
          classe_aco: string | null
          classe_betao: string | null
          created_at: string | null
          current_step: number | null
          espessura_nucleo: number | null
          file_path: string | null
          foundation_option: string | null
          foundation_params: Json | null
          foundations_found: boolean | null
          id: string
          notes: string | null
          obra_id: string | null
          organization_id: string
          plan_kind: Database["public"]["Enums"]["icf_assistant_plan_kind"]
          scale_m_per_px: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_mode?: string
          axia_audit?: Json | null
          calibration_confidence?: string | null
          calibration_declared_scale?: string | null
          calibration_distance_px?: number | null
          calibration_method?: string | null
          calibration_override?: boolean | null
          calibration_page?: number | null
          calibration_point_a?: Json | null
          calibration_point_b?: Json | null
          calibration_real_distance_m?: number | null
          classe_aco?: string | null
          classe_betao?: string | null
          created_at?: string | null
          current_step?: number | null
          espessura_nucleo?: number | null
          file_path?: string | null
          foundation_option?: string | null
          foundation_params?: Json | null
          foundations_found?: boolean | null
          id?: string
          notes?: string | null
          obra_id?: string | null
          organization_id: string
          plan_kind?: Database["public"]["Enums"]["icf_assistant_plan_kind"]
          scale_m_per_px?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_mode?: string
          axia_audit?: Json | null
          calibration_confidence?: string | null
          calibration_declared_scale?: string | null
          calibration_distance_px?: number | null
          calibration_method?: string | null
          calibration_override?: boolean | null
          calibration_page?: number | null
          calibration_point_a?: Json | null
          calibration_point_b?: Json | null
          calibration_real_distance_m?: number | null
          classe_aco?: string | null
          classe_betao?: string | null
          created_at?: string | null
          current_step?: number | null
          espessura_nucleo?: number | null
          file_path?: string | null
          foundation_option?: string | null
          foundation_params?: Json | null
          foundations_found?: boolean | null
          id?: string
          notes?: string | null
          obra_id?: string | null
          organization_id?: string
          plan_kind?: Database["public"]["Enums"]["icf_assistant_plan_kind"]
          scale_m_per_px?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      icf_audit_log: {
        Row: {
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          empresa_id: string
          entidade_id: string | null
          entidade_tipo: string
          evento: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string
          entidade_id?: string | null
          entidade_tipo: string
          evento: string
          id?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string
          entidade_id?: string | null
          entidade_tipo?: string
          evento?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      icf_block_library: {
        Row: {
          can_be_cut: boolean
          category: string
          code: string
          created_at: string
          drawing_file: string | null
          empresa_id: string | null
          height_mm: number | null
          id: string
          length_mm: number | null
          module_mm: number | null
          name: string
          notes: string | null
          system_seed: boolean
          thickness_mm: number | null
          updated_at: string
          use_case: string | null
        }
        Insert: {
          can_be_cut?: boolean
          category: string
          code: string
          created_at?: string
          drawing_file?: string | null
          empresa_id?: string | null
          height_mm?: number | null
          id?: string
          length_mm?: number | null
          module_mm?: number | null
          name: string
          notes?: string | null
          system_seed?: boolean
          thickness_mm?: number | null
          updated_at?: string
          use_case?: string | null
        }
        Update: {
          can_be_cut?: boolean
          category?: string
          code?: string
          created_at?: string
          drawing_file?: string | null
          empresa_id?: string | null
          height_mm?: number | null
          id?: string
          length_mm?: number | null
          module_mm?: number | null
          name?: string
          notes?: string | null
          system_seed?: boolean
          thickness_mm?: number | null
          updated_at?: string
          use_case?: string | null
        }
        Relationships: []
      }
      icf_budget_audit_log: {
        Row: {
          config_snapshot: Json
          configuracao_id: string
          created_at: string
          error_message: string | null
          id: string
          obra_id: string
          orcamento_id: string | null
          parametros: Json
          resumo_snapshot: Json
          status: string
          subtotal_custo: number
          total_artigos: number
          total_capitulos: number
          user_id: string
        }
        Insert: {
          config_snapshot?: Json
          configuracao_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          obra_id: string
          orcamento_id?: string | null
          parametros?: Json
          resumo_snapshot?: Json
          status?: string
          subtotal_custo?: number
          total_artigos?: number
          total_capitulos?: number
          user_id: string
        }
        Update: {
          config_snapshot?: Json
          configuracao_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          obra_id?: string
          orcamento_id?: string | null
          parametros?: Json
          resumo_snapshot?: Json
          status?: string
          subtotal_custo?: number
          total_artigos?: number
          total_capitulos?: number
          user_id?: string
        }
        Relationships: []
      }
      icf_budget_chapter_templates: {
        Row: {
          capitulos: Json
          created_at: string
          descricao: string | null
          id: string
          is_default: boolean
          is_global: boolean
          nome: string
          total_referencia: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          capitulos?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          is_default?: boolean
          is_global?: boolean
          nome: string
          total_referencia?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          capitulos?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          is_default?: boolean
          is_global?: boolean
          nome?: string
          total_referencia?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      icf_budget_presets: {
        Row: {
          created_at: string
          custos_indiretos_percent: number
          id: string
          is_default: boolean
          iva_percent: number
          margem_lucro: number
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custos_indiretos_percent?: number
          id?: string
          is_default?: boolean
          iva_percent?: number
          margem_lucro?: number
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custos_indiretos_percent?: number
          id?: string
          is_default?: boolean
          iva_percent?: number
          margem_lucro?: number
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      icf_budget_snapshots: {
        Row: {
          chapters_snapshot: Json
          config_snapshot: Json
          configuracao_id: string
          created_at: string
          id: string
          obra_id: string
          orcamento_id: string
          parametros: Json
          resumo_snapshot: Json
          user_id: string
        }
        Insert: {
          chapters_snapshot?: Json
          config_snapshot?: Json
          configuracao_id: string
          created_at?: string
          id?: string
          obra_id: string
          orcamento_id: string
          parametros?: Json
          resumo_snapshot?: Json
          user_id: string
        }
        Update: {
          chapters_snapshot?: Json
          config_snapshot?: Json
          configuracao_id?: string
          created_at?: string
          id?: string
          obra_id?: string
          orcamento_id?: string
          parametros?: Json
          resumo_snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      icf_calculation_constants: {
        Row: {
          abobadilhas_por_m2: number
          aco_kg_por_m3_paredes: number
          altura_media_sapata_m: number
          created_at: string
          espacadores_por_painel: number
          fator_cantos_c3: number
          fator_cantos_c4: number
          fator_topos: number
          id: string
          painel_area_m2: number
          trelicas_ml_por_m2: number
          updated_at: string
          user_id: string
          vaos_por_padieira: number
        }
        Insert: {
          abobadilhas_por_m2?: number
          aco_kg_por_m3_paredes?: number
          altura_media_sapata_m?: number
          created_at?: string
          espacadores_por_painel?: number
          fator_cantos_c3?: number
          fator_cantos_c4?: number
          fator_topos?: number
          id?: string
          painel_area_m2?: number
          trelicas_ml_por_m2?: number
          updated_at?: string
          user_id: string
          vaos_por_padieira?: number
        }
        Update: {
          abobadilhas_por_m2?: number
          aco_kg_por_m3_paredes?: number
          altura_media_sapata_m?: number
          created_at?: string
          espacadores_por_painel?: number
          fator_cantos_c3?: number
          fator_cantos_c4?: number
          fator_topos?: number
          id?: string
          painel_area_m2?: number
          trelicas_ml_por_m2?: number
          updated_at?: string
          user_id?: string
          vaos_por_padieira?: number
        }
        Relationships: []
      }
      icf_configuracoes: {
        Row: {
          altura_piso_padrao: number | null
          ativo: boolean
          classe_aco: string
          classe_betao: string
          created_at: string
          created_by: string | null
          empresa_id: string
          espessura_nucleo: number
          fator_perdas: number
          fator_transpasse: number
          id: string
          nome: string
          notas_tecnicas: string | null
          obra_id: string
          recobrimento_mm: number | null
          regras_desconto_vaos: Json | null
          status: string
          tipologia_fundacao: string | null
          tipologia_laje: string | null
          updated_at: string
          versao: number
        }
        Insert: {
          altura_piso_padrao?: number | null
          ativo?: boolean
          classe_aco?: string
          classe_betao?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          espessura_nucleo?: number
          fator_perdas?: number
          fator_transpasse?: number
          id?: string
          nome: string
          notas_tecnicas?: string | null
          obra_id: string
          recobrimento_mm?: number | null
          regras_desconto_vaos?: Json | null
          status?: string
          tipologia_fundacao?: string | null
          tipologia_laje?: string | null
          updated_at?: string
          versao?: number
        }
        Update: {
          altura_piso_padrao?: number | null
          ativo?: boolean
          classe_aco?: string
          classe_betao?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          espessura_nucleo?: number
          fator_perdas?: number
          fator_transpasse?: number
          id?: string
          nome?: string
          notas_tecnicas?: string | null
          obra_id?: string
          recobrimento_mm?: number | null
          regras_desconto_vaos?: Json | null
          status?: string
          tipologia_fundacao?: string | null
          tipologia_laje?: string | null
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "icf_configuracoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_fundacoes: {
        Row: {
          aco_estimado_kg: number | null
          altura: number
          comprimento: number
          configuracao_id: string
          created_at: string
          empresa_id: string
          id: string
          largura: number
          obra_id: string
          observacoes: string | null
          quantidade: number
          referencia: string | null
          tensao_admissivel_terreno: number | null
          tensao_calculo: number | null
          tipo_fundacao: string
          updated_at: string
          volume_betao: number | null
        }
        Insert: {
          aco_estimado_kg?: number | null
          altura?: number
          comprimento?: number
          configuracao_id: string
          created_at?: string
          empresa_id?: string
          id?: string
          largura?: number
          obra_id: string
          observacoes?: string | null
          quantidade?: number
          referencia?: string | null
          tensao_admissivel_terreno?: number | null
          tensao_calculo?: number | null
          tipo_fundacao?: string
          updated_at?: string
          volume_betao?: number | null
        }
        Update: {
          aco_estimado_kg?: number | null
          altura?: number
          comprimento?: number
          configuracao_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          largura?: number
          obra_id?: string
          observacoes?: string | null
          quantidade?: number
          referencia?: string | null
          tensao_admissivel_terreno?: number | null
          tensao_calculo?: number | null
          tipo_fundacao?: string
          updated_at?: string
          volume_betao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "icf_fundacoes_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "icf_configuracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_fundacoes_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "icf_resumo_obra"
            referencedColumns: ["configuracao_id"]
          },
          {
            foreignKeyName: "icf_fundacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_lajes: {
        Row: {
          aco_estimado_kg: number | null
          area: number
          configuracao_id: string
          created_at: string
          empresa_id: string
          espessura_total: number | null
          id: string
          obra_id: string
          observacoes: string | null
          peso_proprio_kn_m2: number | null
          piso: string | null
          referencia: string | null
          tipologia_laje: string | null
          updated_at: string
          volume: number | null
        }
        Insert: {
          aco_estimado_kg?: number | null
          area: number
          configuracao_id: string
          created_at?: string
          empresa_id?: string
          espessura_total?: number | null
          id?: string
          obra_id: string
          observacoes?: string | null
          peso_proprio_kn_m2?: number | null
          piso?: string | null
          referencia?: string | null
          tipologia_laje?: string | null
          updated_at?: string
          volume?: number | null
        }
        Update: {
          aco_estimado_kg?: number | null
          area?: number
          configuracao_id?: string
          created_at?: string
          empresa_id?: string
          espessura_total?: number | null
          id?: string
          obra_id?: string
          observacoes?: string | null
          peso_proprio_kn_m2?: number | null
          piso?: string | null
          referencia?: string | null
          tipologia_laje?: string | null
          updated_at?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "icf_lajes_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "icf_configuracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_lajes_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "icf_resumo_obra"
            referencedColumns: ["configuracao_id"]
          },
          {
            foreignKeyName: "icf_lajes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_panos_parede: {
        Row: {
          altura_util: number
          area_bruta: number | null
          area_liquida: number | null
          area_vaos: number
          armadura_horizontal: string | null
          armadura_vertical: string | null
          comprimento: number
          configuracao_id: string
          created_at: string
          empresa_id: string
          espessura_nucleo: number
          fator_cumprimento: number
          id: string
          obra_id: string
          observacoes: string | null
          ordem: number | null
          piso_final: string | null
          piso_inicial: string | null
          referencia: string
          reforco_transversal: string | null
          tipo_armadura: string | null
          updated_at: string
          volume_betao: number | null
        }
        Insert: {
          altura_util: number
          area_bruta?: number | null
          area_liquida?: number | null
          area_vaos?: number
          armadura_horizontal?: string | null
          armadura_vertical?: string | null
          comprimento: number
          configuracao_id: string
          created_at?: string
          empresa_id?: string
          espessura_nucleo?: number
          fator_cumprimento?: number
          id?: string
          obra_id: string
          observacoes?: string | null
          ordem?: number | null
          piso_final?: string | null
          piso_inicial?: string | null
          referencia: string
          reforco_transversal?: string | null
          tipo_armadura?: string | null
          updated_at?: string
          volume_betao?: number | null
        }
        Update: {
          altura_util?: number
          area_bruta?: number | null
          area_liquida?: number | null
          area_vaos?: number
          armadura_horizontal?: string | null
          armadura_vertical?: string | null
          comprimento?: number
          configuracao_id?: string
          created_at?: string
          empresa_id?: string
          espessura_nucleo?: number
          fator_cumprimento?: number
          id?: string
          obra_id?: string
          observacoes?: string | null
          ordem?: number | null
          piso_final?: string | null
          piso_inicial?: string | null
          referencia?: string
          reforco_transversal?: string | null
          tipo_armadura?: string | null
          updated_at?: string
          volume_betao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "icf_panos_parede_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "icf_configuracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_panos_parede_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "icf_resumo_obra"
            referencedColumns: ["configuracao_id"]
          },
          {
            foreignKeyName: "icf_panos_parede_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_project_analyses: {
        Row: {
          analysis_mode: string
          axia_confidence: number | null
          axia_summary: Json | null
          configuracao_id: string | null
          created_at: string
          descricao: string | null
          empresa_id: string
          espessura_nucleo_mm: number | null
          id: string
          obra_id: string | null
          sistema_icf: string | null
          status: string
          titulo: string
          totals_snapshot: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_mode?: string
          axia_confidence?: number | null
          axia_summary?: Json | null
          configuracao_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          espessura_nucleo_mm?: number | null
          id?: string
          obra_id?: string | null
          sistema_icf?: string | null
          status?: string
          titulo: string
          totals_snapshot?: Json | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          analysis_mode?: string
          axia_confidence?: number | null
          axia_summary?: Json | null
          configuracao_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          espessura_nucleo_mm?: number | null
          id?: string
          obra_id?: string | null
          sistema_icf?: string | null
          status?: string
          titulo?: string
          totals_snapshot?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "icf_project_analyses_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "icf_configuracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_project_analyses_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "icf_resumo_obra"
            referencedColumns: ["configuracao_id"]
          },
          {
            foreignKeyName: "icf_project_analyses_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_project_checklist_items: {
        Row: {
          analysis_id: string
          created_at: string
          empresa_id: string
          id: string
          item_key: string
          item_label: string
          notes: string | null
          ordem: number
          related_document_id: string | null
          required: boolean
          status: string
          updated_at: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          empresa_id?: string
          id?: string
          item_key: string
          item_label: string
          notes?: string | null
          ordem?: number
          related_document_id?: string | null
          required?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          item_key?: string
          item_label?: string
          notes?: string | null
          ordem?: number
          related_document_id?: string | null
          required?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "icf_project_checklist_items_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "icf_project_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_project_checklist_items_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "icf_project_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_project_documents: {
        Row: {
          analysis_id: string
          axia_category: string | null
          axia_confidence: number | null
          axia_summary: string | null
          created_at: string
          empresa_id: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          page_count: number | null
          size_bytes: number | null
          status: string
          updated_at: string
          user_category: string | null
        }
        Insert: {
          analysis_id: string
          axia_category?: string | null
          axia_confidence?: number | null
          axia_summary?: string | null
          created_at?: string
          empresa_id?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          page_count?: number | null
          size_bytes?: number | null
          status?: string
          updated_at?: string
          user_category?: string | null
        }
        Update: {
          analysis_id?: string
          axia_category?: string | null
          axia_confidence?: number | null
          axia_summary?: string | null
          created_at?: string
          empresa_id?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          page_count?: number | null
          size_bytes?: number | null
          status?: string
          updated_at?: string
          user_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icf_project_documents_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "icf_project_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_project_issues: {
        Row: {
          analysis_id: string
          category: string
          created_at: string
          empresa_id: string
          id: string
          message: string | null
          related_document_id: string | null
          related_panel_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          analysis_id: string
          category: string
          created_at?: string
          empresa_id?: string
          id?: string
          message?: string | null
          related_document_id?: string | null
          related_panel_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          analysis_id?: string
          category?: string
          created_at?: string
          empresa_id?: string
          id?: string
          message?: string | null
          related_document_id?: string | null
          related_panel_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "icf_project_issues_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "icf_project_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_project_issues_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "icf_project_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_project_issues_related_panel_id_fkey"
            columns: ["related_panel_id"]
            isOneToOne: false
            referencedRelation: "icf_wall_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_vaos: {
        Row: {
          altura: number
          area_total: number | null
          created_at: string
          empresa_id: string
          id: string
          largura: number
          observacoes: string | null
          pano_id: string
          quantidade: number
          tipo_vao: string | null
        }
        Insert: {
          altura: number
          area_total?: number | null
          created_at?: string
          empresa_id?: string
          id?: string
          largura: number
          observacoes?: string | null
          pano_id: string
          quantidade?: number
          tipo_vao?: string | null
        }
        Update: {
          altura?: number
          area_total?: number | null
          created_at?: string
          empresa_id?: string
          id?: string
          largura?: number
          observacoes?: string | null
          pano_id?: string
          quantidade?: number
          tipo_vao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icf_vaos_pano_id_fkey"
            columns: ["pano_id"]
            isOneToOne: false
            referencedRelation: "icf_panos_parede"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_wall_panels: {
        Row: {
          analysis_id: string | null
          composition_result: Json | null
          confidence: number | null
          configuracao_id: string | null
          created_at: string
          created_by: string | null
          empresa_id: string
          floor: string | null
          gross_area_m2: number | null
          height_m: number
          id: string
          label: string
          length_m: number
          net_area_m2: number | null
          notes: string | null
          obra_id: string
          openings: Json
          room: string | null
          selected_block_code: string
          source: string
          source_pano_id: string | null
          status: string
          thickness_mm: number
          updated_at: string
        }
        Insert: {
          analysis_id?: string | null
          composition_result?: Json | null
          confidence?: number | null
          configuracao_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          floor?: string | null
          gross_area_m2?: number | null
          height_m: number
          id?: string
          label: string
          length_m: number
          net_area_m2?: number | null
          notes?: string | null
          obra_id: string
          openings?: Json
          room?: string | null
          selected_block_code: string
          source?: string
          source_pano_id?: string | null
          status?: string
          thickness_mm: number
          updated_at?: string
        }
        Update: {
          analysis_id?: string | null
          composition_result?: Json | null
          confidence?: number | null
          configuracao_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          floor?: string | null
          gross_area_m2?: number | null
          height_m?: number
          id?: string
          label?: string
          length_m?: number
          net_area_m2?: number | null
          notes?: string | null
          obra_id?: string
          openings?: Json
          room?: string | null
          selected_block_code?: string
          source?: string
          source_pano_id?: string | null
          status?: string
          thickness_mm?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "icf_wall_panels_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "icf_project_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_wall_panels_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "icf_configuracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_wall_panels_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "icf_resumo_obra"
            referencedColumns: ["configuracao_id"]
          },
          {
            foreignKeyName: "icf_wall_panels_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_wall_panels_source_pano_id_fkey"
            columns: ["source_pano_id"]
            isOneToOne: false
            referencedRelation: "icf_panos_parede"
            referencedColumns: ["id"]
          },
        ]
      }
      installations_catalog_items: {
        Row: {
          base_qty_type: string
          cost_labor: number
          cost_material: number
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          margin_percent: number
          name: string
          profile: string
          specialty: string
          unit: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_qty_type?: string
          cost_labor?: number
          cost_material?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          margin_percent?: number
          name: string
          profile?: string
          specialty: string
          unit?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_qty_type?: string
          cost_labor?: number
          cost_material?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          margin_percent?: number
          name?: string
          profile?: string
          specialty?: string
          unit?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      installations_coefficients: {
        Row: {
          coefficient_key: string
          created_at: string
          description: string | null
          id: string
          specialty: string
          updated_at: string
          user_id: string
          value_numeric: number
        }
        Insert: {
          coefficient_key: string
          created_at?: string
          description?: string | null
          id?: string
          specialty: string
          updated_at?: string
          user_id: string
          value_numeric: number
        }
        Update: {
          coefficient_key?: string
          created_at?: string
          description?: string | null
          id?: string
          specialty?: string
          updated_at?: string
          user_id?: string
          value_numeric?: number
        }
        Relationships: []
      }
      installations_links: {
        Row: {
          budget_id: string | null
          budget_item_ids: Json | null
          created_at: string
          id: string
          package_id: string
          schedule_task_ids: Json | null
          user_id: string
        }
        Insert: {
          budget_id?: string | null
          budget_item_ids?: Json | null
          created_at?: string
          id?: string
          package_id: string
          schedule_task_ids?: Json | null
          user_id: string
        }
        Update: {
          budget_id?: string | null
          budget_item_ids?: Json | null
          created_at?: string
          id?: string
          package_id?: string
          schedule_task_ids?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installations_links_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_links_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "installations_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      installations_logs: {
        Row: {
          action: string
          created_at: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          package_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          package_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          package_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installations_logs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "installations_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      installations_package_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          id: string
          manually_adjusted: boolean
          margin_percent: number
          name: string
          package_id: string
          qty: number
          total_cost: number
          unit: string
          unit_cost_labor: number
          unit_cost_material: number
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          id?: string
          manually_adjusted?: boolean
          margin_percent?: number
          name: string
          package_id: string
          qty?: number
          total_cost?: number
          unit?: string
          unit_cost_labor?: number
          unit_cost_material?: number
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          id?: string
          manually_adjusted?: boolean
          margin_percent?: number
          name?: string
          package_id?: string
          qty?: number
          total_cost?: number
          unit?: string
          unit_cost_labor?: number
          unit_cost_material?: number
        }
        Relationships: [
          {
            foreignKeyName: "installations_package_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "installations_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "installations_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      installations_packages: {
        Row: {
          area_m2: number
          bathrooms: number
          bedrooms: number
          complexity: string
          created_at: string
          equipamentos_extra: Json | null
          extra_rooms: number
          has_bomba_calor: boolean
          has_laundry: boolean
          has_paineis_solares: boolean
          has_piso_radiante: boolean
          has_termoacumulador: boolean
          id: string
          kitchen_count: number
          linear_m_estimated: number
          linear_m_final: number | null
          obra_id: string
          points_estimated: number
          points_final: number | null
          profile: string
          progress_percent: number
          specialty: string
          status: string
          total_cost_estimated: number
          typology: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_m2?: number
          bathrooms?: number
          bedrooms?: number
          complexity?: string
          created_at?: string
          equipamentos_extra?: Json | null
          extra_rooms?: number
          has_bomba_calor?: boolean
          has_laundry?: boolean
          has_paineis_solares?: boolean
          has_piso_radiante?: boolean
          has_termoacumulador?: boolean
          id?: string
          kitchen_count?: number
          linear_m_estimated?: number
          linear_m_final?: number | null
          obra_id: string
          points_estimated?: number
          points_final?: number | null
          profile?: string
          progress_percent?: number
          specialty: string
          status?: string
          total_cost_estimated?: number
          typology?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_m2?: number
          bathrooms?: number
          bedrooms?: number
          complexity?: string
          created_at?: string
          equipamentos_extra?: Json | null
          extra_rooms?: number
          has_bomba_calor?: boolean
          has_laundry?: boolean
          has_paineis_solares?: boolean
          has_piso_radiante?: boolean
          has_termoacumulador?: boolean
          id?: string
          kitchen_count?: number
          linear_m_estimated?: number
          linear_m_final?: number | null
          obra_id?: string
          points_estimated?: number
          points_final?: number | null
          profile?: string
          progress_percent?: number
          specialty?: string
          status?: string
          total_cost_estimated?: number
          typology?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installations_packages_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "livro_obra_fiscal_id_fkey"
            columns: ["fiscal_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
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
            foreignKeyName: "livro_obra_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
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
      matriz_capitulos_padrao: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          ordem: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      mce_approvals: {
        Row: {
          assigned_role: string | null
          assigned_user_id: string | null
          comment: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decided_by_name: string | null
          decision: Database["public"]["Enums"]["mce_approval_decision"]
          id: string
          level: Database["public"]["Enums"]["mce_approval_level"]
          level_order: number
          mce_id: string
          organization_id: string
          required: boolean
          signature: string | null
          updated_at: string
          validated_amount: number | null
        }
        Insert: {
          assigned_role?: string | null
          assigned_user_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_by_name?: string | null
          decision?: Database["public"]["Enums"]["mce_approval_decision"]
          id?: string
          level: Database["public"]["Enums"]["mce_approval_level"]
          level_order: number
          mce_id: string
          organization_id: string
          required?: boolean
          signature?: string | null
          updated_at?: string
          validated_amount?: number | null
        }
        Update: {
          assigned_role?: string | null
          assigned_user_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_by_name?: string | null
          decision?: Database["public"]["Enums"]["mce_approval_decision"]
          id?: string
          level?: Database["public"]["Enums"]["mce_approval_level"]
          level_order?: number
          mce_id?: string
          organization_id?: string
          required?: boolean
          signature?: string | null
          updated_at?: string
          validated_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mce_approvals_mce_id_fkey"
            columns: ["mce_id"]
            isOneToOne: false
            referencedRelation: "mce_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      mce_attachments: {
        Row: {
          attachment_type: string | null
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          mce_id: string
          mce_supplier_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          mce_id: string
          mce_supplier_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          mce_id?: string
          mce_supplier_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mce_attachments_mce_id_fkey"
            columns: ["mce_id"]
            isOneToOne: false
            referencedRelation: "mce_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mce_attachments_mce_supplier_id_fkey"
            columns: ["mce_supplier_id"]
            isOneToOne: false
            referencedRelation: "mce_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      mce_items: {
        Row: {
          budget_line_id: string | null
          created_at: string
          dry_budget_quantity: number
          dry_budget_total: number
          dry_budget_unit_price: number
          excluded: boolean
          id: string
          mce_id: string
          notes: string | null
          quantity: number
          sort_order: number
          specification: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          budget_line_id?: string | null
          created_at?: string
          dry_budget_quantity?: number
          dry_budget_total?: number
          dry_budget_unit_price?: number
          excluded?: boolean
          id?: string
          mce_id: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          specification?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          budget_line_id?: string | null
          created_at?: string
          dry_budget_quantity?: number
          dry_budget_total?: number
          dry_budget_unit_price?: number
          excluded?: boolean
          id?: string
          mce_id?: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          specification?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mce_items_mce_id_fkey"
            columns: ["mce_id"]
            isOneToOne: false
            referencedRelation: "mce_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      mce_maps: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          awarded_at: string | null
          awarded_value: number
          axia_alerts: Json | null
          axia_summary: string | null
          budget_line_id: string | null
          budget_version_id: string | null
          category: Database["public"]["Enums"]["mce_category"] | null
          category_label: string | null
          closed_at: string | null
          contractual_reference: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          date_comparativo: string | null
          date_contrato: string | null
          date_fornecimento: string | null
          description: string | null
          dry_budget_total: number
          gain_loss_percentage: number
          gain_loss_value: number
          id: string
          mce_number: string | null
          obra_id: string
          observations: string | null
          organization_id: string
          project_manager_id: string | null
          project_manager_name: string | null
          selected_supplier_id: string | null
          selected_supplier_total: number
          source_budget_id: string | null
          status: Database["public"]["Enums"]["mce_status"]
          technical_requirements: string | null
          title: string
          updated_at: string
          user_id: string
          work_location: string | null
          work_lot: string | null
          work_name: string | null
          work_number: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          awarded_at?: string | null
          awarded_value?: number
          axia_alerts?: Json | null
          axia_summary?: string | null
          budget_line_id?: string | null
          budget_version_id?: string | null
          category?: Database["public"]["Enums"]["mce_category"] | null
          category_label?: string | null
          closed_at?: string | null
          contractual_reference?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          date_comparativo?: string | null
          date_contrato?: string | null
          date_fornecimento?: string | null
          description?: string | null
          dry_budget_total?: number
          gain_loss_percentage?: number
          gain_loss_value?: number
          id?: string
          mce_number?: string | null
          obra_id: string
          observations?: string | null
          organization_id: string
          project_manager_id?: string | null
          project_manager_name?: string | null
          selected_supplier_id?: string | null
          selected_supplier_total?: number
          source_budget_id?: string | null
          status?: Database["public"]["Enums"]["mce_status"]
          technical_requirements?: string | null
          title?: string
          updated_at?: string
          user_id: string
          work_location?: string | null
          work_lot?: string | null
          work_name?: string | null
          work_number?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          awarded_at?: string | null
          awarded_value?: number
          axia_alerts?: Json | null
          axia_summary?: string | null
          budget_line_id?: string | null
          budget_version_id?: string | null
          category?: Database["public"]["Enums"]["mce_category"] | null
          category_label?: string | null
          closed_at?: string | null
          contractual_reference?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          date_comparativo?: string | null
          date_contrato?: string | null
          date_fornecimento?: string | null
          description?: string | null
          dry_budget_total?: number
          gain_loss_percentage?: number
          gain_loss_value?: number
          id?: string
          mce_number?: string | null
          obra_id?: string
          observations?: string | null
          organization_id?: string
          project_manager_id?: string | null
          project_manager_name?: string | null
          selected_supplier_id?: string | null
          selected_supplier_total?: number
          source_budget_id?: string | null
          status?: Database["public"]["Enums"]["mce_status"]
          technical_requirements?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          work_location?: string | null
          work_lot?: string | null
          work_name?: string | null
          work_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mce_maps_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mce_maps_source_budget_id_fkey"
            columns: ["source_budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      mce_supplier_item_prices: {
        Row: {
          created_at: string
          id: string
          mce_id: string
          mce_item_id: string
          mce_supplier_id: string
          notes: string | null
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mce_id: string
          mce_item_id: string
          mce_supplier_id: string
          notes?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mce_id?: string
          mce_item_id?: string
          mce_supplier_id?: string
          notes?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mce_supplier_item_prices_mce_id_fkey"
            columns: ["mce_id"]
            isOneToOne: false
            referencedRelation: "mce_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mce_supplier_item_prices_mce_item_id_fkey"
            columns: ["mce_item_id"]
            isOneToOne: false
            referencedRelation: "mce_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mce_supplier_item_prices_mce_supplier_id_fkey"
            columns: ["mce_supplier_id"]
            isOneToOne: false
            referencedRelation: "mce_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      mce_suppliers: {
        Row: {
          commercial_observations: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_selected: boolean
          license_number: string | null
          mce_id: string
          nif: string | null
          payment_terms: string | null
          phone: string | null
          position: number
          proposal_status: Database["public"]["Enums"]["mce_proposal_status"]
          proposal_total: number
          retention: string | null
          selection_reason: string | null
          supplier_id: string | null
          supplier_name_snapshot: string | null
          updated_at: string
        }
        Insert: {
          commercial_observations?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_selected?: boolean
          license_number?: string | null
          mce_id: string
          nif?: string | null
          payment_terms?: string | null
          phone?: string | null
          position?: number
          proposal_status?: Database["public"]["Enums"]["mce_proposal_status"]
          proposal_total?: number
          retention?: string | null
          selection_reason?: string | null
          supplier_id?: string | null
          supplier_name_snapshot?: string | null
          updated_at?: string
        }
        Update: {
          commercial_observations?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_selected?: boolean
          license_number?: string | null
          mce_id?: string
          nif?: string | null
          payment_terms?: string | null
          phone?: string | null
          position?: number
          proposal_status?: Database["public"]["Enums"]["mce_proposal_status"]
          proposal_total?: number
          retention?: string | null
          selection_reason?: string | null
          supplier_id?: string | null
          supplier_name_snapshot?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mce_suppliers_mce_id_fkey"
            columns: ["mce_id"]
            isOneToOne: false
            referencedRelation: "mce_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      member_module_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_update: boolean
          can_view: boolean
          id: string
          member_id: string
          module_code: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          id?: string
          member_id: string
          module_code: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          id?: string
          member_id?: string
          module_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_module_permissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_project_access: {
        Row: {
          access_level: string
          id: string
          member_id: string
          obra_id: string
        }
        Insert: {
          access_level?: string
          id?: string
          member_id: string
          obra_id: string
        }
        Update: {
          access_level?: string
          id?: string
          member_id?: string
          obra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_project_access_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_project_access_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_trusted_devices: {
        Row: {
          created_at: string
          device_label: string | null
          device_token_hash: string
          expires_at: string
          id: string
          last_used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          device_token_hash: string
          expires_at: string
          id?: string
          last_used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          device_token_hash?: string
          expires_at?: string
          id?: string
          last_used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      migrated_users: {
        Row: {
          created_at: string
          email: string
          email_sent_at: string | null
          empresa: string | null
          error_message: string | null
          id: string
          migrated_at: string | null
          nif: string | null
          nome: string | null
          status: string
          telefone: string | null
          updated_at: string
          v1_user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_sent_at?: string | null
          empresa?: string | null
          error_message?: string | null
          id?: string
          migrated_at?: string | null
          nif?: string | null
          nome?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          v1_user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_sent_at?: string | null
          empresa?: string | null
          error_message?: string | null
          id?: string
          migrated_at?: string | null
          nif?: string | null
          nome?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          v1_user_id?: string | null
        }
        Relationships: []
      }
      notas_legais_fiscais: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          obrigatoria: boolean
          ordem: number
          referencia_legal: string | null
          regime_id: string
          texto: string
          texto_curto: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          obrigatoria?: boolean
          ordem?: number
          referencia_legal?: string | null
          regime_id: string
          texto: string
          texto_curto?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          obrigatoria?: boolean
          ordem?: number
          referencia_legal?: string | null
          regime_id?: string
          texto?: string
          texto_curto?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_legais_fiscais_regime_id_fkey"
            columns: ["regime_id"]
            isOneToOne: false
            referencedRelation: "regimes_fiscais"
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
      obra_purchases: {
        Row: {
          budget_version_id: string | null
          budget_version_item_id: string | null
          cost_center_id: string | null
          cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          created_at: string
          description: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          obra_id: string | null
          organization_id: string | null
          package_id: string | null
          quantity: number
          source_budget_id: string | null
          status: string
          supplier_id: string | null
          total_amount: number
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_version_id?: string | null
          budget_version_item_id?: string | null
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          description: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          obra_id?: string | null
          organization_id?: string | null
          package_id?: string | null
          quantity?: number
          source_budget_id?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_version_id?: string | null
          budget_version_item_id?: string | null
          cost_center_id?: string | null
          cost_nature?: Database["public"]["Enums"]["cost_nature"] | null
          created_at?: string
          description?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          obra_id?: string | null
          organization_id?: string | null
          package_id?: string | null
          quantity?: number
          source_budget_id?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_purchases_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_purchases_budget_version_item_id_fkey"
            columns: ["budget_version_item_id"]
            isOneToOne: false
            referencedRelation: "budget_version_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_purchases_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_purchases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "contracting_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_purchases_source_budget_id_fkey"
            columns: ["source_budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          arquivada: boolean
          cliente: string | null
          cliente_id: string | null
          cost_center_id: string | null
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
          cost_center_id?: string | null
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
          cost_center_id?: string | null
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
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_contexto_fiscal: {
        Row: {
          created_at: string
          id: string
          orcamento_id: string
          override_em: string | null
          override_justificacao: string | null
          override_manual: boolean
          override_por: string | null
          regime_id: string | null
          regra_aplicada_id: string | null
          taxa_iva: number
          tipo_cliente:
            | Database["public"]["Enums"]["tipo_cliente_fiscal"]
            | null
          tipo_obra: Database["public"]["Enums"]["tipo_obra_fiscal"] | null
          tipo_operacao:
            | Database["public"]["Enums"]["tipo_operacao_fiscal"]
            | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          orcamento_id: string
          override_em?: string | null
          override_justificacao?: string | null
          override_manual?: boolean
          override_por?: string | null
          regime_id?: string | null
          regra_aplicada_id?: string | null
          taxa_iva?: number
          tipo_cliente?:
            | Database["public"]["Enums"]["tipo_cliente_fiscal"]
            | null
          tipo_obra?: Database["public"]["Enums"]["tipo_obra_fiscal"] | null
          tipo_operacao?:
            | Database["public"]["Enums"]["tipo_operacao_fiscal"]
            | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          orcamento_id?: string
          override_em?: string | null
          override_justificacao?: string | null
          override_manual?: boolean
          override_por?: string | null
          regime_id?: string | null
          regra_aplicada_id?: string | null
          taxa_iva?: number
          tipo_cliente?:
            | Database["public"]["Enums"]["tipo_cliente_fiscal"]
            | null
          tipo_obra?: Database["public"]["Enums"]["tipo_obra_fiscal"] | null
          tipo_operacao?:
            | Database["public"]["Enums"]["tipo_operacao_fiscal"]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_contexto_fiscal_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_contexto_fiscal_regime_id_fkey"
            columns: ["regime_id"]
            isOneToOne: false
            referencedRelation: "regimes_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_contexto_fiscal_regra_aplicada_id_fkey"
            columns: ["regra_aplicada_id"]
            isOneToOne: false
            referencedRelation: "regras_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_templates_essencial: {
        Row: {
          created_at: string | null
          id: string
          itens_json: Json
          nome: string
          tipo_obra: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          itens_json?: Json
          nome: string
          tipo_obra: string
        }
        Update: {
          created_at?: string | null
          id?: string
          itens_json?: Json
          nome?: string
          tipo_obra?: string
        }
        Relationships: []
      }
      orcamentos: {
        Row: {
          client_document_mode_default: string | null
          cliente_id: string | null
          codigo: string | null
          commercial_intro_text: string | null
          commercial_notes_text: string | null
          commercial_payment_terms_text: string | null
          commercial_validity_text: string | null
          cost_center_id: string | null
          created_at: string
          custos_indiretos: Json | null
          data_criacao: string
          data_envio: string | null
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_reason: string | null
          margem_lucro: number | null
          numero_revisao: number | null
          obra_id: string | null
          observations_text: string | null
          project_metadata: Json
          revisao_de: string | null
          show_signature_block: boolean | null
          status: string
          titulo: string
          updated_at: string
          user_id: string
          valor_adjudicado: number | null
          valor_total: number | null
        }
        Insert: {
          client_document_mode_default?: string | null
          cliente_id?: string | null
          codigo?: string | null
          commercial_intro_text?: string | null
          commercial_notes_text?: string | null
          commercial_payment_terms_text?: string | null
          commercial_validity_text?: string | null
          cost_center_id?: string | null
          created_at?: string
          custos_indiretos?: Json | null
          data_criacao?: string
          data_envio?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_reason?: string | null
          margem_lucro?: number | null
          numero_revisao?: number | null
          obra_id?: string | null
          observations_text?: string | null
          project_metadata?: Json
          revisao_de?: string | null
          show_signature_block?: boolean | null
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
          valor_adjudicado?: number | null
          valor_total?: number | null
        }
        Update: {
          client_document_mode_default?: string | null
          cliente_id?: string | null
          codigo?: string | null
          commercial_intro_text?: string | null
          commercial_notes_text?: string | null
          commercial_payment_terms_text?: string | null
          commercial_validity_text?: string | null
          cost_center_id?: string | null
          created_at?: string
          custos_indiretos?: Json | null
          data_criacao?: string
          data_envio?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_reason?: string | null
          margem_lucro?: number | null
          numero_revisao?: number | null
          obra_id?: string | null
          observations_text?: string | null
          project_metadata?: Json
          revisao_de?: string | null
          show_signature_block?: boolean | null
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
          valor_adjudicado?: number | null
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
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_revisao_de_fkey"
            columns: ["revisao_de"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      org_quality_specs_catalog: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          label: string
          ordem: number
          organization_id: string
          spec_key: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          label: string
          ordem?: number
          organization_id: string
          spec_key: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          label?: string
          ordem?: number
          organization_id?: string
          spec_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_quality_specs_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          job_title: string | null
          last_seen_at: string | null
          member_status: string
          obra_scope: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          job_title?: string | null
          last_seen_at?: string | null
          member_status?: string
          obra_scope?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          job_title?: string | null
          last_seen_at?: string | null
          member_status?: string
          obra_scope?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          nif: string | null
          nome: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          nif?: string | null
          nome: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          nif?: string | null
          nome?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
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
      plan_additional_items: {
        Row: {
          budget_artigo_id: string | null
          budget_link_status: string
          category: string | null
          created_at: string
          description: string
          floor_id: string | null
          id: string
          notes: string | null
          obra_id: string
          quantity: number
          room_id: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_artigo_id?: string | null
          budget_link_status?: string
          category?: string | null
          created_at?: string
          description: string
          floor_id?: string | null
          id?: string
          notes?: string | null
          obra_id: string
          quantity?: number
          room_id?: string | null
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_artigo_id?: string | null
          budget_link_status?: string
          category?: string | null
          created_at?: string
          description?: string
          floor_id?: string | null
          id?: string
          notes?: string | null
          obra_id?: string
          quantity?: number
          room_id?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_additional_items_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "plan_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_additional_items_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_additional_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "plan_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_budget_links: {
        Row: {
          artigo_orcamento_id: string
          created_at: string
          dedupe_key: string | null
          id: string
          measurement_id: string
          orcamento_id: string
          quantity_origin: string | null
          source_id: string | null
          source_type: string | null
          user_id: string
          validation_status: string | null
        }
        Insert: {
          artigo_orcamento_id: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          measurement_id: string
          orcamento_id: string
          quantity_origin?: string | null
          source_id?: string | null
          source_type?: string | null
          user_id: string
          validation_status?: string | null
        }
        Update: {
          artigo_orcamento_id?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          measurement_id?: string
          orcamento_id?: string
          quantity_origin?: string | null
          source_id?: string | null
          source_type?: string | null
          user_id?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_budget_links_artigo_orcamento_id_fkey"
            columns: ["artigo_orcamento_id"]
            isOneToOne: false
            referencedRelation: "artigos_orcamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_budget_links_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "plan_measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_budget_links_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_calibrations: {
        Row: {
          created_at: string
          floor_id: string | null
          id: string
          page_id: string | null
          pixels_per_meter: number
          plan_import_id: string
          point1: Json
          point2: Json
          real_distance: number
          status: string
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          floor_id?: string | null
          id?: string
          page_id?: string | null
          pixels_per_meter?: number
          plan_import_id: string
          point1?: Json
          point2?: Json
          real_distance?: number
          status?: string
          unidade?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          floor_id?: string | null
          id?: string
          page_id?: string | null
          pixels_per_meter?: number
          plan_import_id?: string
          point1?: Json
          point2?: Json
          real_distance?: number
          status?: string
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_calibrations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "plan_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_calibrations_plan_import_id_fkey"
            columns: ["plan_import_id"]
            isOneToOne: false
            referencedRelation: "plan_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_electrical_circuits: {
        Row: {
          breaker_rating_a: number | null
          cable_section_mm2: number | null
          circuit_number: string | null
          created_at: string
          data_source: string
          description: string | null
          distribution_board: string | null
          id: string
          plan_import_id: string | null
          power_w: number | null
          source_sheet_subtype: string | null
          specialty_plan_id: string | null
          technical_note: string | null
          updated_at: string
          user_id: string
          voltage: number | null
        }
        Insert: {
          breaker_rating_a?: number | null
          cable_section_mm2?: number | null
          circuit_number?: string | null
          created_at?: string
          data_source?: string
          description?: string | null
          distribution_board?: string | null
          id?: string
          plan_import_id?: string | null
          power_w?: number | null
          source_sheet_subtype?: string | null
          specialty_plan_id?: string | null
          technical_note?: string | null
          updated_at?: string
          user_id: string
          voltage?: number | null
        }
        Update: {
          breaker_rating_a?: number | null
          cable_section_mm2?: number | null
          circuit_number?: string | null
          created_at?: string
          data_source?: string
          description?: string | null
          distribution_board?: string | null
          id?: string
          plan_import_id?: string | null
          power_w?: number | null
          source_sheet_subtype?: string | null
          specialty_plan_id?: string | null
          technical_note?: string | null
          updated_at?: string
          user_id?: string
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_electrical_circuits_plan_import_id_fkey"
            columns: ["plan_import_id"]
            isOneToOne: false
            referencedRelation: "plan_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_electrical_circuits_specialty_plan_id_fkey"
            columns: ["specialty_plan_id"]
            isOneToOne: false
            referencedRelation: "specialty_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_floors: {
        Row: {
          created_at: string
          default_ceiling_height: number
          id: string
          name: string
          notes: string | null
          obra_id: string
          order_index: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_ceiling_height?: number
          id?: string
          name: string
          notes?: string | null
          obra_id: string
          order_index?: number
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_ceiling_height?: number
          id?: string
          name?: string
          notes?: string | null
          obra_id?: string
          order_index?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_floors_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_imports: {
        Row: {
          budget_id: string | null
          created_at: string
          data_planta: string | null
          disciplina: string
          file_path: string
          file_type: string
          has_analysis: boolean
          id: string
          nome_ficheiro: string
          obra_id: string | null
          observacoes: string | null
          revision_number: number
          status: string
          updated_at: string
          user_id: string
          workflow_step: string
        }
        Insert: {
          budget_id?: string | null
          created_at?: string
          data_planta?: string | null
          disciplina?: string
          file_path: string
          file_type?: string
          has_analysis?: boolean
          id?: string
          nome_ficheiro: string
          obra_id?: string | null
          observacoes?: string | null
          revision_number?: number
          status?: string
          updated_at?: string
          user_id: string
          workflow_step?: string
        }
        Update: {
          budget_id?: string | null
          created_at?: string
          data_planta?: string | null
          disciplina?: string
          file_path?: string
          file_type?: string
          has_analysis?: boolean
          id?: string
          nome_ficheiro?: string
          obra_id?: string | null
          observacoes?: string | null
          revision_number?: number
          status?: string
          updated_at?: string
          user_id?: string
          workflow_step?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_imports_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_imports_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_infra_budget_links: {
        Row: {
          artigo_orcamento_id: string
          created_at: string
          id: string
          infra_item_id: string
          orcamento_id: string
          user_id: string
        }
        Insert: {
          artigo_orcamento_id: string
          created_at?: string
          id?: string
          infra_item_id: string
          orcamento_id: string
          user_id: string
        }
        Update: {
          artigo_orcamento_id?: string
          created_at?: string
          id?: string
          infra_item_id?: string
          orcamento_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_infra_budget_links_artigo_orcamento_id_fkey"
            columns: ["artigo_orcamento_id"]
            isOneToOne: false
            referencedRelation: "artigos_orcamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_infra_budget_links_infra_item_id_fkey"
            columns: ["infra_item_id"]
            isOneToOne: false
            referencedRelation: "plan_infra_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_infra_budget_links_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_infra_items: {
        Row: {
          artigo_base_id: string | null
          created_at: string
          descricao: string
          formula_origem: string | null
          id: string
          preco_unitario: number
          quantidade: number
          scenario_id: string
          unidade: string
          valor_total: number
        }
        Insert: {
          artigo_base_id?: string | null
          created_at?: string
          descricao: string
          formula_origem?: string | null
          id?: string
          preco_unitario?: number
          quantidade?: number
          scenario_id: string
          unidade?: string
          valor_total?: number
        }
        Update: {
          artigo_base_id?: string | null
          created_at?: string
          descricao?: string
          formula_origem?: string | null
          id?: string
          preco_unitario?: number
          quantidade?: number
          scenario_id?: string
          unidade?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_infra_items_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "plan_infra_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_infra_scenarios: {
        Row: {
          axia_confidence: number | null
          axia_reasoning: string | null
          created_at: string
          custo_estimado: number | null
          descricao: string | null
          id: string
          nome: string
          parametros: Json | null
          selecionado: boolean | null
          site_condition_id: string
          tipo_fundacao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          axia_confidence?: number | null
          axia_reasoning?: string | null
          created_at?: string
          custo_estimado?: number | null
          descricao?: string | null
          id?: string
          nome: string
          parametros?: Json | null
          selecionado?: boolean | null
          site_condition_id: string
          tipo_fundacao?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          axia_confidence?: number | null
          axia_reasoning?: string | null
          created_at?: string
          custo_estimado?: number | null
          descricao?: string | null
          id?: string
          nome?: string
          parametros?: Json | null
          selecionado?: boolean | null
          site_condition_id?: string
          tipo_fundacao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_infra_scenarios_site_condition_id_fkey"
            columns: ["site_condition_id"]
            isOneToOne: false
            referencedRelation: "plan_site_conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_measurement_mappings: {
        Row: {
          artigo_base_id: string | null
          capitulo_id: string | null
          coeficiente: number
          created_at: string
          estado: string
          fator_desperdicio: number
          formula_conversao: string | null
          id: string
          measurement_id: string
          unidade_artigo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artigo_base_id?: string | null
          capitulo_id?: string | null
          coeficiente?: number
          created_at?: string
          estado?: string
          fator_desperdicio?: number
          formula_conversao?: string | null
          id?: string
          measurement_id: string
          unidade_artigo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artigo_base_id?: string | null
          capitulo_id?: string | null
          coeficiente?: number
          created_at?: string
          estado?: string
          fator_desperdicio?: number
          formula_conversao?: string | null
          id?: string
          measurement_id?: string
          unidade_artigo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_measurement_mappings_artigo_base_id_fkey"
            columns: ["artigo_base_id"]
            isOneToOne: false
            referencedRelation: "base_precos_personalizada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_measurement_mappings_capitulo_id_fkey"
            columns: ["capitulo_id"]
            isOneToOne: false
            referencedRelation: "capitulos_orcamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_measurement_mappings_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "plan_measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_measurements: {
        Row: {
          action_type: string | null
          axia_notes: Json | null
          axia_status: string
          baseboard_length: number | null
          budget_artigo_id: string | null
          budget_link_status: string
          camada: string | null
          ceiling_height: number | null
          confidence: string
          coordinates: Json
          cor: string | null
          created_at: string
          demolition_volume: number | null
          estado_validacao: string
          etiqueta: string | null
          floor_id: string | null
          id: string
          material_id: string | null
          material_label: string | null
          measurement_origin: string
          observacao: string | null
          openings_area: number | null
          page_id: string | null
          plan_import_id: string
          room_id: string | null
          segment_length: number | null
          tipo: string
          unidade: string
          updated_at: string
          user_id: string
          valor_ajustado: number | null
          valor_bruto: number
          valor_final: number | null
          wall_area: number | null
          wall_thickness_cm: number | null
        }
        Insert: {
          action_type?: string | null
          axia_notes?: Json | null
          axia_status?: string
          baseboard_length?: number | null
          budget_artigo_id?: string | null
          budget_link_status?: string
          camada?: string | null
          ceiling_height?: number | null
          confidence?: string
          coordinates?: Json
          cor?: string | null
          created_at?: string
          demolition_volume?: number | null
          estado_validacao?: string
          etiqueta?: string | null
          floor_id?: string | null
          id?: string
          material_id?: string | null
          material_label?: string | null
          measurement_origin?: string
          observacao?: string | null
          openings_area?: number | null
          page_id?: string | null
          plan_import_id: string
          room_id?: string | null
          segment_length?: number | null
          tipo?: string
          unidade?: string
          updated_at?: string
          user_id: string
          valor_ajustado?: number | null
          valor_bruto?: number
          valor_final?: number | null
          wall_area?: number | null
          wall_thickness_cm?: number | null
        }
        Update: {
          action_type?: string | null
          axia_notes?: Json | null
          axia_status?: string
          baseboard_length?: number | null
          budget_artigo_id?: string | null
          budget_link_status?: string
          camada?: string | null
          ceiling_height?: number | null
          confidence?: string
          coordinates?: Json
          cor?: string | null
          created_at?: string
          demolition_volume?: number | null
          estado_validacao?: string
          etiqueta?: string | null
          floor_id?: string | null
          id?: string
          material_id?: string | null
          material_label?: string | null
          measurement_origin?: string
          observacao?: string | null
          openings_area?: number | null
          page_id?: string | null
          plan_import_id?: string
          room_id?: string | null
          segment_length?: number | null
          tipo?: string
          unidade?: string
          updated_at?: string
          user_id?: string
          valor_ajustado?: number | null
          valor_bruto?: number
          valor_final?: number | null
          wall_area?: number | null
          wall_thickness_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_measurements_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "plan_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_measurements_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "plan_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_measurements_plan_import_id_fkey"
            columns: ["plan_import_id"]
            isOneToOne: false
            referencedRelation: "plan_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_measurements_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "plan_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_openings: {
        Row: {
          altura_m: number
          created_at: string
          id: string
          largura_m: number
          observacao: string | null
          origem: string
          peitoril_m: number | null
          posicao_na_parede: Json | null
          tipo: string
          updated_at: string
          user_id: string
          wall_id: string
        }
        Insert: {
          altura_m?: number
          created_at?: string
          id?: string
          largura_m?: number
          observacao?: string | null
          origem?: string
          peitoril_m?: number | null
          posicao_na_parede?: Json | null
          tipo?: string
          updated_at?: string
          user_id: string
          wall_id: string
        }
        Update: {
          altura_m?: number
          created_at?: string
          id?: string
          largura_m?: number
          observacao?: string | null
          origem?: string
          peitoril_m?: number | null
          posicao_na_parede?: Json | null
          tipo?: string
          updated_at?: string
          user_id?: string
          wall_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_openings_wall_id_fkey"
            columns: ["wall_id"]
            isOneToOne: false
            referencedRelation: "plan_walls"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_pages: {
        Row: {
          axia_analysis: Json | null
          axia_analyzed_at: string | null
          axia_model: string | null
          axia_review_required: boolean
          axia_risk_level: string | null
          created_at: string
          floor_id: string | null
          id: string
          notes: string | null
          page_number: number
          plan_import_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          axia_analysis?: Json | null
          axia_analyzed_at?: string | null
          axia_model?: string | null
          axia_review_required?: boolean
          axia_risk_level?: string | null
          created_at?: string
          floor_id?: string | null
          id?: string
          notes?: string | null
          page_number?: number
          plan_import_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          axia_analysis?: Json | null
          axia_analyzed_at?: string | null
          axia_model?: string | null
          axia_review_required?: boolean
          axia_risk_level?: string | null
          created_at?: string
          floor_id?: string | null
          id?: string
          notes?: string | null
          page_number?: number
          plan_import_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_pages_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "plan_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_pages_plan_import_id_fkey"
            columns: ["plan_import_id"]
            isOneToOne: false
            referencedRelation: "plan_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_placed_elements: {
        Row: {
          breaker_rating_a: number | null
          cable_section_mm2: number | null
          category: string
          circuit_number: string | null
          created_at: string
          data_source: string | null
          distribution_board: string | null
          environment: string | null
          id: string
          installation_height: string | null
          is_existing: boolean | null
          note: string | null
          origin: string
          plan_import_id: string
          power_w: number | null
          quantity: number | null
          review_required: boolean | null
          room_name: string | null
          rotation: number | null
          scale: number | null
          sheet_subtype: string | null
          subcategory: string | null
          symbol_type_id: string
          technical_note: string | null
          updated_at: string
          user_id: string
          voltage: number | null
          x: number
          y: number
        }
        Insert: {
          breaker_rating_a?: number | null
          cable_section_mm2?: number | null
          category: string
          circuit_number?: string | null
          created_at?: string
          data_source?: string | null
          distribution_board?: string | null
          environment?: string | null
          id?: string
          installation_height?: string | null
          is_existing?: boolean | null
          note?: string | null
          origin?: string
          plan_import_id: string
          power_w?: number | null
          quantity?: number | null
          review_required?: boolean | null
          room_name?: string | null
          rotation?: number | null
          scale?: number | null
          sheet_subtype?: string | null
          subcategory?: string | null
          symbol_type_id: string
          technical_note?: string | null
          updated_at?: string
          user_id: string
          voltage?: number | null
          x?: number
          y?: number
        }
        Update: {
          breaker_rating_a?: number | null
          cable_section_mm2?: number | null
          category?: string
          circuit_number?: string | null
          created_at?: string
          data_source?: string | null
          distribution_board?: string | null
          environment?: string | null
          id?: string
          installation_height?: string | null
          is_existing?: boolean | null
          note?: string | null
          origin?: string
          plan_import_id?: string
          power_w?: number | null
          quantity?: number | null
          review_required?: boolean | null
          room_name?: string | null
          rotation?: number | null
          scale?: number | null
          sheet_subtype?: string | null
          subcategory?: string | null
          symbol_type_id?: string
          technical_note?: string | null
          updated_at?: string
          user_id?: string
          voltage?: number | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_placed_elements_plan_import_id_fkey"
            columns: ["plan_import_id"]
            isOneToOne: false
            referencedRelation: "plan_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_room_measurements: {
        Row: {
          created_at: string
          id: string
          measurement_id: string
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          measurement_id: string
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          measurement_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_room_measurements_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "plan_measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_room_measurements_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "plan_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_room_templates: {
        Row: {
          artigos: Json
          created_at: string
          id: string
          nome: string
          pe_direito_m: number
          tipo_compartimento: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artigos?: Json
          created_at?: string
          id?: string
          nome: string
          pe_direito_m?: number
          tipo_compartimento?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artigos?: Json
          created_at?: string
          id?: string
          nome?: string
          pe_direito_m?: number
          tipo_compartimento?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_rooms: {
        Row: {
          area_m2: number
          boundary_coords: Json
          confidence: string
          created_at: string
          estado_validacao: string
          floor_id: string | null
          id: string
          nome: string
          observacao: string | null
          origem: string
          page_id: string | null
          pe_direito_m: number
          perimetro_m: number
          plan_import_id: string
          tipo_compartimento: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_m2?: number
          boundary_coords?: Json
          confidence?: string
          created_at?: string
          estado_validacao?: string
          floor_id?: string | null
          id?: string
          nome: string
          observacao?: string | null
          origem?: string
          page_id?: string | null
          pe_direito_m?: number
          perimetro_m?: number
          plan_import_id: string
          tipo_compartimento?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_m2?: number
          boundary_coords?: Json
          confidence?: string
          created_at?: string
          estado_validacao?: string
          floor_id?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          origem?: string
          page_id?: string | null
          pe_direito_m?: number
          perimetro_m?: number
          plan_import_id?: string
          tipo_compartimento?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "plan_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_rooms_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "plan_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_rooms_plan_import_id_fkey"
            columns: ["plan_import_id"]
            isOneToOne: false
            referencedRelation: "plan_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_site_conditions: {
        Row: {
          area_implantacao_m2: number | null
          capacidade_portante_kpa: number | null
          created_at: string
          id: string
          nivel_freatico_m: number | null
          numero_pisos: number | null
          obra_id: string
          observacoes: string | null
          tipo_solo: string
          topografia: string | null
          updated_at: string
          user_id: string
          zona_sismica: string | null
        }
        Insert: {
          area_implantacao_m2?: number | null
          capacidade_portante_kpa?: number | null
          created_at?: string
          id?: string
          nivel_freatico_m?: number | null
          numero_pisos?: number | null
          obra_id: string
          observacoes?: string | null
          tipo_solo?: string
          topografia?: string | null
          updated_at?: string
          user_id: string
          zona_sismica?: string | null
        }
        Update: {
          area_implantacao_m2?: number | null
          capacidade_portante_kpa?: number | null
          created_at?: string
          id?: string
          nivel_freatico_m?: number | null
          numero_pisos?: number | null
          obra_id?: string
          observacoes?: string | null
          tipo_solo?: string
          topografia?: string | null
          updated_at?: string
          user_id?: string
          zona_sismica?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_site_conditions_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: true
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_stairs: {
        Row: {
          confidence: string
          created_at: string
          destination_floor_id: string | null
          guardrail_length_m: number | null
          handrail_length_m: number | null
          has_guardrail: boolean
          has_handrail: boolean
          id: string
          landings: Json
          largura_m: number
          notes: string | null
          origin_floor_id: string | null
          page_id: string | null
          plan_import_id: string
          riser_height_m: number
          risers_count: number
          steps_count: number
          tread_depth_m: number
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          destination_floor_id?: string | null
          guardrail_length_m?: number | null
          handrail_length_m?: number | null
          has_guardrail?: boolean
          has_handrail?: boolean
          id?: string
          landings?: Json
          largura_m?: number
          notes?: string | null
          origin_floor_id?: string | null
          page_id?: string | null
          plan_import_id: string
          riser_height_m?: number
          risers_count?: number
          steps_count?: number
          tread_depth_m?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: string
          created_at?: string
          destination_floor_id?: string | null
          guardrail_length_m?: number | null
          handrail_length_m?: number | null
          has_guardrail?: boolean
          has_handrail?: boolean
          id?: string
          landings?: Json
          largura_m?: number
          notes?: string | null
          origin_floor_id?: string | null
          page_id?: string | null
          plan_import_id?: string
          riser_height_m?: number
          risers_count?: number
          steps_count?: number
          tread_depth_m?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_stairs_destination_floor_id_fkey"
            columns: ["destination_floor_id"]
            isOneToOne: false
            referencedRelation: "plan_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_stairs_origin_floor_id_fkey"
            columns: ["origin_floor_id"]
            isOneToOne: false
            referencedRelation: "plan_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_stairs_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "plan_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_stairs_plan_import_id_fkey"
            columns: ["plan_import_id"]
            isOneToOne: false
            referencedRelation: "plan_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_walls: {
        Row: {
          comprimento_m: number
          created_at: string
          end_point: Json
          espessura_cm: number
          id: string
          material: string
          observacao: string | null
          origem: string
          plan_import_id: string
          room_id: string | null
          start_point: Json
          tipo_funcional: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comprimento_m?: number
          created_at?: string
          end_point?: Json
          espessura_cm?: number
          id?: string
          material?: string
          observacao?: string | null
          origem?: string
          plan_import_id: string
          room_id?: string | null
          start_point?: Json
          tipo_funcional?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comprimento_m?: number
          created_at?: string
          end_point?: Json
          espessura_cm?: number
          id?: string
          material?: string
          observacao?: string | null
          origem?: string
          plan_import_id?: string
          room_id?: string | null
          start_point?: Json
          tipo_funcional?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_walls_plan_import_id_fkey"
            columns: ["plan_import_id"]
            isOneToOne: false
            referencedRelation: "plan_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_walls_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "plan_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_budget_items: {
        Row: {
          confidence: number | null
          created_at: string
          description: string
          id: string
          needs_review: boolean
          ordem: number
          pre_budget_id: string
          quantity: number | null
          source: string
          total_price: number | null
          unit: string | null
          unit_price: number | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          description: string
          id?: string
          needs_review?: boolean
          ordem?: number
          pre_budget_id: string
          quantity?: number | null
          source?: string
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          description?: string
          id?: string
          needs_review?: boolean
          ordem?: number
          pre_budget_id?: string
          quantity?: number | null
          source?: string
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_budget_items_pre_budget_id_fkey"
            columns: ["pre_budget_id"]
            isOneToOne: false
            referencedRelation: "pre_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_budgets: {
        Row: {
          axia_assumptions: Json
          axia_missing_info: Json
          axia_summary: string | null
          cliente_id: string | null
          confidence: number | null
          converted_orcamento_id: string | null
          created_at: string
          created_from: string
          currency: string
          description: string | null
          estimated_total: number | null
          id: string
          obra_id: string | null
          reviewed_by: string | null
          source_axia_intake_item_id: string | null
          source_voice_command_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          axia_assumptions?: Json
          axia_missing_info?: Json
          axia_summary?: string | null
          cliente_id?: string | null
          confidence?: number | null
          converted_orcamento_id?: string | null
          created_at?: string
          created_from?: string
          currency?: string
          description?: string | null
          estimated_total?: number | null
          id?: string
          obra_id?: string | null
          reviewed_by?: string | null
          source_axia_intake_item_id?: string | null
          source_voice_command_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          axia_assumptions?: Json
          axia_missing_info?: Json
          axia_summary?: string | null
          cliente_id?: string | null
          confidence?: number | null
          converted_orcamento_id?: string | null
          created_at?: string
          created_from?: string
          currency?: string
          description?: string | null
          estimated_total?: number | null
          id?: string
          obra_id?: string | null
          reviewed_by?: string | null
          source_axia_intake_item_id?: string | null
          source_voice_command_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_budgets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_budgets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_budgets_converted_orcamento_id_fkey"
            columns: ["converted_orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_budgets_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_budgets_source_axia_intake_item_id_fkey"
            columns: ["source_axia_intake_item_id"]
            isOneToOne: false
            referencedRelation: "axia_intake_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_budgets_source_voice_command_id_fkey"
            columns: ["source_voice_command_id"]
            isOneToOne: false
            referencedRelation: "voice_commands"
            referencedColumns: ["id"]
          },
        ]
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
          default_budget_observations: string | null
          email: string
          empresa: string | null
          empresa_cidade: string | null
          empresa_codigo_postal: string | null
          empresa_email: string | null
          empresa_logo_url: string | null
          empresa_morada: string | null
          empresa_nif: string | null
          empresa_nome: string | null
          empresa_pais: string | null
          empresa_telefone: string | null
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
          default_budget_observations?: string | null
          email: string
          empresa?: string | null
          empresa_cidade?: string | null
          empresa_codigo_postal?: string | null
          empresa_email?: string | null
          empresa_logo_url?: string | null
          empresa_morada?: string | null
          empresa_nif?: string | null
          empresa_nome?: string | null
          empresa_pais?: string | null
          empresa_telefone?: string | null
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
          default_budget_observations?: string | null
          email?: string
          empresa?: string | null
          empresa_cidade?: string | null
          empresa_codigo_postal?: string | null
          empresa_email?: string | null
          empresa_logo_url?: string | null
          empresa_morada?: string | null
          empresa_nif?: string | null
          empresa_nome?: string | null
          empresa_pais?: string | null
          empresa_telefone?: string | null
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
      project_daily_plan_tasks: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          area_or_zone: string | null
          assigned_worker_id: string | null
          created_at: string
          daily_plan_id: string
          description: string | null
          discipline: string | null
          id: string
          linked_rdo_entry_id: string | null
          notes: string | null
          plan_date: string
          planned_end_time: string | null
          planned_order: number
          planned_start_time: string | null
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          area_or_zone?: string | null
          assigned_worker_id?: string | null
          created_at?: string
          daily_plan_id: string
          description?: string | null
          discipline?: string | null
          id?: string
          linked_rdo_entry_id?: string | null
          notes?: string | null
          plan_date: string
          planned_end_time?: string | null
          planned_order?: number
          planned_start_time?: string | null
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          area_or_zone?: string | null
          assigned_worker_id?: string | null
          created_at?: string
          daily_plan_id?: string
          description?: string | null
          discipline?: string | null
          id?: string
          linked_rdo_entry_id?: string | null
          notes?: string | null
          plan_date?: string
          planned_end_time?: string | null
          planned_order?: number
          planned_start_time?: string | null
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_daily_plan_tasks_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "equipa_membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_daily_plan_tasks_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "equipa_membros_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_daily_plan_tasks_daily_plan_id_fkey"
            columns: ["daily_plan_id"]
            isOneToOne: false
            referencedRelation: "project_daily_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_daily_plan_tasks_linked_rdo_entry_id_fkey"
            columns: ["linked_rdo_entry_id"]
            isOneToOne: false
            referencedRelation: "relatorios_diarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_daily_plan_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      project_daily_plans: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          plan_date: string
          project_id: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          plan_date: string
          project_id: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          plan_date?: string
          project_id?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_daily_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      project_labor_cost_entries: {
        Row: {
          amount: number | null
          created_at: string | null
          entry_date: string
          hourly_cost: number | null
          hours_worked: number | null
          id: string
          obra_id: string
          origin_type: string | null
          quantity: number | null
          status: string | null
          timesheet_allocation_id: string | null
          unit_rate: number | null
          unit_type: string | null
          updated_at: string | null
          user_id: string
          worker_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          entry_date: string
          hourly_cost?: number | null
          hours_worked?: number | null
          id?: string
          obra_id: string
          origin_type?: string | null
          quantity?: number | null
          status?: string | null
          timesheet_allocation_id?: string | null
          unit_rate?: number | null
          unit_type?: string | null
          updated_at?: string | null
          user_id: string
          worker_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          entry_date?: string
          hourly_cost?: number | null
          hours_worked?: number | null
          id?: string
          obra_id?: string
          origin_type?: string | null
          quantity?: number | null
          status?: string | null
          timesheet_allocation_id?: string | null
          unit_rate?: number | null
          unit_type?: string | null
          updated_at?: string | null
          user_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_labor_cost_entries_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_labor_cost_entries_timesheet_allocation_id_fkey"
            columns: ["timesheet_allocation_id"]
            isOneToOne: false
            referencedRelation: "timesheet_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_labor_cost_entries_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_labor_cost_entries_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          actual_date: string | null
          created_at: string
          forecast_date: string | null
          id: string
          name: string
          obra_id: string
          planned_date: string | null
          related_task_id: string | null
          risk_level: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          forecast_date?: string | null
          id?: string
          name: string
          obra_id: string
          planned_date?: string | null
          related_task_id?: string | null
          risk_level?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          forecast_date?: string | null
          id?: string
          name?: string
          obra_id?: string
          planned_date?: string | null
          related_task_id?: string | null
          risk_level?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_progress_snapshots: {
        Row: {
          actual_global_progress: number | null
          generated_at: string
          health_status: string | null
          id: string
          obra_id: string
          physical_deviation: number | null
          planned_global_progress: number | null
          probable_completion_date: string | null
          projected_global_progress: number | null
          schedule_deviation_days: number | null
          snapshot_date: string
          user_id: string
        }
        Insert: {
          actual_global_progress?: number | null
          generated_at?: string
          health_status?: string | null
          id?: string
          obra_id: string
          physical_deviation?: number | null
          planned_global_progress?: number | null
          probable_completion_date?: string | null
          projected_global_progress?: number | null
          schedule_deviation_days?: number | null
          snapshot_date: string
          user_id: string
        }
        Update: {
          actual_global_progress?: number | null
          generated_at?: string
          health_status?: string | null
          id?: string
          obra_id?: string
          physical_deviation?: number | null
          planned_global_progress?: number | null
          probable_completion_date?: string | null
          projected_global_progress?: number | null
          schedule_deviation_days?: number | null
          snapshot_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_snapshots_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      project_resource_allocations: {
        Row: {
          allocation_date: string
          created_at: string
          created_by: string
          id: string
          item_id: string | null
          item_name: string
          item_type: string
          notes: string | null
          project_id: string
          quantity: number
          status: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_date?: string
          created_at?: string
          created_by: string
          id?: string
          item_id?: string | null
          item_name: string
          item_type?: string
          notes?: string | null
          project_id: string
          quantity?: number
          status?: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_date?: string
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string | null
          item_name?: string
          item_type?: string
          notes?: string | null
          project_id?: string
          quantity?: number
          status?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_resource_allocations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resource_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedule_dependencies: {
        Row: {
          created_at: string
          dependency_type: string
          id: string
          lag_days: number | null
          obra_id: string
          predecessor_task_id: string
          successor_task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dependency_type?: string
          id?: string
          lag_days?: number | null
          obra_id: string
          predecessor_task_id: string
          successor_task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          dependency_type?: string
          id?: string
          lag_days?: number | null
          obra_id?: string
          predecessor_task_id?: string
          successor_task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_schedule_dependencies_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_dependencies_predecessor_task_id_fkey"
            columns: ["predecessor_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_dependencies_successor_task_id_fkey"
            columns: ["successor_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedule_tasks: {
        Row: {
          actual_end: string | null
          actual_progress_percent: number | null
          actual_start: string | null
          budget_chapter_id: string | null
          budget_item_id: string | null
          code: string | null
          created_at: string
          criticality: string | null
          delay_classification: string | null
          forecast_end: string | null
          forecast_start: string | null
          id: string
          name: string
          obra_id: string
          parent_task_id: string | null
          planned_duration_days: number | null
          planned_end: string | null
          planned_progress_curve_type: string | null
          planned_progress_percent: number | null
          planned_start: string | null
          progress_method: string
          projected_progress_percent: number | null
          remaining_duration_days: number | null
          schedule_float_days: number | null
          schedule_version_id: string
          sort_order: number | null
          status_flag: string | null
          task_type: string
          total_planned_quantity: number | null
          unit: string | null
          updated_at: string
          user_id: string
          wbs_code: string | null
          weight_financial: number | null
          weight_physical: number | null
          work_area_label: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_progress_percent?: number | null
          actual_start?: string | null
          budget_chapter_id?: string | null
          budget_item_id?: string | null
          code?: string | null
          created_at?: string
          criticality?: string | null
          delay_classification?: string | null
          forecast_end?: string | null
          forecast_start?: string | null
          id?: string
          name: string
          obra_id: string
          parent_task_id?: string | null
          planned_duration_days?: number | null
          planned_end?: string | null
          planned_progress_curve_type?: string | null
          planned_progress_percent?: number | null
          planned_start?: string | null
          progress_method?: string
          projected_progress_percent?: number | null
          remaining_duration_days?: number | null
          schedule_float_days?: number | null
          schedule_version_id: string
          sort_order?: number | null
          status_flag?: string | null
          task_type?: string
          total_planned_quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
          wbs_code?: string | null
          weight_financial?: number | null
          weight_physical?: number | null
          work_area_label?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_progress_percent?: number | null
          actual_start?: string | null
          budget_chapter_id?: string | null
          budget_item_id?: string | null
          code?: string | null
          created_at?: string
          criticality?: string | null
          delay_classification?: string | null
          forecast_end?: string | null
          forecast_start?: string | null
          id?: string
          name?: string
          obra_id?: string
          parent_task_id?: string | null
          planned_duration_days?: number | null
          planned_end?: string | null
          planned_progress_curve_type?: string | null
          planned_progress_percent?: number | null
          planned_start?: string | null
          progress_method?: string
          projected_progress_percent?: number | null
          remaining_duration_days?: number | null
          schedule_float_days?: number | null
          schedule_version_id?: string
          sort_order?: number | null
          status_flag?: string | null
          task_type?: string
          total_planned_quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          wbs_code?: string | null
          weight_financial?: number | null
          weight_physical?: number | null
          work_area_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_schedule_tasks_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_tasks_schedule_version_id_fkey"
            columns: ["schedule_version_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedule_versions: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          generated_by_type: string
          id: string
          is_baseline: boolean
          notes: string | null
          obra_id: string
          source_budget_id: string | null
          type: string
          updated_at: string
          user_id: string
          version_no: number
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_by_type?: string
          id?: string
          is_baseline?: boolean
          notes?: string | null
          obra_id: string
          source_budget_id?: string | null
          type?: string
          updated_at?: string
          user_id: string
          version_no?: number
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_by_type?: string
          id?: string
          is_baseline?: boolean
          notes?: string | null
          obra_id?: string
          source_budget_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_schedule_versions_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_versions_source_budget_id_fkey"
            columns: ["source_budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_categories: {
        Row: {
          category_id: string
          id: string
          quote_request_id: string
        }
        Insert: {
          category_id: string
          id?: string
          quote_request_id: string
        }
        Update: {
          category_id?: string
          id?: string
          quote_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "supplier_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_categories_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_items: {
        Row: {
          artigo_orcamento_id: string | null
          capitulo: string | null
          codigo: string | null
          created_at: string
          descricao: string
          id: string
          quantidade: number
          quote_request_id: string
          unidade: string
        }
        Insert: {
          artigo_orcamento_id?: string | null
          capitulo?: string | null
          codigo?: string | null
          created_at?: string
          descricao: string
          id?: string
          quantidade?: number
          quote_request_id: string
          unidade?: string
        }
        Update: {
          artigo_orcamento_id?: string | null
          capitulo?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string
          id?: string
          quantidade?: number
          quote_request_id?: string
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_items_artigo_orcamento_id_fkey"
            columns: ["artigo_orcamento_id"]
            isOneToOne: false
            referencedRelation: "artigos_orcamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_items_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_suppliers: {
        Row: {
          created_at: string
          id: string
          quote_request_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["quote_supplier_status_enum"]
          supplier_id: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          quote_request_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["quote_supplier_status_enum"]
          supplier_id: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          quote_request_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["quote_supplier_status_enum"]
          supplier_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_suppliers_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          budget_id: string | null
          builder_user_id: string
          created_at: string
          id: string
          location_district: string | null
          location_municipality: string | null
          message_to_suppliers: string | null
          project_id: string | null
          requested_deadline: string | null
          status: Database["public"]["Enums"]["quote_request_status_enum"]
          updated_at: string
        }
        Insert: {
          budget_id?: string | null
          builder_user_id: string
          created_at?: string
          id?: string
          location_district?: string | null
          location_municipality?: string | null
          message_to_suppliers?: string | null
          project_id?: string | null
          requested_deadline?: string | null
          status?: Database["public"]["Enums"]["quote_request_status_enum"]
          updated_at?: string
        }
        Update: {
          budget_id?: string | null
          builder_user_id?: string
          created_at?: string
          id?: string
          location_district?: string | null
          location_municipality?: string | null
          message_to_suppliers?: string | null
          project_id?: string | null
          requested_deadline?: string | null
          status?: Database["public"]["Enums"]["quote_request_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_response_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          lead_time_days: number | null
          line_total: number | null
          notes: string | null
          qty: number | null
          quote_response_id: string
          source_pricebook_item_id: string | null
          unit: string
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          lead_time_days?: number | null
          line_total?: number | null
          notes?: string | null
          qty?: number | null
          quote_response_id: string
          source_pricebook_item_id?: string | null
          unit?: string
          unit_price?: number
          vat_rate?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          lead_time_days?: number | null
          line_total?: number | null
          notes?: string | null
          qty?: number | null
          quote_response_id?: string
          source_pricebook_item_id?: string | null
          unit?: string
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_response_items_quote_response_id_fkey"
            columns: ["quote_response_id"]
            isOneToOne: false
            referencedRelation: "quote_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_response_items_source_pricebook_item_id_fkey"
            columns: ["source_pricebook_item_id"]
            isOneToOne: false
            referencedRelation: "supplier_pricebook_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_responses: {
        Row: {
          attachment_urls: string[] | null
          created_at: string
          currency: string
          estimated_delivery_days: number | null
          id: string
          notes: string | null
          quote_request_id: string
          status: Database["public"]["Enums"]["quote_response_status_enum"]
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          attachment_urls?: string[] | null
          created_at?: string
          currency?: string
          estimated_delivery_days?: number | null
          id?: string
          notes?: string | null
          quote_request_id: string
          status?: Database["public"]["Enums"]["quote_response_status_enum"]
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          attachment_urls?: string[] | null
          created_at?: string
          currency?: string
          estimated_delivery_days?: number | null
          id?: string
          notes?: string | null
          quote_request_id?: string
          status?: Database["public"]["Enums"]["quote_response_status_enum"]
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_responses_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_responses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_material_requests: {
        Row: {
          allocation_id: string | null
          created_at: string
          created_by: string
          free_text_item_name: string | null
          id: string
          item_id: string | null
          item_type: string
          needed_for_date: string
          notes: string | null
          priority: string
          project_id: string
          quantity: number
          rdo_id: string | null
          request_date: string
          status: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_id?: string | null
          created_at?: string
          created_by: string
          free_text_item_name?: string | null
          id?: string
          item_id?: string | null
          item_type?: string
          needed_for_date: string
          notes?: string | null
          priority?: string
          project_id: string
          quantity?: number
          rdo_id?: string | null
          request_date?: string
          status?: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_id?: string | null
          created_at?: string
          created_by?: string
          free_text_item_name?: string | null
          id?: string
          item_id?: string | null
          item_type?: string
          needed_for_date?: string
          notes?: string | null
          priority?: string
          project_id?: string
          quantity?: number
          rdo_id?: string | null
          request_date?: string
          status?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_material_requests_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "project_resource_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_material_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_material_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_material_requests_rdo_id_fkey"
            columns: ["rdo_id"]
            isOneToOne: false
            referencedRelation: "relatorios_diarios"
            referencedColumns: ["id"]
          },
        ]
      }
      receivable_alerts: {
        Row: {
          alert_type: string
          channel: string
          created_at: string
          id: string
          receivable_id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          alert_type?: string
          channel?: string
          created_at?: string
          id?: string
          receivable_id: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          channel?: string
          created_at?: string
          id?: string
          receivable_id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivable_alerts_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      receivable_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          obra_id: string | null
          payment_date: string
          payment_method: string | null
          receivable_id: string
          reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          obra_id?: string | null
          payment_date?: string
          payment_method?: string | null
          receivable_id: string
          reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          obra_id?: string | null
          payment_date?: string
          payment_method?: string | null
          receivable_id?: string
          reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivable_payments_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivable_payments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          issue_date: string
          obra_id: string | null
          paid_amount: number
          remaining_amount: number
          source_id: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          issue_date?: string
          obra_id?: string | null
          paid_amount?: number
          remaining_amount?: number
          source_id?: string | null
          source_type?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          issue_date?: string
          obra_id?: string | null
          paid_amount?: number
          remaining_amount?: number
          source_id?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      regimes_fiscais: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["regime_fiscal_tipo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["regime_fiscal_tipo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["regime_fiscal_tipo"]
          updated_at?: string
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
      regras_fiscais: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          id: string
          nome: string
          prioridade: number
          referencia_legal: string | null
          regime_id: string
          tipo_cliente:
            | Database["public"]["Enums"]["tipo_cliente_fiscal"]
            | null
          tipo_obra: Database["public"]["Enums"]["tipo_obra_fiscal"] | null
          tipo_operacao:
            | Database["public"]["Enums"]["tipo_operacao_fiscal"]
            | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          nome: string
          prioridade?: number
          referencia_legal?: string | null
          regime_id: string
          tipo_cliente?:
            | Database["public"]["Enums"]["tipo_cliente_fiscal"]
            | null
          tipo_obra?: Database["public"]["Enums"]["tipo_obra_fiscal"] | null
          tipo_operacao?:
            | Database["public"]["Enums"]["tipo_operacao_fiscal"]
            | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          nome?: string
          prioridade?: number
          referencia_legal?: string | null
          regime_id?: string
          tipo_cliente?:
            | Database["public"]["Enums"]["tipo_cliente_fiscal"]
            | null
          tipo_obra?: Database["public"]["Enums"]["tipo_obra_fiscal"] | null
          tipo_operacao?:
            | Database["public"]["Enums"]["tipo_operacao_fiscal"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_fiscais_regime_id_fkey"
            columns: ["regime_id"]
            isOneToOne: false
            referencedRelation: "regimes_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_diarios: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          condicoes_meteorologicas: string | null
          created_at: string
          created_from: string
          criado_por: string | null
          data: string
          fotos: string[] | null
          id: string
          mao_de_obra_presente: number | null
          obra_id: string
          observacoes: string | null
          ocorrencias: string | null
          source_axia_intake_item_id: string | null
          source_voice_command_id: string | null
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
          created_from?: string
          criado_por?: string | null
          data: string
          fotos?: string[] | null
          id?: string
          mao_de_obra_presente?: number | null
          obra_id: string
          observacoes?: string | null
          ocorrencias?: string | null
          source_axia_intake_item_id?: string | null
          source_voice_command_id?: string | null
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
          created_from?: string
          criado_por?: string | null
          data?: string
          fotos?: string[] | null
          id?: string
          mao_de_obra_presente?: number | null
          obra_id?: string
          observacoes?: string | null
          ocorrencias?: string | null
          source_axia_intake_item_id?: string | null
          source_voice_command_id?: string | null
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
          {
            foreignKeyName: "relatorios_diarios_source_axia_intake_item_id_fkey"
            columns: ["source_axia_intake_item_id"]
            isOneToOne: false
            referencedRelation: "axia_intake_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_diarios_source_voice_command_id_fkey"
            columns: ["source_voice_command_id"]
            isOneToOne: false
            referencedRelation: "voice_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_audit_log: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          actor_type?: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      specialty_detected_elements: {
        Row: {
          analysis_id: string | null
          bounding_box: Json | null
          breaker_rating_a: number | null
          cable_section_mm2: number | null
          circuit_number: string | null
          confidence_score: number | null
          created_at: string
          data_source: string | null
          distribution_board: string | null
          floor_level: string | null
          id: string
          installation_height: string | null
          is_existing: boolean | null
          label: string | null
          page_number: number
          power_w: number | null
          quantity: number
          review_required: boolean
          room_name: string | null
          sheet_subtype: string | null
          source: string
          specialty_plan_id: string
          specialty_type: string
          symbol_type: string
          technical_note: string | null
          unit: string
          updated_at: string
          user_confirmed: boolean
          user_id: string
          voltage: number | null
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          analysis_id?: string | null
          bounding_box?: Json | null
          breaker_rating_a?: number | null
          cable_section_mm2?: number | null
          circuit_number?: string | null
          confidence_score?: number | null
          created_at?: string
          data_source?: string | null
          distribution_board?: string | null
          floor_level?: string | null
          id?: string
          installation_height?: string | null
          is_existing?: boolean | null
          label?: string | null
          page_number?: number
          power_w?: number | null
          quantity?: number
          review_required?: boolean
          room_name?: string | null
          sheet_subtype?: string | null
          source?: string
          specialty_plan_id: string
          specialty_type: string
          symbol_type: string
          technical_note?: string | null
          unit?: string
          updated_at?: string
          user_confirmed?: boolean
          user_id: string
          voltage?: number | null
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          analysis_id?: string | null
          bounding_box?: Json | null
          breaker_rating_a?: number | null
          cable_section_mm2?: number | null
          circuit_number?: string | null
          confidence_score?: number | null
          created_at?: string
          data_source?: string | null
          distribution_board?: string | null
          floor_level?: string | null
          id?: string
          installation_height?: string | null
          is_existing?: boolean | null
          label?: string | null
          page_number?: number
          power_w?: number | null
          quantity?: number
          review_required?: boolean
          room_name?: string | null
          sheet_subtype?: string | null
          source?: string
          specialty_plan_id?: string
          specialty_type?: string
          symbol_type?: string
          technical_note?: string | null
          unit?: string
          updated_at?: string
          user_confirmed?: boolean
          user_id?: string
          voltage?: number | null
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "specialty_detected_elements_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "specialty_plan_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialty_detected_elements_specialty_plan_id_fkey"
            columns: ["specialty_plan_id"]
            isOneToOne: false
            referencedRelation: "specialty_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      specialty_measurements: {
        Row: {
          calculation_basis: string | null
          confidence_score: number | null
          created_at: string
          id: string
          label: string | null
          measurement_type: string
          points_json: Json
          quantity: number
          review_required: boolean
          source: string
          specialty_plan_id: string
          specialty_type: string
          symbol_type: string | null
          unit: string
          updated_at: string
          user_confirmed: boolean
          user_id: string
        }
        Insert: {
          calculation_basis?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          label?: string | null
          measurement_type?: string
          points_json?: Json
          quantity?: number
          review_required?: boolean
          source?: string
          specialty_plan_id: string
          specialty_type: string
          symbol_type?: string | null
          unit?: string
          updated_at?: string
          user_confirmed?: boolean
          user_id: string
        }
        Update: {
          calculation_basis?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          label?: string | null
          measurement_type?: string
          points_json?: Json
          quantity?: number
          review_required?: boolean
          source?: string
          specialty_plan_id?: string
          specialty_type?: string
          symbol_type?: string | null
          unit?: string
          updated_at?: string
          user_confirmed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialty_measurements_specialty_plan_id_fkey"
            columns: ["specialty_plan_id"]
            isOneToOne: false
            referencedRelation: "specialty_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      specialty_plan_analysis: {
        Row: {
          ai_model: string | null
          analysis_status: string
          confidence_score: number | null
          created_at: string
          id: string
          missing_information: string[] | null
          raw_response_json: Json | null
          review_required: boolean
          specialty_plan_id: string
          summary: string | null
          user_id: string
          warnings: string[] | null
        }
        Insert: {
          ai_model?: string | null
          analysis_status?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          missing_information?: string[] | null
          raw_response_json?: Json | null
          review_required?: boolean
          specialty_plan_id: string
          summary?: string | null
          user_id: string
          warnings?: string[] | null
        }
        Update: {
          ai_model?: string | null
          analysis_status?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          missing_information?: string[] | null
          raw_response_json?: Json | null
          review_required?: boolean
          specialty_plan_id?: string
          summary?: string | null
          user_id?: string
          warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "specialty_plan_analysis_specialty_plan_id_fkey"
            columns: ["specialty_plan_id"]
            isOneToOne: false
            referencedRelation: "specialty_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      specialty_plans: {
        Row: {
          calibration_data: Json | null
          created_at: string
          declared_scale: string | null
          estimated_scale: string | null
          file_path: string
          file_type: string
          floor_level: string | null
          id: string
          nome_ficheiro: string
          obra_id: string
          observacoes: string | null
          specialty_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calibration_data?: Json | null
          created_at?: string
          declared_scale?: string | null
          estimated_scale?: string | null
          file_path: string
          file_type?: string
          floor_level?: string | null
          id?: string
          nome_ficheiro: string
          obra_id: string
          observacoes?: string | null
          specialty_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calibration_data?: Json | null
          created_at?: string
          declared_scale?: string | null
          estimated_scale?: string | null
          file_path?: string
          file_type?: string
          floor_level?: string | null
          id?: string
          nome_ficheiro?: string
          obra_id?: string
          observacoes?: string | null
          specialty_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialty_plans_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      specialty_quantity_items: {
        Row: {
          budget_item_id: string | null
          confidence_score: number | null
          created_at: string
          description: string | null
          id: string
          item_name: string
          quantity: number
          review_required: boolean
          sent_to_budget: boolean
          source_id: string | null
          source_type: string
          specialty_plan_id: string
          specialty_type: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_item_id?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          quantity?: number
          review_required?: boolean
          sent_to_budget?: boolean
          source_id?: string | null
          source_type?: string
          specialty_plan_id: string
          specialty_type: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_item_id?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          quantity?: number
          review_required?: boolean
          sent_to_budget?: boolean
          source_id?: string | null
          source_type?: string
          specialty_plan_id?: string
          specialty_type?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialty_quantity_items_specialty_plan_id_fkey"
            columns: ["specialty_plan_id"]
            isOneToOne: false
            referencedRelation: "specialty_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      specialty_symbol_library: {
        Row: {
          active: boolean
          created_at: string
          default_budget_category: string | null
          default_budget_item_name: string | null
          description: string | null
          icon: string | null
          id: string
          specialty_type: string
          symbol_key: string
          symbol_name: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_budget_category?: string | null
          default_budget_item_name?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          specialty_type: string
          symbol_key: string
          symbol_name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_budget_category?: string | null
          default_budget_item_name?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          specialty_type?: string
          symbol_key?: string
          symbol_name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      subempreiteiros: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          endereco: string | null
          especialidade: string | null
          foto_url: string | null
          id: string
          nif: string | null
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          endereco?: string | null
          especialidade?: string | null
          foto_url?: string | null
          id?: string
          nif?: string | null
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          endereco?: string | null
          especialidade?: string | null
          foto_url?: string | null
          id?: string
          nif?: string | null
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean | null
          subscription_end: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean | null
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean | null
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number
          price_yearly: number | null
          sort_order: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly: number
          price_yearly?: number | null
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      supplier_category_link: {
        Row: {
          category_id: string
          id: string
          supplier_id: string
        }
        Insert: {
          category_id: string
          id?: string
          supplier_id: string
        }
        Update: {
          category_id?: string
          id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_category_link_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "supplier_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_category_link_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_admin_user_id: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by_admin_user_id?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_admin_user_id?: string | null
          status?: string
          token?: string
        }
        Relationships: []
      }
      supplier_pricebook_items: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          item_code: string | null
          item_name: string
          lead_time_days: number | null
          min_qty: number | null
          notes: string | null
          pricebook_id: string
          unit: string
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          base_price?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_code?: string | null
          item_name: string
          lead_time_days?: number | null
          min_qty?: number | null
          notes?: string | null
          pricebook_id: string
          unit?: string
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_code?: string | null
          item_name?: string
          lead_time_days?: number | null
          min_qty?: number | null
          notes?: string | null
          pricebook_id?: string
          unit?: string
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_pricebook_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "supplier_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_pricebook_items_pricebook_id_fkey"
            columns: ["pricebook_id"]
            isOneToOne: false
            referencedRelation: "supplier_pricebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_pricebooks: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          status: Database["public"]["Enums"]["pricebook_status_enum"]
          supplier_id: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["pricebook_status_enum"]
          supplier_id: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["pricebook_status_enum"]
          supplier_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_pricebooks_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_profiles: {
        Row: {
          aceita_comunicacoes: boolean | null
          aceita_pedidos_plataforma: boolean | null
          aceita_termos: boolean | null
          ano_fundacao: number | null
          atualizacao_precos: string | null
          cae_principal: string | null
          cae_secundario: string | null
          categoria_principal: string | null
          certificacoes: string[] | null
          codigo_postal: string | null
          created_at: string
          default_cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          delivery_capability: string | null
          desconto_volume: boolean | null
          distritos_atuacao: string[] | null
          email_comercial: string | null
          frequencia_atualizacao: string | null
          id: string
          is_certified: boolean
          legal_name: string
          localidade: string | null
          location_district: string | null
          location_municipality: string | null
          logo_url: string | null
          min_order_value: number | null
          morada_completa: string | null
          nif: string | null
          num_colaboradores: string | null
          pais: string | null
          payment_terms: string | null
          permite_api: boolean | null
          phone: string | null
          prazo_medio_entrega: string | null
          prazo_pagamento_padrao: string | null
          raio_atuacao_km: number | null
          rating_avg: number | null
          rating_count: number | null
          responsavel_nome: string | null
          service_areas: string | null
          sla_response_hours: number | null
          status: Database["public"]["Enums"]["supplier_status_enum"]
          subcategorias: string[] | null
          telefone_fixo: string | null
          telemovel: string | null
          tipo_fornecimento: string[] | null
          trabalha_credito: boolean | null
          trade_name: string | null
          updated_at: string
          user_id: string
          website: string | null
          zona_atuacao: string | null
        }
        Insert: {
          aceita_comunicacoes?: boolean | null
          aceita_pedidos_plataforma?: boolean | null
          aceita_termos?: boolean | null
          ano_fundacao?: number | null
          atualizacao_precos?: string | null
          cae_principal?: string | null
          cae_secundario?: string | null
          categoria_principal?: string | null
          certificacoes?: string[] | null
          codigo_postal?: string | null
          created_at?: string
          default_cost_nature?:
            | Database["public"]["Enums"]["cost_nature"]
            | null
          delivery_capability?: string | null
          desconto_volume?: boolean | null
          distritos_atuacao?: string[] | null
          email_comercial?: string | null
          frequencia_atualizacao?: string | null
          id?: string
          is_certified?: boolean
          legal_name?: string
          localidade?: string | null
          location_district?: string | null
          location_municipality?: string | null
          logo_url?: string | null
          min_order_value?: number | null
          morada_completa?: string | null
          nif?: string | null
          num_colaboradores?: string | null
          pais?: string | null
          payment_terms?: string | null
          permite_api?: boolean | null
          phone?: string | null
          prazo_medio_entrega?: string | null
          prazo_pagamento_padrao?: string | null
          raio_atuacao_km?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          responsavel_nome?: string | null
          service_areas?: string | null
          sla_response_hours?: number | null
          status?: Database["public"]["Enums"]["supplier_status_enum"]
          subcategorias?: string[] | null
          telefone_fixo?: string | null
          telemovel?: string | null
          tipo_fornecimento?: string[] | null
          trabalha_credito?: boolean | null
          trade_name?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          zona_atuacao?: string | null
        }
        Update: {
          aceita_comunicacoes?: boolean | null
          aceita_pedidos_plataforma?: boolean | null
          aceita_termos?: boolean | null
          ano_fundacao?: number | null
          atualizacao_precos?: string | null
          cae_principal?: string | null
          cae_secundario?: string | null
          categoria_principal?: string | null
          certificacoes?: string[] | null
          codigo_postal?: string | null
          created_at?: string
          default_cost_nature?:
            | Database["public"]["Enums"]["cost_nature"]
            | null
          delivery_capability?: string | null
          desconto_volume?: boolean | null
          distritos_atuacao?: string[] | null
          email_comercial?: string | null
          frequencia_atualizacao?: string | null
          id?: string
          is_certified?: boolean
          legal_name?: string
          localidade?: string | null
          location_district?: string | null
          location_municipality?: string | null
          logo_url?: string | null
          min_order_value?: number | null
          morada_completa?: string | null
          nif?: string | null
          num_colaboradores?: string | null
          pais?: string | null
          payment_terms?: string | null
          permite_api?: boolean | null
          phone?: string | null
          prazo_medio_entrega?: string | null
          prazo_pagamento_padrao?: string | null
          raio_atuacao_km?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          responsavel_nome?: string | null
          service_areas?: string | null
          sla_response_hours?: number | null
          status?: Database["public"]["Enums"]["supplier_status_enum"]
          subcategorias?: string[] | null
          telefone_fixo?: string | null
          telemovel?: string | null
          tipo_fornecimento?: string[] | null
          trabalha_credito?: boolean | null
          trade_name?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          zona_atuacao?: string | null
        }
        Relationships: []
      }
      supplier_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          quote_request_id: string | null
          rating: number
          reviewer_id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          quote_request_id?: string | null
          rating: number
          reviewer_id: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          quote_request_id?: string | null
          rating?: number
          reviewer_id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_reviews_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          sender_role: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          sender_role?: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          descricao: string
          id: string
          prioridade: string
          status: string
          titulo: string
          updated_at: string
          user_email: string | null
          user_id: string
          user_nome: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          prioridade?: string
          status?: string
          titulo: string
          updated_at?: string
          user_email?: string | null
          user_id: string
          user_nome?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          prioridade?: string
          status?: string
          titulo?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_nome?: string | null
        }
        Relationships: []
      }
      survey_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          categoria: string | null
          created_at: string
          data_agendada: string | null
          data_conclusao: string | null
          dependencias: string[] | null
          descricao: string | null
          hora_agendada: string | null
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
          hora_agendada?: string | null
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
          hora_agendada?: string | null
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
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
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
          membro_id: string | null
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
          membro_id?: string | null
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
          membro_id?: string | null
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
            foreignKeyName: "tarefas_cronograma_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "equipa_membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_cronograma_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "equipa_membros_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_cronograma_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      task_productivity_history: {
        Row: {
          actual_productivity: number | null
          average_actual_productivity: number | null
          created_at: string
          id: string
          obra_id: string
          planned_productivity: number | null
          reference_date: string
          schedule_task_id: string
          user_id: string
        }
        Insert: {
          actual_productivity?: number | null
          average_actual_productivity?: number | null
          created_at?: string
          id?: string
          obra_id: string
          planned_productivity?: number | null
          reference_date: string
          schedule_task_id: string
          user_id: string
        }
        Update: {
          actual_productivity?: number | null
          average_actual_productivity?: number | null
          created_at?: string
          id?: string
          obra_id?: string
          planned_productivity?: number | null
          reference_date?: string
          schedule_task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_productivity_history_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_productivity_history_schedule_task_id_fkey"
            columns: ["schedule_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_progress_snapshots: {
        Row: {
          actual_progress_percent: number | null
          delay_days: number | null
          generated_at: string
          id: string
          obra_id: string
          planned_progress_percent: number | null
          projected_progress_percent: number | null
          schedule_task_id: string
          snapshot_date: string
          status_flag: string | null
          user_id: string
        }
        Insert: {
          actual_progress_percent?: number | null
          delay_days?: number | null
          generated_at?: string
          id?: string
          obra_id: string
          planned_progress_percent?: number | null
          projected_progress_percent?: number | null
          schedule_task_id: string
          snapshot_date: string
          status_flag?: string | null
          user_id: string
        }
        Update: {
          actual_progress_percent?: number | null
          delay_days?: number | null
          generated_at?: string
          id?: string
          obra_id?: string
          planned_progress_percent?: number | null
          projected_progress_percent?: number | null
          schedule_task_id?: string
          snapshot_date?: string
          status_flag?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_progress_snapshots_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_progress_snapshots_schedule_task_id_fkey"
            columns: ["schedule_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reforecast: {
        Row: {
          created_at: string
          delay_classification: string | null
          id: string
          new_forecast_end: string | null
          new_remaining_duration_days: number | null
          obra_id: string
          previous_forecast_end: string | null
          previous_remaining_duration_days: number | null
          reason_summary: string | null
          reference_daily_report_id: string | null
          schedule_task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delay_classification?: string | null
          id?: string
          new_forecast_end?: string | null
          new_remaining_duration_days?: number | null
          obra_id: string
          previous_forecast_end?: string | null
          previous_remaining_duration_days?: number | null
          reason_summary?: string | null
          reference_daily_report_id?: string | null
          schedule_task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          delay_classification?: string | null
          id?: string
          new_forecast_end?: string | null
          new_remaining_duration_days?: number | null
          obra_id?: string
          previous_forecast_end?: string | null
          previous_remaining_duration_days?: number | null
          reason_summary?: string | null
          reference_daily_report_id?: string | null
          schedule_task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reforecast_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reforecast_reference_daily_report_id_fkey"
            columns: ["reference_daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reforecast_schedule_task_id_fkey"
            columns: ["schedule_task_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas_iva: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          percentagem: number
          regime_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          percentagem: number
          regime_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          percentagem?: number
          regime_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxas_iva_regime_id_fkey"
            columns: ["regime_id"]
            isOneToOne: false
            referencedRelation: "regimes_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitation_module_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_update: boolean
          can_view: boolean
          id: string
          invitation_id: string
          module_code: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          id?: string
          invitation_id: string
          module_code: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          id?: string
          invitation_id?: string
          module_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitation_module_permissions_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "team_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          internal_note: string | null
          invited_by_user_id: string
          job_title: string | null
          obra_scope: string
          organization_id: string
          phone: string | null
          role_code: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          internal_note?: string | null
          invited_by_user_id: string
          job_title?: string | null
          obra_scope?: string
          organization_id: string
          phone?: string | null
          role_code?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          internal_note?: string | null
          invited_by_user_id?: string
          job_title?: string | null
          obra_scope?: string
          organization_id?: string
          phone?: string | null
          role_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      timesheet_allocations: {
        Row: {
          cost_amount: number | null
          cost_type: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          hourly_cost_snapshot: number | null
          id: string
          obra_id: string
          quantity: number | null
          rdo_id: string | null
          start_time: string | null
          timesheet_id: string
          unit_rate_snapshot: number | null
          unit_type: string | null
          updated_at: string | null
          user_id: string
          work_date: string
          worked_minutes: number | null
          worker_id: string
        }
        Insert: {
          cost_amount?: number | null
          cost_type?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          hourly_cost_snapshot?: number | null
          id?: string
          obra_id: string
          quantity?: number | null
          rdo_id?: string | null
          start_time?: string | null
          timesheet_id: string
          unit_rate_snapshot?: number | null
          unit_type?: string | null
          updated_at?: string | null
          user_id: string
          work_date: string
          worked_minutes?: number | null
          worker_id: string
        }
        Update: {
          cost_amount?: number | null
          cost_type?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          hourly_cost_snapshot?: number | null
          id?: string
          obra_id?: string
          quantity?: number | null
          rdo_id?: string | null
          start_time?: string | null
          timesheet_id?: string
          unit_rate_snapshot?: number | null
          unit_type?: string | null
          updated_at?: string | null
          user_id?: string
          work_date?: string
          worked_minutes?: number | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_allocations_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_allocations_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_allocations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_allocations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          break_minutes: number | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          status: string | null
          total_worked_minutes: number | null
          updated_at: string | null
          user_id: string
          work_date: string
          worker_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          total_worked_minutes?: number | null
          updated_at?: string | null
          user_id: string
          work_date: string
          worker_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          total_worked_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          work_date?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_engagement_status: {
        Row: {
          created_at: string
          has_created_budget: boolean
          has_created_project: boolean
          id: string
          last_action_date: string | null
          last_login_date: string | null
          message_dismissed_until: string | null
          message_last_shown: string | null
          total_records_created: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          has_created_budget?: boolean
          has_created_project?: boolean
          id?: string
          last_action_date?: string | null
          last_login_date?: string | null
          message_dismissed_until?: string | null
          message_last_shown?: string | null
          total_records_created?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          has_created_budget?: boolean
          has_created_project?: boolean
          id?: string
          last_action_date?: string | null
          last_login_date?: string | null
          message_dismissed_until?: string | null
          message_last_shown?: string | null
          total_records_created?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          enabled: boolean
          enrolled_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          enrolled_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          enrolled_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          first_login_done: boolean | null
          id: string
          onboarding_dismissed: boolean | null
          selected_goal: string | null
          selected_role: string | null
          step_1_completed: boolean | null
          step_2_completed: boolean | null
          step_3_completed: boolean | null
          step_4_completed: boolean | null
          user_id: string
          wizard_current_step: number | null
          wizard_status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          first_login_done?: boolean | null
          id?: string
          onboarding_dismissed?: boolean | null
          selected_goal?: string | null
          selected_role?: string | null
          step_1_completed?: boolean | null
          step_2_completed?: boolean | null
          step_3_completed?: boolean | null
          step_4_completed?: boolean | null
          user_id: string
          wizard_current_step?: number | null
          wizard_status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          first_login_done?: boolean | null
          id?: string
          onboarding_dismissed?: boolean | null
          selected_goal?: string | null
          selected_role?: string | null
          step_1_completed?: boolean | null
          step_2_completed?: boolean | null
          step_3_completed?: boolean | null
          step_4_completed?: boolean | null
          user_id?: string
          wizard_current_step?: number | null
          wizard_status?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          email_alertas: boolean
          email_orcamentos: boolean
          email_rdos: boolean
          email_relatorios: boolean
          id: string
          push_alertas: boolean
          push_enabled: boolean
          push_tarefas: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_alertas?: boolean
          email_orcamentos?: boolean
          email_rdos?: boolean
          email_relatorios?: boolean
          id?: string
          push_alertas?: boolean
          push_enabled?: boolean
          push_tarefas?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_alertas?: boolean
          email_orcamentos?: boolean
          email_rdos?: boolean
          email_relatorios?: boolean
          id?: string
          push_alertas?: boolean
          push_enabled?: boolean
          push_tarefas?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_commands: {
        Row: {
          audio_file_path: string | null
          axia_result: Json | null
          confidence: number | null
          created_at: string
          detected_intent: string | null
          error_message: string | null
          id: string
          language: string
          obra_id: string | null
          processed_at: string | null
          processing_status: string
          source_context: string
          transcript: string
          user_id: string
        }
        Insert: {
          audio_file_path?: string | null
          axia_result?: Json | null
          confidence?: number | null
          created_at?: string
          detected_intent?: string | null
          error_message?: string | null
          id?: string
          language?: string
          obra_id?: string | null
          processed_at?: string | null
          processing_status?: string
          source_context?: string
          transcript: string
          user_id: string
        }
        Update: {
          audio_file_path?: string | null
          axia_result?: Json | null
          confidence?: number | null
          created_at?: string
          detected_intent?: string | null
          error_message?: string | null
          id?: string
          language?: string
          obra_id?: string | null
          processed_at?: string | null
          processing_status?: string
          source_context?: string
          transcript?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_commands_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          active: boolean | null
          compensation_type: string | null
          created_at: string | null
          default_daily_cost: number | null
          default_hourly_cost: number | null
          email: string | null
          employee_code: string | null
          employment_type: string | null
          end_date: string | null
          equipa_membro_id: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          monthly_salary: number | null
          nif: string | null
          overtime_hourly_cost: number | null
          phone: string | null
          role: string | null
          start_date: string | null
          subempreiteiro_id: string | null
          unit_rate_m2: number
          unit_rate_ml: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          compensation_type?: string | null
          created_at?: string | null
          default_daily_cost?: number | null
          default_hourly_cost?: number | null
          email?: string | null
          employee_code?: string | null
          employment_type?: string | null
          end_date?: string | null
          equipa_membro_id?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          nif?: string | null
          overtime_hourly_cost?: number | null
          phone?: string | null
          role?: string | null
          start_date?: string | null
          subempreiteiro_id?: string | null
          unit_rate_m2?: number
          unit_rate_ml?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          compensation_type?: string | null
          created_at?: string | null
          default_daily_cost?: number | null
          default_hourly_cost?: number | null
          email?: string | null
          employee_code?: string | null
          employment_type?: string | null
          end_date?: string | null
          equipa_membro_id?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          nif?: string | null
          overtime_hourly_cost?: number | null
          phone?: string | null
          role?: string | null
          start_date?: string | null
          subempreiteiro_id?: string | null
          unit_rate_m2?: number
          unit_rate_ml?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_equipa_membro_id_fkey"
            columns: ["equipa_membro_id"]
            isOneToOne: false
            referencedRelation: "equipa_membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_equipa_membro_id_fkey"
            columns: ["equipa_membro_id"]
            isOneToOne: false
            referencedRelation: "equipa_membros_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_subempreiteiro_id_fkey"
            columns: ["subempreiteiro_id"]
            isOneToOne: false
            referencedRelation: "subempreiteiros"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      clientes_view: {
        Row: {
          ativo: boolean | null
          cidade: string | null
          codigo_postal: string | null
          created_at: string | null
          criado_por: string | null
          email: string | null
          empresa: string | null
          endereco: string | null
          id: string | null
          nif: string | null
          nivel_acesso: string | null
          nome: string | null
          observacoes: string | null
          pais: string | null
          telefone: string | null
          telemovel: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          codigo_postal?: string | null
          created_at?: string | null
          criado_por?: string | null
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          id?: string | null
          nif?: never
          nivel_acesso?: string | null
          nome?: string | null
          observacoes?: string | null
          pais?: string | null
          telefone?: string | null
          telemovel?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          codigo_postal?: string | null
          created_at?: string | null
          criado_por?: string | null
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          id?: string | null
          nif?: never
          nivel_acesso?: string | null
          nome?: string | null
          observacoes?: string | null
          pais?: string | null
          telefone?: string | null
          telemovel?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      equipa_membros_view: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          created_at: string | null
          data_admissao: string | null
          email: string | null
          foto_url: string | null
          id: string | null
          nif: string | null
          nome: string | null
          obra_atual_id: string | null
          observacoes: string | null
          salario_base: number | null
          subempreiteiro_id: string | null
          telefone: string | null
          tipo_contrato: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          created_at?: string | null
          data_admissao?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string | null
          nif?: never
          nome?: string | null
          obra_atual_id?: string | null
          observacoes?: string | null
          salario_base?: never
          subempreiteiro_id?: string | null
          telefone?: string | null
          tipo_contrato?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          created_at?: string | null
          data_admissao?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string | null
          nif?: never
          nome?: string | null
          obra_atual_id?: string | null
          observacoes?: string | null
          salario_base?: never
          subempreiteiro_id?: string | null
          telefone?: string | null
          tipo_contrato?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipa_membros_obra_atual_id_fkey"
            columns: ["obra_atual_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipa_membros_subempreiteiro_id_fkey"
            columns: ["subempreiteiro_id"]
            isOneToOne: false
            referencedRelation: "subempreiteiros"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_resumo_obra: {
        Row: {
          aco_total_fundacoes: number | null
          aco_total_lajes: number | null
          area_estrutural_total: number | null
          area_liquida_total: number | null
          area_total_paredes: number | null
          area_total_vaos: number | null
          comprimento_total_paredes: number | null
          config_nome: string | null
          config_status: string | null
          configuracao_id: string | null
          empresa_id: string | null
          indice_kg_m2: number | null
          indice_m3_m2: number | null
          obra_id: string | null
          volume_total_fundacoes: number | null
          volume_total_lajes: number | null
          volume_total_obra: number | null
          volume_total_paredes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "icf_configuracoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_quantitativos_v: {
        Row: {
          action_type: string | null
          camada: string | null
          categoria: string | null
          confidence: string | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          estado_validacao: string | null
          floor_id: string | null
          id: string | null
          obra_id: string | null
          origem: string | null
          page_id: string | null
          plan_import_id: string | null
          room_id: string | null
          source: string | null
          source_subtype: string | null
          symbol_type_id: string | null
          unidade: string | null
          updated_at: string | null
          user_id: string | null
          valor: number | null
        }
        Relationships: []
      }
      profiles_view: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_budget_observations: string | null
          email: string | null
          empresa: string | null
          empresa_cidade: string | null
          empresa_codigo_postal: string | null
          empresa_email: string | null
          empresa_logo_url: string | null
          empresa_morada: string | null
          empresa_nif: string | null
          empresa_nome: string | null
          empresa_pais: string | null
          empresa_telefone: string | null
          id: string | null
          nif: string | null
          nome: string | null
          role: string | null
          telefone: string | null
          trial_end: string | null
          trial_expired: boolean | null
          trial_start: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_budget_observations?: string | null
          email?: string | null
          empresa?: string | null
          empresa_cidade?: string | null
          empresa_codigo_postal?: string | null
          empresa_email?: string | null
          empresa_logo_url?: string | null
          empresa_morada?: string | null
          empresa_nif?: never
          empresa_nome?: string | null
          empresa_pais?: string | null
          empresa_telefone?: string | null
          id?: string | null
          nif?: never
          nome?: string | null
          role?: string | null
          telefone?: string | null
          trial_end?: string | null
          trial_expired?: boolean | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_budget_observations?: string | null
          email?: string | null
          empresa?: string | null
          empresa_cidade?: string | null
          empresa_codigo_postal?: string | null
          empresa_email?: string | null
          empresa_logo_url?: string | null
          empresa_morada?: string | null
          empresa_nif?: never
          empresa_nome?: string | null
          empresa_pais?: string | null
          empresa_telefone?: string | null
          id?: string | null
          nif?: never
          nome?: string | null
          role?: string | null
          telefone?: string | null
          trial_end?: string | null
          trial_expired?: boolean | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_subscription: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          subscribed: boolean | null
          subscription_end: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          subscribed?: boolean | null
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          subscribed?: boolean | null
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      workers_view: {
        Row: {
          active: boolean | null
          compensation_type: string | null
          created_at: string | null
          default_daily_cost: number | null
          default_hourly_cost: number | null
          email: string | null
          employee_code: string | null
          employment_type: string | null
          end_date: string | null
          equipa_membro_id: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string | null
          monthly_salary: number | null
          nif: string | null
          overtime_hourly_cost: number | null
          phone: string | null
          role: string | null
          start_date: string | null
          subempreiteiro_id: string | null
          unit_rate_m2: number | null
          unit_rate_ml: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          compensation_type?: string | null
          created_at?: string | null
          default_daily_cost?: never
          default_hourly_cost?: never
          email?: string | null
          employee_code?: string | null
          employment_type?: string | null
          end_date?: string | null
          equipa_membro_id?: string | null
          full_name?: string | null
          hourly_rate?: never
          id?: string | null
          monthly_salary?: never
          nif?: never
          overtime_hourly_cost?: never
          phone?: string | null
          role?: string | null
          start_date?: string | null
          subempreiteiro_id?: string | null
          unit_rate_m2?: never
          unit_rate_ml?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          compensation_type?: string | null
          created_at?: string | null
          default_daily_cost?: never
          default_hourly_cost?: never
          email?: string | null
          employee_code?: string | null
          employment_type?: string | null
          end_date?: string | null
          equipa_membro_id?: string | null
          full_name?: string | null
          hourly_rate?: never
          id?: string | null
          monthly_salary?: never
          nif?: never
          overtime_hourly_cost?: never
          phone?: string | null
          role?: string | null
          start_date?: string | null
          subempreiteiro_id?: string | null
          unit_rate_m2?: never
          unit_rate_ml?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_equipa_membro_id_fkey"
            columns: ["equipa_membro_id"]
            isOneToOne: false
            referencedRelation: "equipa_membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_equipa_membro_id_fkey"
            columns: ["equipa_membro_id"]
            isOneToOne: false
            referencedRelation: "equipa_membros_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_subempreiteiro_id_fkey"
            columns: ["subempreiteiro_id"]
            isOneToOne: false
            referencedRelation: "subempreiteiros"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_get_all_supplier_profiles: {
        Args: never
        Returns: {
          aceita_comunicacoes: boolean | null
          aceita_pedidos_plataforma: boolean | null
          aceita_termos: boolean | null
          ano_fundacao: number | null
          atualizacao_precos: string | null
          cae_principal: string | null
          cae_secundario: string | null
          categoria_principal: string | null
          certificacoes: string[] | null
          codigo_postal: string | null
          created_at: string
          default_cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          delivery_capability: string | null
          desconto_volume: boolean | null
          distritos_atuacao: string[] | null
          email_comercial: string | null
          frequencia_atualizacao: string | null
          id: string
          is_certified: boolean
          legal_name: string
          localidade: string | null
          location_district: string | null
          location_municipality: string | null
          logo_url: string | null
          min_order_value: number | null
          morada_completa: string | null
          nif: string | null
          num_colaboradores: string | null
          pais: string | null
          payment_terms: string | null
          permite_api: boolean | null
          phone: string | null
          prazo_medio_entrega: string | null
          prazo_pagamento_padrao: string | null
          raio_atuacao_km: number | null
          rating_avg: number | null
          rating_count: number | null
          responsavel_nome: string | null
          service_areas: string | null
          sla_response_hours: number | null
          status: Database["public"]["Enums"]["supplier_status_enum"]
          subcategorias: string[] | null
          telefone_fixo: string | null
          telemovel: string | null
          tipo_fornecimento: string[] | null
          trabalha_credito: boolean | null
          trade_name: string | null
          updated_at: string
          user_id: string
          website: string | null
          zona_atuacao: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "supplier_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      aplicar_matriz_capitulos: {
        Args: { p_orcamento_id: string }
        Returns: number
      }
      approve_base_dry_budget: {
        Args: { p_orcamento_id: string }
        Returns: Json
      }
      buscar_historico_match: {
        Args: { p_descricao: string; p_limite?: number; p_user_id: string }
        Returns: {
          artigo_id: string
          material_id: string
          metodo_construtivo: string
          similaridade: number
          unidade_correta: string
          vezes_usado: number
        }[]
      }
      calculate_element_parameters: {
        Args: { p_element_id: string }
        Returns: undefined
      }
      can_access_rdo_photo: { Args: { _path: string }; Returns: boolean }
      classify_task_delay: { Args: { p_task_id: string }; Returns: string }
      cleanup_expired_mfa_data: { Args: never; Returns: undefined }
      confirm_award: {
        Args: {
          _awarded_total: number
          _notes?: string
          _package_id: string
          _supplier_id: string
        }
        Returns: string
      }
      create_budget_revision: {
        Args: { p_orcamento_id: string }
        Returns: {
          client_document_mode_default: string | null
          cliente_id: string | null
          codigo: string | null
          commercial_intro_text: string | null
          commercial_notes_text: string | null
          commercial_payment_terms_text: string | null
          commercial_validity_text: string | null
          cost_center_id: string | null
          created_at: string
          custos_indiretos: Json | null
          data_criacao: string
          data_envio: string | null
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_reason: string | null
          margem_lucro: number | null
          numero_revisao: number | null
          obra_id: string | null
          observations_text: string | null
          project_metadata: Json
          revisao_de: string | null
          show_signature_block: boolean | null
          status: string
          titulo: string
          updated_at: string
          user_id: string
          valor_adjudicado: number | null
          valor_total: number | null
        }
        SetofOptions: {
          from: "*"
          to: "orcamentos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_contracting_package: {
        Args: {
          _budget_version_id: string
          _chapter_code?: string
          _chapter_name?: string
          _description?: string
          _item_ids: string[]
          _name: string
        }
        Returns: string
      }
      create_new_target_version: {
        Args: { p_reason?: string; p_source_budget_id: string }
        Returns: string
      }
      decide_mce_approval: {
        Args: {
          _approval_id: string
          _comment?: string
          _decision: Database["public"]["Enums"]["mce_approval_decision"]
          _signature?: string
          _validated_amount?: number
        }
        Returns: Json
      }
      determinar_regime_fiscal: {
        Args: {
          p_data_referencia?: string
          p_tipo_cliente?: Database["public"]["Enums"]["tipo_cliente_fiscal"]
          p_tipo_obra?: Database["public"]["Enums"]["tipo_obra_fiscal"]
          p_tipo_operacao?: Database["public"]["Enums"]["tipo_operacao_fiscal"]
        }
        Returns: {
          nota_legal: string
          regime_codigo: string
          regime_id: string
          regime_nome: string
          regra_codigo: string
          regra_id: string
          taxa_iva: number
        }[]
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
      generate_final_closing_sheet: {
        Args: { _notes?: string; _orcamento_id: string }
        Returns: string
      }
      generate_icf_budget_transactional: {
        Args: {
          p_chapters: Json
          p_config_snapshot: Json
          p_configuracao_id: string
          p_custos_indiretos: Json
          p_margem_lucro: number
          p_obra_id: string
          p_resumo_snapshot: Json
          p_titulo: string
        }
        Returns: Json
      }
      generate_orcamento_codigo: {
        Args: { p_user_id: string }
        Returns: string
      }
      generate_project_snapshot: {
        Args: { p_obra_id: string }
        Returns: undefined
      }
      generate_task_snapshots: {
        Args: { p_obra_id: string }
        Returns: undefined
      }
      get_my_supplier_profile: {
        Args: never
        Returns: {
          aceita_comunicacoes: boolean | null
          aceita_pedidos_plataforma: boolean | null
          aceita_termos: boolean | null
          ano_fundacao: number | null
          atualizacao_precos: string | null
          cae_principal: string | null
          cae_secundario: string | null
          categoria_principal: string | null
          certificacoes: string[] | null
          codigo_postal: string | null
          created_at: string
          default_cost_nature: Database["public"]["Enums"]["cost_nature"] | null
          delivery_capability: string | null
          desconto_volume: boolean | null
          distritos_atuacao: string[] | null
          email_comercial: string | null
          frequencia_atualizacao: string | null
          id: string
          is_certified: boolean
          legal_name: string
          localidade: string | null
          location_district: string | null
          location_municipality: string | null
          logo_url: string | null
          min_order_value: number | null
          morada_completa: string | null
          nif: string | null
          num_colaboradores: string | null
          pais: string | null
          payment_terms: string | null
          permite_api: boolean | null
          phone: string | null
          prazo_medio_entrega: string | null
          prazo_pagamento_padrao: string | null
          raio_atuacao_km: number | null
          rating_avg: number | null
          rating_count: number | null
          responsavel_nome: string | null
          service_areas: string | null
          sla_response_hours: number | null
          status: Database["public"]["Enums"]["supplier_status_enum"]
          subcategorias: string[] | null
          telefone_fixo: string | null
          telemovel: string | null
          tipo_fornecimento: string[] | null
          trabalha_credito: boolean | null
          trade_name: string | null
          updated_at: string
          user_id: string
          website: string | null
          zona_atuacao: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "supplier_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_next_auto_number: { Args: { p_obra_id: string }; Returns: number }
      get_org_member_ids: { Args: never; Returns: string[] }
      get_price_stats: {
        Args: { p_months?: number; p_user_id: string }
        Returns: {
          avg_price: number
          categoria: string
          median_price: number
          sample_count: number
          stddev_price: number
          unidade: string
        }[]
      }
      get_public_supplier_profiles: {
        Args: never
        Returns: {
          ano_fundacao: number
          cae_principal: string
          cae_secundario: string
          categoria_principal: string
          certificacoes: string[]
          created_at: string
          delivery_capability: string
          desconto_volume: boolean
          distritos_atuacao: string[]
          id: string
          is_certified: boolean
          legal_name: string
          location_district: string
          location_municipality: string
          logo_url: string
          min_order_value: number
          nif: string
          num_colaboradores: string
          payment_terms: string
          prazo_medio_entrega: string
          prazo_pagamento_padrao: string
          raio_atuacao_km: number
          rating_avg: number
          rating_count: number
          service_areas: string
          sla_response_hours: number
          status: Database["public"]["Enums"]["supplier_status_enum"]
          subcategorias: string[]
          tipo_fornecimento: string[]
          trabalha_credito: boolean
          trade_name: string
          updated_at: string
          website: string
          zona_atuacao: string
        }[]
      }
      get_user_org_id: { Args: never; Returns: string }
      is_obra_owner: { Args: { _obra_id: string }; Returns: boolean }
      is_org_admin: { Args: never; Returns: boolean }
      is_org_admin_or_self: { Args: { _target: string }; Returns: boolean }
      is_quote_request_owner: {
        Args: { _quote_request_id: string }
        Returns: boolean
      }
      is_quote_request_supplier: {
        Args: { _quote_request_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_supplier: { Args: { _user_id?: string }; Returns: boolean }
      is_trusted_device: { Args: { p_token_hash: string }; Returns: boolean }
      log_budget_event:
        | {
            Args: {
              p_budget_version_id: string
              p_event_type: string
              p_metadata: Json
            }
            Returns: string
          }
        | {
            Args: {
              p_budget_version_id?: string
              p_description?: string
              p_entity_id?: string
              p_entity_type?: string
              p_event_type: string
              p_new_value?: Json
              p_previous_value?: Json
              p_source_budget_id: string
            }
            Returns: string
          }
      next_obra_cost_center_code: { Args: { _org_id: string }; Returns: string }
      normalizar_descricao: { Args: { texto: string }; Returns: string }
      propagate_dependency_impact: {
        Args: { p_task_id: string }
        Returns: undefined
      }
      recalculate_task_progress_from_rdo: {
        Args: { p_daily_report_id: string }
        Returns: undefined
      }
      refresh_engagement_status: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      register_purchase: {
        Args: {
          _budget_version_item_id?: string
          _description: string
          _invoice_date?: string
          _invoice_number?: string
          _notes?: string
          _obra_id: string
          _package_id?: string
          _quantity?: number
          _supplier_id?: string
          _total_amount: number
          _unit_price?: number
        }
        Returns: string
      }
      request_mce_approval: { Args: { _mce_id: string }; Returns: Json }
      seed_default_estrutura_cost_centers: {
        Args: { _org_id: string }
        Returns: undefined
      }
      seed_quality_specs_catalog: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      sync_onboarding_progress: {
        Args: { p_user_id: string }
        Returns: undefined
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
      validate_formula: { Args: { p_formula: string }; Returns: boolean }
    }
    Enums: {
      cost_nature: "MO" | "MAT" | "SRV" | "INS" | "ALU" | "DIV"
      icf_assistant_plan_kind:
        | "arquitetura"
        | "estrutural"
        | "icf"
        | "desconhecido"
      icf_source_type:
        | "extraido_planta"
        | "calculado_sistema"
        | "sugerido_axia"
        | "confirmado_utilizador"
      mce_approval_decision: "pendente" | "aprovado" | "rejeitado" | "devolvido"
      mce_approval_level:
        | "gestor_obra"
        | "direcao_geral"
        | "financeiro"
        | "administracao"
      mce_category: "SUB" | "SRV" | "MAT" | "MO" | "INS" | "ALU"
      mce_proposal_status:
        | "pendente"
        | "recebida"
        | "incompleta"
        | "validada"
        | "excluida"
        | "selecionada"
      mce_status:
        | "rascunho"
        | "em_consulta"
        | "propostas_recebidas"
        | "em_analise"
        | "validacao_tecnica"
        | "validacao_financeira"
        | "em_aprovacao"
        | "aprovado"
        | "adjudicado"
        | "em_execucao"
        | "fechado"
        | "cancelado"
      pricebook_status_enum: "draft" | "published" | "archived"
      quote_request_status_enum:
        | "open"
        | "sent"
        | "in_review"
        | "closed"
        | "cancelled"
      quote_response_status_enum: "sent" | "accepted" | "rejected" | "withdrawn"
      quote_supplier_status_enum:
        | "invited"
        | "viewed"
        | "responded"
        | "declined"
        | "expired"
      regime_fiscal_tipo: "normal" | "reduzido" | "autoliquidacao" | "isento"
      supplier_status_enum: "pending" | "active" | "suspended"
      tipo_cliente_fiscal:
        | "particular"
        | "empresa"
        | "construtor"
        | "entidade_publica"
      tipo_obra_fiscal:
        | "construcao_nova"
        | "reabilitacao_urbana"
        | "renovacao_habitacao"
        | "manutencao"
        | "obra_publica"
      tipo_operacao_fiscal:
        | "empreitada"
        | "subempreitada"
        | "servicos"
        | "materiais"
        | "mao_obra"
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
    Enums: {
      cost_nature: ["MO", "MAT", "SRV", "INS", "ALU", "DIV"],
      icf_assistant_plan_kind: [
        "arquitetura",
        "estrutural",
        "icf",
        "desconhecido",
      ],
      icf_source_type: [
        "extraido_planta",
        "calculado_sistema",
        "sugerido_axia",
        "confirmado_utilizador",
      ],
      mce_approval_decision: ["pendente", "aprovado", "rejeitado", "devolvido"],
      mce_approval_level: [
        "gestor_obra",
        "direcao_geral",
        "financeiro",
        "administracao",
      ],
      mce_category: ["SUB", "SRV", "MAT", "MO", "INS", "ALU"],
      mce_proposal_status: [
        "pendente",
        "recebida",
        "incompleta",
        "validada",
        "excluida",
        "selecionada",
      ],
      mce_status: [
        "rascunho",
        "em_consulta",
        "propostas_recebidas",
        "em_analise",
        "validacao_tecnica",
        "validacao_financeira",
        "em_aprovacao",
        "aprovado",
        "adjudicado",
        "em_execucao",
        "fechado",
        "cancelado",
      ],
      pricebook_status_enum: ["draft", "published", "archived"],
      quote_request_status_enum: [
        "open",
        "sent",
        "in_review",
        "closed",
        "cancelled",
      ],
      quote_response_status_enum: ["sent", "accepted", "rejected", "withdrawn"],
      quote_supplier_status_enum: [
        "invited",
        "viewed",
        "responded",
        "declined",
        "expired",
      ],
      regime_fiscal_tipo: ["normal", "reduzido", "autoliquidacao", "isento"],
      supplier_status_enum: ["pending", "active", "suspended"],
      tipo_cliente_fiscal: [
        "particular",
        "empresa",
        "construtor",
        "entidade_publica",
      ],
      tipo_obra_fiscal: [
        "construcao_nova",
        "reabilitacao_urbana",
        "renovacao_habitacao",
        "manutencao",
        "obra_publica",
      ],
      tipo_operacao_fiscal: [
        "empreitada",
        "subempreitada",
        "servicos",
        "materiais",
        "mao_obra",
      ],
    },
  },
} as const
