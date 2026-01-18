// Tipos para o módulo de RDOs (Relatórios Diários de Obra)

export type RDOStatus = 'rascunho' | 'submetido' | 'aprovado';

export interface TrabalhoQuantificado {
  id: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  artigo_id?: string;
}

export interface RelatorioDiario {
  id: string;
  obra_id: string;
  user_id: string;
  data: string;
  trabalhos_executados: string | null;
  ocorrencias: string | null;
  observacoes: string | null;
  trabalhos_quantificados: TrabalhoQuantificado[];
  condicoes_meteorologicas: string | null;
  mao_de_obra_presente: number;
  status: RDOStatus;
  criado_por: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  created_at: string;
  updated_at: string;
  // Relações
  obra?: {
    id: string;
    nome: string;
    cliente?: string | null;
  };
}

export interface RDOFormData {
  obra_id: string;
  data: string;
  trabalhos_executados?: string;
  ocorrencias?: string;
  observacoes?: string;
  trabalhos_quantificados?: TrabalhoQuantificado[];
  condicoes_meteorologicas?: string;
  mao_de_obra_presente?: number;
  status?: RDOStatus;
}

// Helper to parse trabalhos_quantificados from JSON
export function parseTrabalhos(data: unknown): TrabalhoQuantificado[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data as TrabalhoQuantificado[];
  }
  return [];
}

export const RDO_STATUS_CONFIG: Record<RDOStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
}> = {
  rascunho: { 
    label: 'Rascunho', 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted',
  },
  submetido: { 
    label: 'Submetido', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100',
  },
  aprovado: { 
    label: 'Aprovado', 
    color: 'text-green-600', 
    bgColor: 'bg-green-100',
  },
};

export const RDO_STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'submetido', label: 'Submetido' },
  { value: 'aprovado', label: 'Aprovado' },
] as const;

export const CONDICOES_METEOROLOGICAS = [
  { value: 'bom', label: '☀️ Bom tempo' },
  { value: 'nublado', label: '☁️ Nublado' },
  { value: 'chuva_fraca', label: '🌧️ Chuva fraca' },
  { value: 'chuva_forte', label: '⛈️ Chuva forte' },
  { value: 'vento', label: '💨 Vento forte' },
  { value: 'frio', label: '❄️ Frio intenso' },
  { value: 'calor', label: '🌡️ Calor intenso' },
] as const;
