import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserSettings {
  id: string;
  user_id: string;
  email_rdos: boolean;
  email_orcamentos: boolean;
  email_alertas: boolean;
  email_relatorios: boolean;
  push_enabled: boolean;
  push_alertas: boolean;
  push_tarefas: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  email_rdos: true,
  email_orcamentos: true,
  email_alertas: true,
  email_relatorios: true,
  push_enabled: false,
  push_alertas: true,
  push_tarefas: true,
};

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Create default settings
        const { data: newData, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
          .select()
          .single();
        if (insertError) throw insertError;
        return newData as UserSettings;
      }
      return data as UserSettings;
    },
    enabled: !!user?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!user?.id || !settings?.id) throw new Error('No settings found');
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('id', settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
    onError: () => {
      toast.error('Erro ao guardar definição');
    },
  });

  const currentSettings = settings
    ? {
        email_rdos: settings.email_rdos,
        email_orcamentos: settings.email_orcamentos,
        email_alertas: settings.email_alertas,
        email_relatorios: settings.email_relatorios,
        push_enabled: settings.push_enabled,
        push_alertas: settings.push_alertas,
        push_tarefas: settings.push_tarefas,
      }
    : DEFAULT_SETTINGS;

  return {
    settings: currentSettings,
    isLoading,
    updateSetting: (key: keyof typeof DEFAULT_SETTINGS, value: boolean) => {
      updateSettings.mutate({ [key]: value } as any);
    },
    isSaving: updateSettings.isPending,
  };
}
