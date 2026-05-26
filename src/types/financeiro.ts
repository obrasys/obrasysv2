// Tipos para o módulo financeiro

export type TipoConta = 'pagar' | 'receber';
export type OrigemConta = 'mao_de_obra' | 'material' | 'outros';

export interface ContaFinanceira {
  id: string;
  obra_id: string | null;
  orcamento_id: string | null;
  tipo: TipoConta;
  origem: OrigemConta;
  valor: number;
  descricao: string | null;
  data_vencimento: string;
  pago: boolean;
  data_pagamento: string | null;
  colaborador_id: string | null;
  fornecedor_id: string | null;
  cliente_id: string | null;
  comprovante_url: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  obra?: {
    id: string;
    nome: string;
  };
  fornecedor?: {
    id: string;
    nome: string;
  };
  cliente?: {
    id: string;
    nome: string;
  };
  colaborador?: {
    id: string;
    nome: string;
  };
}

export interface FinanceiroObra {
  id: string;
  obra_id: string;
  valor_contrato: number;
  valor_faturado: number;
  valor_recebido: number;
  created_at: string;
  updated_at: string;
  obra?: {
    id: string;
    nome: string;
  };
}

export interface Fornecedor {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  nif: string | null;
  area_atuacao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const AREAS_ATUACAO_FORNECEDOR = [
  'Carpintaria',
  'Eletricidade',
  'Canalização',
  'Pichelaria',
  'Pedreiro / Alvenaria',
  'Pintura',
  'Serralharia',
  'Pavimentos',
  'Vidraçaria',
  'Climatização (AVAC)',
  'Estuque / Tetos Falsos',
  'Isolamentos',
  'Cobertura',
  'Jardinagem',
  'Movimentação de Terras',
  'Materiais de Construção',
  'Transporte / Logística',
  'Equipamentos / Aluguer',
  'Outros',
] as const;

export type AreaAtuacaoFornecedor = typeof AREAS_ATUACAO_FORNECEDOR[number];

export interface ContaFinanceiraFormData {
  obra_id?: string;
  orcamento_id?: string;
  tipo: TipoConta;
  origem: OrigemConta;
  valor: number;
  descricao?: string;
  data_vencimento: string;
  pago?: boolean;
  data_pagamento?: string;
  colaborador_id?: string;
  fornecedor_id?: string;
  cliente_id?: string;
  categoria_id?: string;
}

export interface FornecedorFormData {
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  nif?: string;
}

// Configurações de tipos
export const TIPO_CONTA_CONFIG: Record<TipoConta, { label: string; color: string; bgColor: string }> = {
  pagar: { label: 'A Pagar', color: 'text-red-600', bgColor: 'bg-red-100' },
  receber: { label: 'A Receber', color: 'text-green-600', bgColor: 'bg-green-100' },
};

export const ORIGEM_CONTA_CONFIG: Record<OrigemConta, { label: string; icon: string }> = {
  mao_de_obra: { label: 'Mão de Obra', icon: 'Users' },
  material: { label: 'Material', icon: 'Package' },
  outros: { label: 'Outros', icon: 'MoreHorizontal' },
};

export const TIPO_CONTA_OPTIONS = [
  { value: 'pagar', label: 'A Pagar' },
  { value: 'receber', label: 'A Receber' },
] as const;

export const ORIGEM_CONTA_OPTIONS = [
  { value: 'mao_de_obra', label: 'Mão de Obra' },
  { value: 'material', label: 'Material' },
  { value: 'outros', label: 'Outros' },
] as const;
