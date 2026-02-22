import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type {
  SupplierProfile,
  SupplierCategory,
  SupplierPricebook,
  SupplierPricebookItem,
  QuoteRequest,
  QuoteResponse,
  SupplierInvite,
  CreateQuoteRequestForm,
  CreateQuoteResponseForm,
} from '@/types/suppliers';

// ─── Supplier Identity ────────────────────────────────────────────────────────

export function useIsSupplier() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-supplier', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('supplier_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });
}

export function useSupplierProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['supplier-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('supplier_profiles')
        .select(`*, supplier_category_link(category_id, supplier_categories(id, name, slug))`)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as SupplierProfile | null;
    },
    enabled: !!user?.id,
  });
}

export function useUpsertSupplierProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<SupplierProfile> & { category_ids?: string[] }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { category_ids, ...profileData } = updates;

      // Upsert profile
      const { data, error } = await supabase
        .from('supplier_profiles')
        .upsert({ ...profileData, user_id: user.id }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;

      // Sync categories
      if (category_ids !== undefined && data?.id) {
        await supabase.from('supplier_category_link').delete().eq('supplier_id', data.id);
        if (category_ids.length > 0) {
          await supabase.from('supplier_category_link').insert(
            category_ids.map((cid) => ({ supplier_id: data.id, category_id: cid }))
          );
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-profile'] });
      toast({ title: 'Perfil guardado com sucesso' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao guardar perfil', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function useSupplierCategories() {
  return useQuery({
    queryKey: ['supplier-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as SupplierCategory[];
    },
  });
}

// ─── Pricebooks ───────────────────────────────────────────────────────────────

export function useSupplierPricebooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['supplier-pricebooks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: profile } = await supabase
        .from('supplier_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile) return [];

      const { data, error } = await supabase
        .from('supplier_pricebooks')
        .select('*, supplier_pricebook_items(count)')
        .eq('supplier_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SupplierPricebook[];
    },
    enabled: !!user?.id,
  });
}

export function usePricebookItems(pricebookId: string | undefined) {
  return useQuery({
    queryKey: ['pricebook-items', pricebookId],
    queryFn: async () => {
      if (!pricebookId) return [];
      const { data, error } = await supabase
        .from('supplier_pricebook_items')
        .select('*, supplier_categories(id, name, slug)')
        .eq('pricebook_id', pricebookId)
        .eq('is_active', true)
        .order('item_name');
      if (error) throw error;
      return data as SupplierPricebookItem[];
    },
    enabled: !!pricebookId,
  });
}

export function useCreatePricebook() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { name: string; valid_from?: string; valid_to?: string }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { data: profile } = await supabase
        .from('supplier_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!profile) throw new Error('Perfil de fornecedor não encontrado');

      const { data, error } = await supabase
        .from('supplier_pricebooks')
        .insert({ ...input, supplier_id: profile.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-pricebooks'] });
      toast({ title: 'Tabela de preços criada' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePricebook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupplierPricebook> & { id: string }) => {
      const { data, error } = await supabase
        .from('supplier_pricebooks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-pricebooks'] });
      toast({ title: 'Tabela atualizada' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpsertPricebookItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Partial<SupplierPricebookItem> & { pricebook_id: string; item_name: string }) => {
      const { data, error } = await supabase
        .from('supplier_pricebook_items')
        .upsert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pricebook-items', vars.pricebook_id] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao guardar artigo', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeletePricebookItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, pricebookId }: { id: string; pricebookId: string }) => {
      const { error } = await supabase.from('supplier_pricebook_items').delete().eq('id', id);
      if (error) throw error;
      return pricebookId;
    },
    onSuccess: (pricebookId) => {
      queryClient.invalidateQueries({ queryKey: ['pricebook-items', pricebookId] });
      toast({ title: 'Artigo removido' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Quote Requests (Builder) ─────────────────────────────────────────────────

export function useQuoteRequests(budgetId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['quote-requests', budgetId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      let q = supabase
        .from('quote_requests')
        .select(`
          *,
          quote_request_categories(category_id, supplier_categories(id, name, slug)),
          quote_request_suppliers(
            id, status, viewed_at, responded_at, supplier_id,
            supplier_profiles(id, legal_name, trade_name, is_certified, rating_avg, sla_response_hours)
          ),
          quote_responses(
            id, total_amount, estimated_delivery_days, notes, status, supplier_id, created_at,
            supplier_profiles(id, legal_name, trade_name, is_certified),
            quote_response_items(*)
          )
        `)
        .eq('builder_user_id', user.id)
        .order('created_at', { ascending: false });

      if (budgetId) q = q.eq('budget_id', budgetId);

      const { data, error } = await q;
      if (error) throw error;
      return data as QuoteRequest[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateQuoteRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      form,
      budgetId,
      projectId,
      locationDistrict,
      locationMunicipality,
    }: {
      form: CreateQuoteRequestForm;
      budgetId?: string;
      projectId?: string;
      locationDistrict?: string;
      locationMunicipality?: string;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');

      // Create quote request
      const { data: qr, error: qrError } = await supabase
        .from('quote_requests')
        .insert({
          builder_user_id: user.id,
          budget_id: budgetId || null,
          project_id: projectId || null,
          location_district: locationDistrict || null,
          location_municipality: locationMunicipality || null,
          requested_deadline: form.requested_deadline,
          message_to_suppliers: form.message_to_suppliers || null,
          status: 'sent',
        })
        .select()
        .single();
      if (qrError) throw qrError;

      // Link categories
      if (form.category_ids.length > 0) {
        await supabase.from('quote_request_categories').insert(
          form.category_ids.map((cid) => ({ quote_request_id: qr.id, category_id: cid }))
        );
      }

      // Invite suppliers
      if (form.supplier_ids.length > 0) {
        await supabase.from('quote_request_suppliers').insert(
          form.supplier_ids.map((sid) => ({ quote_request_id: qr.id, supplier_id: sid }))
        );
      }

      // Trigger notification edge function
      try {
        const { error: notifyError } = await supabase.functions.invoke('notify-supplier', {
          body: { quote_request_id: qr.id, supplier_ids: form.supplier_ids },
        });
        if (notifyError) {
          console.error('notify-supplier error:', notifyError);
        }
      } catch (notifyErr) {
        console.error('notify-supplier exception:', notifyErr);
      }

      return qr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
      toast({ title: 'Pedido de cotação enviado!', description: 'Os fornecedores serão notificados.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao enviar pedido', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Quote Requests (Supplier) ────────────────────────────────────────────────

export function useSupplierQuoteRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['supplier-quote-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: profile } = await supabase
        .from('supplier_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile) return [];

      const { data, error } = await supabase
        .from('quote_request_suppliers')
        .select(`
          *,
          quote_requests(
            id, location_district, location_municipality, requested_deadline,
            message_to_suppliers, status, created_at,
            quote_request_categories(supplier_categories(id, name, slug))
          )
        `)
        .eq('supplier_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useMarkQuoteViewed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteRequestSupplierId: string) => {
      const { error } = await supabase
        .from('quote_request_suppliers')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', quoteRequestSupplierId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-quote-requests'] });
    },
  });
}

export function useDeclineQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quoteRequestSupplierId: string) => {
      const { error } = await supabase
        .from('quote_request_suppliers')
        .update({ status: 'declined' })
        .eq('id', quoteRequestSupplierId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-quote-requests'] });
      toast({ title: 'Pedido recusado' });
    },
  });
}

// ─── Quote Responses (Supplier) ───────────────────────────────────────────────

export function useCreateQuoteResponse() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      quoteRequestId,
      form,
      quoteRequestSupplierId,
    }: {
      quoteRequestId: string;
      form: CreateQuoteResponseForm;
      quoteRequestSupplierId: string;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { data: profile } = await supabase
        .from('supplier_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!profile) throw new Error('Perfil de fornecedor não encontrado');

      // Calculate total
      const total = form.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

      // Create response
      const { data: resp, error: respError } = await supabase
        .from('quote_responses')
        .insert({
          quote_request_id: quoteRequestId,
          supplier_id: profile.id,
          total_amount: total,
          estimated_delivery_days: form.estimated_delivery_days || null,
          notes: form.notes || null,
          status: 'sent',
        })
        .select()
        .single();
      if (respError) throw respError;

      // Create items
      if (form.items.length > 0) {
        const { error: itemsError } = await supabase.from('quote_response_items').insert(
          form.items.map((item) => ({
            quote_response_id: resp.id,
            item_name: item.item_name,
            unit: item.unit,
            qty: item.qty,
            unit_price: item.unit_price,
            vat_rate: item.vat_rate,
            line_total: item.qty * item.unit_price,
            lead_time_days: item.lead_time_days || 1,
            notes: item.notes || null,
            source_pricebook_item_id: item.source_pricebook_item_id || null,
          }))
        );
        if (itemsError) throw itemsError;
      }

      // Update quote_request_suppliers status
      await supabase
        .from('quote_request_suppliers')
        .update({ status: 'responded', responded_at: new Date().toISOString() })
        .eq('id', quoteRequestSupplierId);

      return resp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-quote-requests'] });
      toast({ title: 'Proposta enviada com sucesso!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao enviar proposta', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Supplier Reviews ─────────────────────────────────────────────────────────

export interface SupplierReview {
  id: string;
  supplier_id: string;
  reviewer_id: string;
  quote_request_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch all reviews for a given supplier (for the drawer). */
export function useSupplierReviews(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-reviews', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      const { data, error } = await supabase
        .from('supplier_reviews')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SupplierReview[];
    },
    enabled: !!supplierId,
  });
}

/** Fetch the current user's review for a specific supplier (to allow editing). */
export function useMySupplierReview(supplierId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-supplier-review', supplierId, user?.id],
    queryFn: async () => {
      if (!supplierId || !user?.id) return null;
      const { data } = await supabase
        .from('supplier_reviews')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('reviewer_id', user.id)
        .maybeSingle();
      return data as SupplierReview | null;
    },
    enabled: !!supplierId && !!user?.id,
  });
}

/** Submit (insert or update) a review for a supplier. */
export function useSubmitSupplierReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      supplierId,
      quoteRequestId,
      rating,
      comment,
    }: {
      supplierId: string;
      quoteRequestId?: string;
      rating: number;
      comment?: string;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');

      const payload = {
        supplier_id: supplierId,
        reviewer_id: user.id,
        quote_request_id: quoteRequestId || null,
        rating,
        comment: comment?.trim() || null,
      };

      // Upsert: if builder already reviewed this supplier, update it
      const { data, error } = await supabase
        .from('supplier_reviews')
        .upsert(payload, { onConflict: 'supplier_id,reviewer_id' })
        .select()
        .single();
      if (error) throw error;
      return data as SupplierReview;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-reviews', data.supplier_id] });
      queryClient.invalidateQueries({ queryKey: ['my-supplier-review', data.supplier_id] });
      queryClient.invalidateQueries({ queryKey: ['discover-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['available-suppliers'] });
      toast({ title: 'Avaliação submetida!', description: 'Obrigado pelo seu feedback.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao submeter avaliação', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Supplier Discovery (for builders) ───────────────────────────────────────

export interface DiscoverSuppliersFilters {
  search?: string;
  district?: string;
  categoryIds?: string[];
  certifiedOnly?: boolean;
}

export function useDiscoverSuppliers(filters: DiscoverSuppliersFilters = {}) {
  const { search = '', district = '', categoryIds = [], certifiedOnly = false } = filters;
  return useQuery({
    queryKey: ['discover-suppliers', search, district, categoryIds, certifiedOnly],
    queryFn: async () => {
      let supplierIds: string[] | null = null;

      // Filter by category via join table
      if (categoryIds.length > 0) {
        const { data: links } = await supabase
          .from('supplier_category_link')
          .select('supplier_id')
          .in('category_id', categoryIds);
        supplierIds = [...new Set(links?.map((l) => l.supplier_id) || [])];
        if (supplierIds.length === 0) return [];
      }

      let q = supabase
        .from('supplier_profiles')
        .select(`*, supplier_category_link(category_id, supplier_categories(id, name, slug))`)
        .eq('status', 'active')
        .order('is_certified', { ascending: false })
        .order('rating_avg', { ascending: false });

      if (district) q = q.eq('location_district', district);
      if (certifiedOnly) q = q.eq('is_certified', true);
      if (supplierIds) q = q.in('id', supplierIds);

      const { data, error } = await q;
      if (error) throw error;

      // Client-side search by name
      let result = (data as SupplierProfile[]) || [];
      if (search.trim()) {
        const s = search.toLowerCase();
        result = result.filter(
          (p) =>
            p.legal_name?.toLowerCase().includes(s) ||
            p.trade_name?.toLowerCase().includes(s)
        );
      }
      return result;
    },
    enabled: true,
  });
}

export function useAvailableSuppliers(categoryIds: string[]) {
  return useQuery({
    queryKey: ['available-suppliers', categoryIds],
    queryFn: async () => {
      if (categoryIds.length === 0) {
        const { data, error } = await supabase
          .from('supplier_profiles')
          .select(`*, supplier_category_link(category_id, supplier_categories(id, name, slug))`)
          .eq('status', 'active')
          .order('is_certified', { ascending: false })
          .order('rating_avg', { ascending: false });
        if (error) throw error;
        return data as SupplierProfile[];
      }

      // Get suppliers that have at least one of the requested categories
      const { data: links } = await supabase
        .from('supplier_category_link')
        .select('supplier_id')
        .in('category_id', categoryIds);

      const supplierIds = [...new Set(links?.map((l) => l.supplier_id) || [])];
      if (supplierIds.length === 0) return [];

      const { data, error } = await supabase
        .from('supplier_profiles')
        .select(`*, supplier_category_link(category_id, supplier_categories(id, name, slug))`)
        .eq('status', 'active')
        .in('id', supplierIds)
        .order('is_certified', { ascending: false })
        .order('rating_avg', { ascending: false });
      if (error) throw error;
      return data as SupplierProfile[];
    },
    enabled: true,
  });
}

// ─── Admin: Invites ───────────────────────────────────────────────────────────

export function useSupplierInvites() {
  return useQuery({
    queryKey: ['supplier-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_invites')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SupplierInvite[];
    },
  });
}

export function useCreateSupplierInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('supplier_invites')
        .insert({ email, invited_by_admin_user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      // Send invite email
      const { error: emailError } = await supabase.functions.invoke('send-supplier-invite', {
        body: { invite_id: data.id },
      });
      if (emailError) {
        console.error('Error sending invite email:', emailError);
      }

      return data as SupplierInvite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-invites'] });
      toast({ title: 'Convite enviado com sucesso', description: 'O fornecedor receberá um email com o link de acesso.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar convite', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAdminSupplierProfiles() {
  return useQuery({
    queryKey: ['admin-supplier-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_profiles')
        .select(`*, supplier_category_link(supplier_categories(id, name))`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SupplierProfile[];
    },
  });
}

export function useToggleSupplierCertification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isCertified, status }: { id: string; isCertified: boolean; status: 'active' | 'pending' | 'suspended' }) => {
      const { error } = await supabase
        .from('supplier_profiles')
        .update({ is_certified: isCertified, status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-supplier-profiles'] });
      toast({ title: 'Fornecedor atualizado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}
