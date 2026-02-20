// ============================================================
// TIPOS: MÓDULO REDE DE FORNECEDORES CERTIFICADOS
// ============================================================

export type SupplierStatus = 'pending' | 'active' | 'suspended';
export type QuoteRequestStatus = 'open' | 'sent' | 'in_review' | 'closed' | 'cancelled';
export type QuoteSupplierStatus = 'invited' | 'viewed' | 'responded' | 'declined' | 'expired';
export type QuoteResponseStatus = 'sent' | 'accepted' | 'rejected' | 'withdrawn';
export type PricebookStatus = 'draft' | 'published' | 'archived';

export interface SupplierCategory {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface SupplierProfile {
  id: string;
  user_id: string;
  legal_name: string;
  trade_name: string | null;
  service_areas: string | null;
  delivery_capability: string | null;
  sla_response_hours: number;
  min_order_value: number;
  payment_terms: string | null;
  rating_avg: number;
  rating_count: number;
  is_certified: boolean;
  logo_url: string | null;
  status: SupplierStatus;
  location_district: string | null;
  location_municipality: string | null;
  phone: string | null;
  nif: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  categories?: SupplierCategory[];
}

export interface SupplierCategoryLink {
  id: string;
  supplier_id: string;
  category_id: string;
}

export interface SupplierPricebook {
  id: string;
  supplier_id: string;
  name: string;
  currency: string;
  valid_from: string | null;
  valid_to: string | null;
  status: PricebookStatus;
  created_at: string;
  updated_at: string;
  // Joined
  items?: SupplierPricebookItem[];
}

export interface SupplierPricebookItem {
  id: string;
  pricebook_id: string;
  category_id: string | null;
  item_code: string | null;
  item_name: string;
  description: string | null;
  unit: string;
  base_price: number;
  vat_rate: number;
  lead_time_days: number;
  min_qty: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  category?: SupplierCategory;
}

export interface QuoteRequest {
  id: string;
  builder_user_id: string;
  project_id: string | null;
  budget_id: string | null;
  location_district: string | null;
  location_municipality: string | null;
  requested_deadline: string | null;
  status: QuoteRequestStatus;
  message_to_suppliers: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  categories?: SupplierCategory[];
  suppliers?: QuoteRequestSupplier[];
  responses?: QuoteResponse[];
}

export interface QuoteRequestSupplier {
  id: string;
  quote_request_id: string;
  supplier_id: string;
  status: QuoteSupplierStatus;
  viewed_at: string | null;
  responded_at: string | null;
  created_at: string;
  // Joined
  supplier?: SupplierProfile;
}

export interface QuoteResponse {
  id: string;
  quote_request_id: string;
  supplier_id: string;
  total_amount: number;
  currency: string;
  estimated_delivery_days: number | null;
  notes: string | null;
  attachment_urls: string[] | null;
  status: QuoteResponseStatus;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: SupplierProfile;
  items?: QuoteResponseItem[];
}

export interface QuoteResponseItem {
  id: string;
  quote_response_id: string;
  source_pricebook_item_id: string | null;
  item_name: string;
  unit: string;
  qty: number;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  lead_time_days: number;
  notes: string | null;
  created_at: string;
}

export interface SupplierInvite {
  id: string;
  email: string;
  invited_by_admin_user_id: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// Forms
export interface CreateQuoteRequestForm {
  category_ids: string[];
  requested_deadline: string;
  message_to_suppliers?: string;
  supplier_ids: string[];
}

export interface CreateQuoteResponseForm {
  notes?: string;
  estimated_delivery_days?: number;
  items: {
    item_name: string;
    unit: string;
    qty: number;
    unit_price: number;
    vat_rate: number;
    lead_time_days?: number;
    notes?: string;
    source_pricebook_item_id?: string;
  }[];
}
