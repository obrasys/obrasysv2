// Tipos para o módulo de adjudicação operacional e financeira

export interface BudgetAward {
  id: string;
  user_id: string;
  budget_id: string;
  obra_id: string | null;
  awarded_by_user_id: string;
  awarded_at: string;
  awarded_total_amount: number;
  deposit_amount: number;
  deposit_percent: number;
  remaining_amount: number;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetPaymentPlan {
  id: string;
  user_id: string;
  budget_award_id: string;
  obra_id: string | null;
  installment_no: number;
  label: string;
  due_date: string;
  percent_of_award: number;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Receivable {
  id: string;
  user_id: string;
  obra_id: string | null;
  client_id: string | null;
  source_type: string;
  source_id: string | null;
  title: string;
  description: string | null;
  issue_date: string;
  due_date: string;
  amount: number;
  status: string;
  paid_amount: number;
  remaining_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  label: string;
  percent: number;
  amount: number;
  due_date: string;
}

export interface AdjudicacaoFormData {
  awarded_at: string;
  awarded_total_amount: number;
  deposit_amount: number;
  deposit_percent: number;
  notes: string;
  payment_type: 'single' | 'installments';
  installments: Installment[];
}
