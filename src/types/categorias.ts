// Tipos para categorias financeiras personalizadas

import type { OrigemConta } from './financeiro';

export interface CategoriaFinanceira {
  id: string;
  user_id: string;
  nome: string;
  origem: OrigemConta;
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoriaFormData {
  nome: string;
  origem: OrigemConta;
  cor?: string;
}

export const CORES_CATEGORIA = [
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#eab308', label: 'Amarelo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#6b7280', label: 'Cinza' },
] as const;
