export type ItemType = 'material' | 'insumo' | 'tool';
export type AllocationStatus = 'planned' | 'allocated' | 'delivered' | 'returned' | 'cancelled';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';
export type RequestStatus = 'requested' | 'reviewed' | 'allocated' | 'delivered' | 'cancelled';

export interface CatalogItem {
  id: string;
  user_id: string;
  item_type: ItemType;
  code: string | null;
  name: string;
  description: string | null;
  unit: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectResourceAllocation {
  id: string;
  user_id: string;
  project_id: string;
  item_id: string | null;
  item_name: string;
  item_type: ItemType;
  quantity: number;
  unit: string;
  allocation_date: string;
  status: AllocationStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  catalog_item?: CatalogItem | null;
}

export interface RdoMaterialRequest {
  id: string;
  user_id: string;
  project_id: string;
  rdo_id: string | null;
  request_date: string;
  needed_for_date: string;
  item_id: string | null;
  free_text_item_name: string | null;
  item_type: ItemType;
  quantity: number;
  unit: string;
  priority: RequestPriority;
  notes: string | null;
  status: RequestStatus;
  allocation_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AllocationFormData {
  project_id: string;
  item_id?: string;
  item_name: string;
  item_type: ItemType;
  quantity: number;
  unit: string;
  allocation_date: string;
  status?: AllocationStatus;
  notes?: string;
}

export interface MaterialRequestFormData {
  item_id?: string;
  free_text_item_name?: string;
  item_type: ItemType;
  quantity: number;
  unit: string;
  priority: RequestPriority;
  notes?: string;
}

export const ITEM_TYPE_CONFIG: Record<ItemType, { label: string; emoji: string }> = {
  material: { label: 'Material', emoji: '🧱' },
  insumo: { label: 'Insumo', emoji: '🪣' },
  tool: { label: 'Ferramenta', emoji: '🔧' },
};

export const ALLOCATION_STATUS_CONFIG: Record<AllocationStatus, { label: string; color: string }> = {
  planned: { label: 'Planeado', color: 'bg-muted text-muted-foreground' },
  allocated: { label: 'Alocado', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800' },
  returned: { label: 'Devolvido', color: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

export const REQUEST_PRIORITY_CONFIG: Record<RequestPriority, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' },
};

export const REQUEST_STATUS_CONFIG: Record<RequestStatus, { label: string; color: string }> = {
  requested: { label: 'Pedido', color: 'bg-yellow-100 text-yellow-800' },
  reviewed: { label: 'Revisto', color: 'bg-blue-100 text-blue-800' },
  allocated: { label: 'Alocado', color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

export const UNIT_OPTIONS = [
  { value: 'un', label: 'un' },
  { value: 'kg', label: 'kg' },
  { value: 'l', label: 'L' },
  { value: 'm', label: 'm' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'saco', label: 'saco' },
  { value: 'caixa', label: 'caixa' },
  { value: 'rolo', label: 'rolo' },
  { value: 'par', label: 'par' },
] as const;
