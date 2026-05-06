import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface IcfTemplateChapter {
  titulo: string;
  descricao?: string;
  valor: number;
  prazo?: string;
}

export interface IcfChapterTemplate {
  id: string;
  user_id: string | null;
  nome: string;
  descricao: string | null;
  capitulos: IcfTemplateChapter[];
  total_referencia: number;
  is_global: boolean;
  is_default: boolean;
}

export function useIcfChapterTemplates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['icf-chapter-templates', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icf_budget_chapter_templates' as any)
        .select('*')
        .order('is_global', { ascending: false })
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        capitulos: Array.isArray(r.capitulos) ? r.capitulos : [],
        total_referencia: Number(r.total_referencia ?? 0),
      })) as IcfChapterTemplate[];
    },
  });
}
