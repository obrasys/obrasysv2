export type CostCenterType = 'estrutura' | 'obra';

export type CostNature = 'MO' | 'MAT' | 'SRV' | 'INS' | 'ALU' | 'DIV';

export const COST_NATURE_LABELS: Record<CostNature, string> = {
  MO: 'Mão de Obra',
  MAT: 'Materiais',
  SRV: 'Serviços / Subempreitadas',
  INS: 'Instalações Técnicas',
  ALU: 'Alugueres / Equipamentos',
  DIV: 'Diversos',
};

export const COST_NATURE_OPTIONS: CostNature[] = ['MO', 'MAT', 'SRV', 'INS', 'ALU', 'DIV'];

export interface CostCenter {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  type: CostCenterType;
  parent_id: string | null;
  obra_id: string | null;
  location: string | null;
  fiscal_year: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
