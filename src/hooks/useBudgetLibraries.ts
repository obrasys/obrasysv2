import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface LibZone { id: string; nome: string; icone: string | null; ativo: boolean; ordem: number }
export interface LibArea { id: string; nome: string; ativo: boolean; ordem: number }
export interface LibServiceType { id: string; nome: string; ativo: boolean; ordem: number }
export interface ZoneAreaLink { id: string; zone_id: string; area_id: string }
export interface AreaServiceTypeLink { id: string; area_id: string; service_type_id: string }
export interface ServiceSuggestion { id: string; service_type_id: string; descricao: string; unidade: string | null; ordem: number }

async function getOrgId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.organization_id) throw new Error('Sem organização');
  return data.organization_id;
}

export function useBudgetLibraries() {
  const qc = useQueryClient();

  const zones = useQuery({
    queryKey: ['lib-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_zone_library')
        .select('*')
        .order('ordem');
      if (error) throw error;
      return (data || []) as LibZone[];
    },
  });

  const areas = useQuery({
    queryKey: ['lib-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_area_library')
        .select('*')
        .order('ordem');
      if (error) throw error;
      return (data || []) as LibArea[];
    },
  });

  const types = useQuery({
    queryKey: ['lib-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_service_type_library')
        .select('*')
        .order('ordem');
      if (error) throw error;
      return (data || []) as LibServiceType[];
    },
  });

  const zoneAreaLinks = useQuery({
    queryKey: ['lib-zone-area'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_zone_area_defaults')
        .select('id, zone_id, area_id');
      if (error) throw error;
      return (data || []) as ZoneAreaLink[];
    },
  });

  const areaTypeLinks = useQuery({
    queryKey: ['lib-area-type'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_service_type_suggestions')
        .select('id, area_id, service_type_id');
      if (error) throw error;
      return (data || []) as AreaServiceTypeLink[];
    },
  });

  const serviceSuggestions = useQuery({
    queryKey: ['lib-service-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_service_suggestions')
        .select('*')
        .order('ordem');
      if (error) throw error;
      return (data || []) as ServiceSuggestion[];
    },
  });

  const createZone = useMutation({
    mutationFn: async (input: { nome: string; icone?: string | null }) => {
      const organization_id = await getOrgId();
      const { data, error } = await supabase.from('org_zone_library').insert({
        organization_id, nome: input.nome.trim(), icone: input.icone ?? null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-zones'] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const createArea = useMutation({
    mutationFn: async (input: { nome: string }) => {
      const organization_id = await getOrgId();
      const { data, error } = await supabase.from('org_area_library').insert({
        organization_id, nome: input.nome.trim(),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-areas'] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const createType = useMutation({
    mutationFn: async (input: { nome: string }) => {
      const organization_id = await getOrgId();
      const { data, error } = await supabase.from('org_service_type_library').insert({
        organization_id, nome: input.nome.trim(),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-types'] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const toggleZone = useMutation({
    mutationFn: async (z: LibZone) => {
      const { error } = await supabase.from('org_zone_library').update({ ativo: !z.ativo }).eq('id', z.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-zones'] }),
  });
  const toggleArea = useMutation({
    mutationFn: async (a: LibArea) => {
      const { error } = await supabase.from('org_area_library').update({ ativo: !a.ativo }).eq('id', a.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-areas'] }),
  });
  const toggleType = useMutation({
    mutationFn: async (t: LibServiceType) => {
      const { error } = await supabase.from('org_service_type_library').update({ ativo: !t.ativo }).eq('id', t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-types'] }),
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('org_zone_library').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-zones'] }),
  });
  const deleteArea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('org_area_library').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-areas'] }),
  });
  const deleteType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('org_service_type_library').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-types'] }),
  });

  const toggleZoneAreaLink = useMutation({
    mutationFn: async (input: { zone_id: string; area_id: string; existingId?: string }) => {
      if (input.existingId) {
        const { error } = await supabase.from('org_zone_area_defaults').delete().eq('id', input.existingId);
        if (error) throw error;
      } else {
        const organization_id = await getOrgId();
        const { error } = await supabase.from('org_zone_area_defaults').insert({
          organization_id, zone_id: input.zone_id, area_id: input.area_id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-zone-area'] }),
  });

  const toggleAreaTypeLink = useMutation({
    mutationFn: async (input: { area_id: string; service_type_id: string; existingId?: string }) => {
      if (input.existingId) {
        const { error } = await supabase.from('org_service_type_suggestions').delete().eq('id', input.existingId);
        if (error) throw error;
      } else {
        const organization_id = await getOrgId();
        const { error } = await supabase.from('org_service_type_suggestions').insert({
          organization_id, area_id: input.area_id, service_type_id: input.service_type_id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lib-area-type'] }),
  });

  return {
    zones, areas, types, zoneAreaLinks, areaTypeLinks, serviceSuggestions,
    createZone, createArea, createType,
    toggleZone, toggleArea, toggleType,
    deleteZone, deleteArea, deleteType,
    toggleZoneAreaLink, toggleAreaTypeLink,
  };
}
