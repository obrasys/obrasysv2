import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type {
  CatalogItem,
  ProjectResourceAllocation,
  RdoMaterialRequest,
  AllocationFormData,
  MaterialRequestFormData,
  ItemType,
} from '@/types/project-resources';

export function useCatalogItems() {
  const { user } = useAuth();

  const { data: items, isLoading } = useQuery({
    queryKey: ['catalog-items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as CatalogItem[];
    },
    enabled: !!user,
  });

  return { items: items || [], isLoading };
}

export function useProjectAllocations(projectId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['project-allocations', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_resource_allocations')
        .select('*')
        .eq('project_id', projectId)
        .order('allocation_date', { ascending: false });
      if (error) throw error;
      return data as ProjectResourceAllocation[];
    },
    enabled: !!user && !!projectId,
  });

  const createAllocation = useMutation({
    mutationFn: async (form: AllocationFormData) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('project_resource_allocations')
        .insert({
          user_id: user.id,
          project_id: form.project_id,
          item_id: form.item_id || null,
          item_name: form.item_name,
          item_type: form.item_type,
          quantity: form.quantity,
          unit: form.unit,
          allocation_date: form.allocation_date,
          status: form.status || 'planned',
          notes: form.notes || null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-allocations'] });
      toast({ title: 'Destinação criada', description: 'O item foi destinado à obra.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  const updateAllocationStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('project_resource_allocations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-allocations'] });
      toast({ title: 'Estado atualizado' });
    },
  });

  const deleteAllocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_resource_allocations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-allocations'] });
      toast({ title: 'Destinação eliminada' });
    },
  });

  return { allocations: allocations || [], isLoading, createAllocation, updateAllocationStatus, deleteAllocation };
}

export function useProjectMaterialRequests(projectId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['material-requests', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('rdo_material_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('needed_for_date', { ascending: true });
      if (error) throw error;
      return data as RdoMaterialRequest[];
    },
    enabled: !!user && !!projectId,
  });

  const createRequest = useMutation({
    mutationFn: async (form: MaterialRequestFormData & { project_id: string; rdo_id?: string; needed_for_date: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('rdo_material_requests')
        .insert({
          user_id: user.id,
          project_id: form.project_id,
          rdo_id: form.rdo_id || null,
          request_date: new Date().toISOString().split('T')[0],
          needed_for_date: form.needed_for_date,
          item_id: form.item_id || null,
          free_text_item_name: form.free_text_item_name || null,
          item_type: form.item_type,
          quantity: form.quantity,
          unit: form.unit,
          priority: form.priority,
          notes: form.notes || null,
          status: 'requested',
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast({ title: 'Pedido criado', description: 'Necessidade registada com sucesso.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('rdo_material_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast({ title: 'Estado atualizado' });
    },
  });

  const convertToAllocation = useMutation({
    mutationFn: async (request: RdoMaterialRequest) => {
      if (!user) throw new Error('Não autenticado');
      // Create allocation
      const { data: allocation, error: allocError } = await supabase
        .from('project_resource_allocations')
        .insert({
          user_id: user.id,
          project_id: request.project_id,
          item_id: request.item_id,
          item_name: request.free_text_item_name || 'Item do catálogo',
          item_type: request.item_type,
          quantity: request.quantity,
          unit: request.unit,
          allocation_date: request.needed_for_date,
          status: 'allocated',
          notes: `Convertido de pedido RDO. ${request.notes || ''}`.trim(),
          created_by: user.id,
        })
        .select()
        .single();
      if (allocError) throw allocError;

      // Update request status
      const { error: updateError } = await supabase
        .from('rdo_material_requests')
        .update({ status: 'allocated', allocation_id: allocation.id })
        .eq('id', request.id);
      if (updateError) throw updateError;

      return allocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['project-allocations'] });
      toast({ title: 'Convertido em destinação', description: 'O pedido foi convertido em destinação real.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  return { requests: requests || [], isLoading, createRequest, updateRequestStatus, convertToAllocation };
}

export function useCatalogItemsMutation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createItem = useMutation({
    mutationFn: async (form: { name: string; item_type: ItemType; unit: string; code?: string; description?: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('catalog_items')
        .insert({
          user_id: user.id,
          name: form.name,
          item_type: form.item_type,
          unit: form.unit,
          code: form.code || null,
          description: form.description || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
      toast({ title: 'Item criado', description: 'Item adicionado ao catálogo.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  return { createItem };
}

export function useProjectResourceSummary(projectId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-resource-summary', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [allocsWeek, toolsActive, pendingRequests] = await Promise.all([
        supabase
          .from('project_resource_allocations')
          .select('id', { count: 'exact' })
          .eq('project_id', projectId)
          .gte('allocation_date', weekAgo)
          .neq('status', 'cancelled'),
        supabase
          .from('project_resource_allocations')
          .select('id', { count: 'exact' })
          .eq('project_id', projectId)
          .eq('item_type', 'tool')
          .in('status', ['allocated', 'delivered']),
        supabase
          .from('rdo_material_requests')
          .select('id', { count: 'exact' })
          .eq('project_id', projectId)
          .in('status', ['requested', 'reviewed'])
          .gte('needed_for_date', today),
      ]);

      return {
        allocationsThisWeek: allocsWeek.count || 0,
        activeTools: toolsActive.count || 0,
        pendingRequests: pendingRequests.count || 0,
      };
    },
    enabled: !!user && !!projectId,
  });
}
