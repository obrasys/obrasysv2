// Tipos para o módulo de clientes

export type NivelAcesso = 'basico' | 'intermediario' | 'completo';

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  telemovel: string | null;
  empresa: string | null;
  nif: string | null;
  endereco: string | null;
  codigo_postal: string | null;
  cidade: string | null;
  pais: string;
  nivel_acesso: NivelAcesso;
  ativo: boolean;
  observacoes: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  // Contadores opcionais
  obras_count?: number;
  orcamentos_count?: number;
}

export interface ClienteFormData {
  nome: string;
  email?: string;
  telefone?: string;
  telemovel?: string;
  empresa?: string;
  nif?: string;
  endereco?: string;
  codigo_postal?: string;
  cidade?: string;
  pais?: string;
  nivel_acesso?: NivelAcesso;
  observacoes?: string;
}

export interface CustomerAssignment {
  id: string;
  customer_id: string;
  assigned_user_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

export const NIVEL_ACESSO_CONFIG: Record<NivelAcesso, { 
  label: string; 
  color: string; 
  bgColor: string;
  description: string;
}> = {
  basico: { 
    label: 'Básico', 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted',
    description: 'Acesso apenas a informações gerais'
  },
  intermediario: { 
    label: 'Intermédio', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100',
    description: 'Acesso a orçamentos e progresso de obras'
  },
  completo: { 
    label: 'Completo', 
    color: 'text-green-600', 
    bgColor: 'bg-green-100',
    description: 'Acesso total incluindo valores financeiros'
  },
};

export const NIVEL_ACESSO_OPTIONS = [
  { value: 'basico', label: 'Básico' },
  { value: 'intermediario', label: 'Intermédio' },
  { value: 'completo', label: 'Completo' },
] as const;
