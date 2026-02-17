// Tipos para o módulo de obras

export type ObraStatus = 'planeamento' | 'em_curso' | 'pausada' | 'concluida' | 'cancelada';

export interface Obra {
  id: string;
  user_id: string;
  nome: string;
  cliente: string | null;
  endereco: string | null;
  status: ObraStatus;
  data_inicio: string | null;
  data_fim: string | null;
  valor_previsto: number;
  arquivada: boolean;
  gestor_id: string | null;
  progresso: number;
  created_at: string;
  updated_at: string;
  gestor?: {
    id: string;
    nome: string;
    email: string;
  };
  orcamentos?: Array<{
    id: string;
    titulo: string;
    valor_total: number;
    status: string;
  }>;
}

export interface ObraProgressTracking {
  id: string;
  obra_id: string;
  capitulo_id: string | null;
  descricao: string;
  quantidade_prevista: number;
  quantidade_executada: number;
  percentagem: number;
  unidade: string;
  created_at: string;
  updated_at: string;
}

export interface ObraFormData {
  nome: string;
  cliente?: string;
  cliente_id?: string;
  endereco?: string;
  status?: ObraStatus;
  data_inicio?: string;
  data_fim?: string;
  valor_previsto?: number;
  gestor_id?: string;
}

export interface ObraProgressFormData {
  descricao: string;
  quantidade_prevista: number;
  quantidade_executada: number;
  unidade: string;
}

// Status configuration
export const OBRA_STATUS_CONFIG: Record<ObraStatus, { label: string; color: string; bgColor: string }> = {
  planeamento: { label: 'Planeamento', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  em_curso: { label: 'Em Curso', color: 'text-green-600', bgColor: 'bg-green-100' },
  pausada: { label: 'Pausada', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  concluida: { label: 'Concluída', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  cancelada: { label: 'Cancelada', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export const OBRA_STATUS_OPTIONS = [
  { value: 'planeamento', label: 'Planeamento' },
  { value: 'em_curso', label: 'Em Curso' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
] as const;
