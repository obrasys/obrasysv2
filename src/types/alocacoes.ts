export interface AlocacaoObra {
  id: string;
  user_id: string;
  membro_id: string;
  obra_id: string;
  data_inicio: string;
  data_fim?: string | null;
  funcao?: string | null;
  custo_hora?: number | null;
  custo_dia?: number | null;
  ativo: boolean;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  membro?: { id: string; nome: string; cargo?: string | null } | null;
  obra?: { id: string; nome: string } | null;
}

export interface AlocacaoObraFormData {
  membro_id: string;
  obra_id: string;
  data_inicio: string;
  data_fim?: string;
  funcao?: string;
  custo_hora?: number;
  custo_dia?: number;
  ativo?: boolean;
  observacoes?: string;
}
