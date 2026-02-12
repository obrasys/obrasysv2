// Subempreiteiros (Subcontractors)
export interface Subempreiteiro {
  id: string;
  user_id: string;
  nome: string;
  nif?: string | null;
  email?: string | null;
  telefone?: string | null;
  especialidade?: string | null;
  endereco?: string | null;
  ativo: boolean;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubempreiteiroFormData {
  nome: string;
  nif?: string;
  email?: string;
  telefone?: string;
  especialidade?: string;
  endereco?: string;
  ativo?: boolean;
  observacoes?: string;
}

// Equipamentos (Equipment)
export type EstadoEquipamento = 'disponivel' | 'em_uso' | 'manutencao' | 'avariado' | 'abatido';

export interface Equipamento {
  id: string;
  user_id: string;
  nome: string;
  codigo?: string | null;
  categoria?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  data_aquisicao?: string | null;
  valor_aquisicao?: number | null;
  estado: EstadoEquipamento;
  localizacao?: string | null;
  obra_id?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  obra?: { nome: string } | null;
}

export interface EquipamentoFormData {
  nome: string;
  codigo?: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  data_aquisicao?: string;
  valor_aquisicao?: number;
  estado?: EstadoEquipamento;
  localizacao?: string;
  obra_id?: string;
  observacoes?: string;
}

// Equipa (Team Members)
export type TipoContrato = 'efetivo' | 'termo_certo' | 'termo_incerto' | 'prestacao_servicos' | 'estagio';

export interface EquipaMembro {
  id: string;
  user_id: string;
  nome: string;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  nif?: string | null;
  data_admissao?: string | null;
  salario_base?: number | null;
  tipo_contrato?: TipoContrato | null;
  subempreiteiro_id?: string | null;
  obra_atual_id?: string | null;
  ativo: boolean;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  subempreiteiro?: { nome: string } | null;
  obra_atual?: { nome: string } | null;
}

export interface EquipaMembroFormData {
  nome: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  nif?: string;
  data_admissao?: string;
  salario_base?: number;
  tipo_contrato?: TipoContrato;
  subempreiteiro_id?: string;
  ativo?: boolean;
  observacoes?: string;
}

// Config constants
export const ESTADO_EQUIPAMENTO_CONFIG: Record<EstadoEquipamento, { label: string; color: string }> = {
  disponivel: { label: 'Disponível', color: 'bg-green-100 text-green-800' },
  em_uso: { label: 'Em Uso', color: 'bg-blue-100 text-blue-800' },
  manutencao: { label: 'Manutenção', color: 'bg-yellow-100 text-yellow-800' },
  avariado: { label: 'Avariado', color: 'bg-red-100 text-red-800' },
  abatido: { label: 'Abatido', color: 'bg-gray-100 text-gray-800' },
};

export const TIPO_CONTRATO_CONFIG: Record<TipoContrato, { label: string }> = {
  efetivo: { label: 'Efetivo' },
  termo_certo: { label: 'Termo Certo' },
  termo_incerto: { label: 'Termo Incerto' },
  prestacao_servicos: { label: 'Prestação de Serviços' },
  estagio: { label: 'Estágio' },
};

export const CATEGORIA_EQUIPAMENTO_OPTIONS = [
  'Ferramentas Manuais',
  'Ferramentas Elétricas',
  'Máquinas Pesadas',
  'Andaimes',
  'Equipamento de Segurança',
  'Veículos',
  'Medição e Topografia',
  'Outros',
];
