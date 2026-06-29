import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AgendaNote {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  data: string;
  hora: string | null;
  concluida: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgendaNoteInput {
  titulo: string;
  descricao?: string | null;
  data: string;
  hora?: string | null;
  concluida?: boolean;
}

export function useAgendaNotes(rangeStart?: string, rangeEnd?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notes, isLoading } = useQuery({
    queryKey: ['agenda_notes', user?.id, rangeStart, rangeEnd],
    queryFn: async () => {
      let q = supabase.from('agenda_notes').select('*').order('data', { ascending: true }).order('hora', { ascending: true, nullsFirst: true });
      if (rangeStart) q = q.gte('data', rangeStart);
      if (rangeEnd) q = q.lte('data', rangeEnd);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AgendaNote[];
    },
    enabled: !!user,
  });

  const createNote = useMutation({
    mutationFn: async (input: AgendaNoteInput) => {
      const { data, error } = await supabase.from('agenda_notes').insert({ ...input, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda_notes'] });
      toast.success('Nota adicionada à agenda');
    },
    onError: (e: any) => toast.error('Erro ao adicionar nota: ' + e.message),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...input }: Partial<AgendaNoteInput> & { id: string }) => {
      const { data, error } = await supabase.from('agenda_notes').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda_notes'] }),
    onError: (e: any) => toast.error('Erro ao atualizar nota: ' + e.message),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agenda_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda_notes'] });
      toast.success('Nota removida');
    },
    onError: (e: any) => toast.error('Erro ao remover nota: ' + e.message),
  });

  return { notes: notes || [], isLoading, createNote, updateNote, deleteNote };
}
