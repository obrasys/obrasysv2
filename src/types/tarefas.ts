export type TarefaStatus = 'pendente' | 'em_progresso' | 'concluida' | 'cancelada' | 'bloqueada';
export type TarefaPrioridade = 'baixa' | 'media' | 'alta' | 'urgente';
export type CronogramaTipo = 'tarefa' | 'marco' | 'fase' | 'entrega';
export type CronogramaStatus = 'planejado' | 'em_andamento' | 'concluido' | 'atrasado' | 'cancelado';

export interface Tarefa {
  id: string;
  obra_id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  categoria: string | null;
  data_agendada: string | null;
  data_conclusao: string | null;
  responsavel_id: string | null;
  dependencias: string[];
  ordem: number;
  created_at: string;
  updated_at: string;
  obra?: {
    id: string;
    nome: string;
  };
  responsavel?: {
    id: string;
    nome: string;
  };
}

export interface TarefaCronograma {
  id: string;
  obra_id: string;
  user_id: string;
  titulo: string;
  tipo: CronogramaTipo;
  data_inicio: string;
  data_fim: string | null;
  progresso: number;
  responsavel: string | null;
  categoria: string | null;
  recursos: string | null;
  status: CronogramaStatus;
  cor: string;
  created_at: string;
  updated_at: string;
  obra?: {
    id: string;
    nome: string;
  };
}

export interface TarefaFormData {
  obra_id: string;
  titulo: string;
  descricao?: string;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  categoria?: string;
  data_agendada?: string;
  hora_agendada?: string;
  responsavel_id?: string;
  dependencias?: string[];
}

export interface CronogramaFormData {
  obra_id: string;
  titulo: string;
  tipo: CronogramaTipo;
  data_inicio: string;
  data_fim?: string;
  progresso?: number;
  responsavel?: string;
  categoria?: string;
  recursos?: string;
  status: CronogramaStatus;
  cor?: string;
}

export const TAREFA_CATEGORIAS = [
  'Fundações',
  'Estrutura',
  'Alvenaria',
  'Instalações Elétricas',
  'Instalações Hidráulicas',
  'Revestimentos',
  'Pintura',
  'Acabamentos',
  'Limpeza',
  'Documentação',
  'Outros',
] as const;

export const PRIORIDADE_CONFIG = {
  baixa: { label: 'Baixa', color: 'bg-slate-100 text-slate-700', icon: '○' },
  media: { label: 'Média', color: 'bg-blue-100 text-blue-700', icon: '◐' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700', icon: '●' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700', icon: '◉' },
} as const;

export const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-slate-100 text-slate-700' },
  em_progresso: { label: 'Em Progresso', color: 'bg-blue-100 text-blue-700' },
  concluida: { label: 'Concluída', color: 'bg-green-100 text-green-700' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  bloqueada: { label: 'Bloqueada', color: 'bg-yellow-100 text-yellow-700' },
} as const;

export const CRONOGRAMA_STATUS_CONFIG = {
  planejado: { label: 'Planejado', color: 'bg-slate-100 text-slate-700' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
  atrasado: { label: 'Atrasado', color: 'bg-red-100 text-red-700' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700' },
} as const;

export const CRONOGRAMA_TIPO_CONFIG = {
  tarefa: { label: 'Tarefa', color: '#3b82f6' },
  marco: { label: 'Marco', color: '#8b5cf6' },
  fase: { label: 'Fase', color: '#10b981' },
  entrega: { label: 'Entrega', color: '#f59e0b' },
} as const;
