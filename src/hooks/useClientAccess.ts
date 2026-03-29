import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if the current user has active client_obra_access records.
 * Used to conditionally show portal navigation for non-cliente users.
 */
export function useClientAccess() {
  const { user, profile } = useAuth();

  const { data: hasClientAccess = false, isLoading } = useQuery({
    queryKey: ['client-access-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      // cliente role users always have access
      if (profile?.role === 'cliente') return true;

      const { data, error } = await supabase
        .from('client_obra_access')
        .select('id')
        .eq('client_user_id', user.id)
        .eq('ativo', true)
        .limit(1);

      if (error) return false;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user?.id && profile?.role !== 'cliente',
    staleTime: 5 * 60 * 1000,
  });

  return { hasClientAccess, isLoading };
}
