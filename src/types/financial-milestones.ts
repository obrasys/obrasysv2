// Financial milestones and alerts types

export type FinancialMilestoneType = 'billing' | 'receipt' | 'supplier_payment' | 'retention_release';
export type TriggerMode = 'date' | 'progress' | 'task_completion' | 'manual';
export type FinancialMilestoneStatus = 'planned' | 'forecasted' | 'triggered' | 'completed' | 'cancelled';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface FinancialMilestone {
  id: string;
  user_id: string;
  obra_id: string;
  related_task_id: string | null;
  milestone_type: FinancialMilestoneType;
  description: string;
  trigger_mode: TriggerMode;
  trigger_progress_percent: number | null;
  planned_date: string | null;
  forecast_date: string | null;
  actual_date: string | null;
  planned_amount: number;
  forecast_amount: number;
  actual_amount: number;
  status: FinancialMilestoneStatus;
  created_at: string;
  updated_at: string;
}

export interface FinancialAlert {
  id: string;
  user_id: string;
  obra_id: string;
  related_milestone_id: string | null;
  related_task_id: string | null;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  explanation_json: Record<string, any>;
  dedupe_key: string | null;
  status: AlertStatus;
  detected_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export const MILESTONE_TYPE_LABELS: Record<FinancialMilestoneType, string> = {
  billing: 'Faturação',
  receipt: 'Recebimento',
  supplier_payment: 'Pagamento a fornecedor',
  retention_release: 'Libertação de retenção',
};

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: 'Informativo',
  warning: 'Atenção',
  critical: 'Crítico',
};
