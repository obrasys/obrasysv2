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
          margem_lucro_artigo: number | null
          ordem: number
          preco_base: number | null
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
          margem_lucro_artigo?: number | null
          ordem?: number
          preco_base?: number | null
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
          margem_lucro_artigo?: number | null
          ordem?: number
          preco_base?: number | null
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
      company_ai_settings: {
        Row: {
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
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          fornecedor_id: string | null
          id: string
          obra_id: string | null
          orcamento_id: string | null
          origem: string
          pago: boolean
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
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          obra_id?: string | null
          orcamento_id?: string | null
          origem: string
          pago?: boolean
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
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          obra_id?: string | null
          orcamento_id?: string | null
          origem?: string
          pago?: boolean
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
            foreignKeyName: "contas_financeiras_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      orcamentos: {
        Row: {
          cliente_id: string | null
          codigo: string | null
          created_at: string
          custos_indiretos: Json | null
          data_criacao: string
          data_envio: string | null
          id: string
          margem_lucro: number | null
          numero_revisao: number | null
          obra_id: string | null
          revisao_de: string | null
          status: string
          titulo: string
          updated_at: string
          user_id: string
          valor_total: number | null
        }
        Insert: {
          cliente_id?: string | null
          codigo?: string | null
          created_at?: string
          custos_indiretos?: Json | null
          data_criacao?: string
          data_envio?: string | null
          id?: string
          margem_lucro?: number | null
          numero_revisao?: number | null
          obra_id?: string | null
          revisao_de?: string | null
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
          valor_total?: number | null
        }
        Update: {
          cliente_id?: string | null
          codigo?: string | null
          created_at?: string
          custos_indiretos?: Json | null
          data_criacao?: string
          data_envio?: string | null
          id?: string
          margem_lucro?: number | null
          numero_revisao?: number | null
          obra_id?: string | null
          revisao_de?: string | null
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
          {
            foreignKeyName: "orcamentos_revisao_de_fkey"
            columns: ["revisao_de"]
            isOneToOne: false
            referencedRelation: "orcamentos"
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
          criado_por: string | null
          data: string
          fotos: string[] | null
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
          fotos?: string[] | null
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
          fotos?: string[] | null
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
      subempreiteiros: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          endereco: string | null
          especialidade: string | null
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
          created_at: string
          delivery_capability: string | null
          id: string
          is_certified: boolean
          legal_name: string
          location_district: string | null
          location_municipality: string | null
          logo_url: string | null
          min_order_value: number | null
          nif: string | null
          payment_terms: string | null
          phone: string | null
          rating_avg: number | null
          rating_count: number | null
          service_areas: string | null
          sla_response_hours: number | null
          status: Database["public"]["Enums"]["supplier_status_enum"]
          trade_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_capability?: string | null
          id?: string
          is_certified?: boolean
          legal_name?: string
          location_district?: string | null
          location_municipality?: string | null
          logo_url?: string | null
          min_order_value?: number | null
          nif?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          service_areas?: string | null
          sla_response_hours?: number | null
          status?: Database["public"]["Enums"]["supplier_status_enum"]
          trade_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_capability?: string | null
          id?: string
          is_certified?: boolean
          legal_name?: string
          location_district?: string | null
          location_municipality?: string | null
          logo_url?: string | null
          min_order_value?: number | null
          nif?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          service_areas?: string | null
          sla_response_hours?: number | null
          status?: Database["public"]["Enums"]["supplier_status_enum"]
          trade_name?: string | null
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "tarefas_cronograma_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
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
      user_onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          first_login_done: boolean | null
          id: string
          onboarding_dismissed: boolean | null
          step_1_completed: boolean | null
          step_2_completed: boolean | null
          step_3_completed: boolean | null
          step_4_completed: boolean | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          first_login_done?: boolean | null
          id?: string
          onboarding_dismissed?: boolean | null
          step_1_completed?: boolean | null
          step_2_completed?: boolean | null
          step_3_completed?: boolean | null
          step_4_completed?: boolean | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          first_login_done?: boolean | null
          id?: string
          onboarding_dismissed?: boolean | null
          step_1_completed?: boolean | null
          step_2_completed?: boolean | null
          step_3_completed?: boolean | null
          step_4_completed?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
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
    }
    Functions: {
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
      generate_orcamento_codigo: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_next_auto_number: { Args: { p_obra_id: string }; Returns: number }
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
      is_obra_owner: { Args: { _obra_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_supplier: { Args: { _user_id?: string }; Returns: boolean }
      normalizar_descricao: { Args: { texto: string }; Returns: string }
      refresh_engagement_status: {
        Args: { p_user_id: string }
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
