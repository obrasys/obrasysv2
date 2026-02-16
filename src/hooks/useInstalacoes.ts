import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  InstallationPackage,
  InstallationCoefficient,
  InstallationCatalogItem,
  InstallationPackageItem,
  PackageFormData,
  Specialty,
} from '@/types/instalacoes';
import { calculateEstimation } from '@/lib/installations-engine';
import { DEFAULT_COEFFICIENTS } from '@/types/instalacoes';

export function useInstalacoes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id;

  // ---- Packages ----
  const packagesQuery = useQuery({
    queryKey: ['installations_packages', uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installations_packages' as any)
        .select('*, obras(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InstallationPackage[];
    },
    enabled: !!uid,
  });

  const createPackage = useMutation({
    mutationFn: async (formData: PackageFormData) => {
      if (!uid) throw new Error('Não autenticado');
      const coeffs = await loadCoeffsMap(formData.specialty);
      const catalog = await loadCatalog();
      const est = calculateEstimation(formData, coeffs, catalog);

      const { data: pkg, error } = await supabase
        .from('installations_packages' as any)
        .insert({
          user_id: uid,
          obra_id: formData.obra_id,
          specialty: formData.specialty,
          profile: formData.profile,
          complexity: formData.complexity,
          typology: formData.typology,
          area_m2: formData.area_m2,
          bathrooms: formData.bathrooms,
          bedrooms: formData.bedrooms,
          kitchen_count: formData.kitchen_count,
          extra_rooms: formData.extra_rooms,
          has_laundry: formData.has_laundry,
          points_estimated: est.points,
          linear_m_estimated: est.linearMeters,
          total_cost_estimated: est.totalCost,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Insert generated items
      if (est.items.length > 0) {
        const items = est.items.map(i => ({
          package_id: (pkg as any).id,
          catalog_item_id: i.catalogItemId || null,
          name: i.name,
          unit: i.unit,
          qty: i.qty,
          unit_cost_material: i.unitCostMaterial,
          unit_cost_labor: i.unitCostLabor,
          margin_percent: i.marginPercent,
          total_cost: i.totalCost,
        }));
        await supabase.from('installations_package_items' as any).insert(items as any);
      }

      return pkg;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installations_packages'] });
      toast.success('Pacote criado com sucesso');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('installations_packages' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installations_packages'] });
      toast.success('Pacote eliminado');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ---- Package Items ----
  const usePackageItems = (packageId: string | undefined) =>
    useQuery({
      queryKey: ['installations_package_items', packageId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('installations_package_items' as any)
          .select('*')
          .eq('package_id', packageId!)
          .order('created_at');
        if (error) throw error;
        return (data ?? []) as unknown as InstallationPackageItem[];
      },
      enabled: !!packageId,
    });

  // ---- Coefficients ----
  const coefficientsQuery = useQuery({
    queryKey: ['installations_coefficients', uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installations_coefficients' as any)
        .select('*')
        .order('specialty');
      if (error) throw error;
      return (data ?? []) as unknown as InstallationCoefficient[];
    },
    enabled: !!uid,
  });

  const initCoefficients = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error('Não autenticado');
      const allCoeffs: any[] = [];
      for (const [specialty, defs] of Object.entries(DEFAULT_COEFFICIENTS)) {
        for (const d of defs) {
          allCoeffs.push({
            user_id: uid,
            specialty,
            coefficient_key: d.key,
            value_numeric: d.value,
            description: d.description,
          });
        }
      }
      const { error } = await supabase.from('installations_coefficients' as any).upsert(allCoeffs as any, {
        onConflict: 'user_id,specialty,coefficient_key',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installations_coefficients'] });
      toast.success('Coeficientes inicializados');
    },
  });

  const updateCoefficient = useMutation({
    mutationFn: async ({ id, value_numeric }: { id: string; value_numeric: number }) => {
      const { error } = await supabase
        .from('installations_coefficients' as any)
        .update({ value_numeric } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installations_coefficients'] });
      toast.success('Coeficiente atualizado');
    },
  });

  // ---- Catalog ----
  const catalogQuery = useQuery({
    queryKey: ['installations_catalog', uid],
    queryFn: loadCatalog,
    enabled: !!uid,
  });

  async function loadCatalog(): Promise<InstallationCatalogItem[]> {
    const { data, error } = await supabase
      .from('installations_catalog_items' as any)
      .select('*')
      .eq('is_active', true)
      .order('specialty');
    if (error) throw error;
    return (data ?? []) as unknown as InstallationCatalogItem[];
  }

  async function loadCoeffsMap(specialty: Specialty): Promise<Record<string, number>> {
    const { data } = await supabase
      .from('installations_coefficients' as any)
      .select('coefficient_key, value_numeric')
      .eq('user_id', uid!)
      .eq('specialty', specialty);
    const map: Record<string, number> = {};
    if (data) {
      for (const row of data as any[]) {
        map[row.coefficient_key] = Number(row.value_numeric);
      }
    }
    return map;
  }

  return {
    packages: packagesQuery.data ?? [],
    packagesLoading: packagesQuery.isLoading,
    createPackage,
    deletePackage,
    usePackageItems,
    coefficients: coefficientsQuery.data ?? [],
    coefficientsLoading: coefficientsQuery.isLoading,
    initCoefficients,
    updateCoefficient,
    catalog: catalogQuery.data ?? [],
    catalogLoading: catalogQuery.isLoading,
  };
}
