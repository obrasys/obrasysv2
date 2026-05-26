import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChapterTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  company_id: string | null;
}

export interface ArticleTemplate {
  id: string;
  chapter_template_id: string;
  code: string;
  name: string;
  description: string | null;
  suggested_unit: string | null;
  category: string | null;
  sort_order: number;
  company_id: string | null;
}

export function useBudgetChapterTemplates() {
  return useQuery({
    queryKey: ['budget-chapter-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_chapter_templates')
        .select('id, code, name, description, sort_order, company_id')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true });
      if (error) throw error;
      return (data || []) as ChapterTemplate[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useBudgetArticleTemplates(chapterId: string | null) {
  return useQuery({
    queryKey: ['budget-article-templates', chapterId],
    enabled: !!chapterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_article_templates')
        .select(
          'id, chapter_template_id, code, name, description, suggested_unit, category, sort_order, company_id',
        )
        .eq('chapter_template_id', chapterId!)
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true });
      if (error) throw error;
      return (data || []) as ArticleTemplate[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
