import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface RegionalPreferences {
  language: string;
  dateFormat: string;
  currency: string;
  timezone: string;
}

interface PreferencesContextType {
  preferences: RegionalPreferences;
  updatePreferences: (prefs: Partial<RegionalPreferences>) => void;
  formatCurrency: (value: number) => string;
  formatDate: (date: Date | string, includeTime?: boolean) => string;
  formatNumber: (value: number, decimals?: number) => string;
  getCurrentTime: () => Date;
  t: (key: string) => string;
}

const DEFAULT_PREFERENCES: RegionalPreferences = {
  language: 'pt-PT',
  dateFormat: 'dd/MM/yyyy',
  currency: 'EUR',
  timezone: 'Europe/Lisbon',
};

const STORAGE_KEY = 'obra-sys-preferences';

// Translation dictionaries
const translations: Record<string, Record<string, string>> = {
  'pt-PT': {
    // Common
    'save': 'Guardar',
    'cancel': 'Cancelar',
    'delete': 'Eliminar',
    'edit': 'Editar',
    'create': 'Criar',
    'search': 'Pesquisar',
    'filter': 'Filtrar',
    'loading': 'A carregar...',
    'no_results': 'Sem resultados',
    'confirm': 'Confirmar',
    'back': 'Voltar',
    'next': 'Seguinte',
    'previous': 'Anterior',
    'yes': 'Sim',
    'no': 'Não',
    'dashboard': 'Painel',
    'obras': 'Obras',
    'clientes': 'Clientes',
    'orcamentos': 'Orçamentos',
    'rdos': 'RDOs',
    'financeiro': 'Financeiro',
    'settings': 'Definições',
    'active': 'Ativo',
    'inactive': 'Inativo',
    'pending': 'Pendente',
    'approved': 'Aprovado',
    'rejected': 'Rejeitado',
    'today': 'Hoje',
    'yesterday': 'Ontem',
    'tomorrow': 'Amanhã',
    'this_week': 'Esta semana',
    'this_month': 'Este mês',
    // Settings page
    'settings_title': 'Definições',
    'settings_subtitle': 'Personalize a sua experiência e preferências',
    'email_notifications': 'Notificações por Email',
    'email_notifications_desc': 'Configure quais emails deseja receber',
    'new_rdos': 'Novos RDOs',
    'new_rdos_desc': 'Receber email quando um RDO é submetido para aprovação',
    'budgets': 'Orçamentos',
    'budgets_desc': 'Notificações sobre alterações em orçamentos',
    'project_alerts': 'Alertas de Obra',
    'project_alerts_desc': 'Alertas sobre atrasos e problemas nas obras',
    'weekly_reports': 'Relatórios Semanais',
    'weekly_reports_desc': 'Resumo semanal das atividades das suas obras',
    'push_notifications': 'Notificações Push',
    'push_notifications_desc': 'Notificações no navegador e dispositivos móveis',
    'enable_push': 'Ativar Notificações Push',
    'enable_push_desc': 'Permitir notificações no navegador',
    'urgent_alerts': 'Alertas Urgentes',
    'urgent_alerts_desc': 'Notificações imediatas para problemas críticos',
    'task_reminders': 'Lembretes de Tarefas',
    'task_reminders_desc': 'Receber lembretes de tarefas pendentes',
    'push_permission_note': 'As notificações push requerem permissão do navegador',
    'regional_preferences': 'Preferências Regionais',
    'regional_preferences_desc': 'Idioma, formato de data e moeda',
    'language': 'Idioma',
    'date_format': 'Formato de Data',
    'currency_label': 'Moeda',
    'timezone': 'Fuso Horário',
    'example': 'Exemplo',
    'current_time_in': 'Hora atual em',
    'appearance': 'Aparência',
    'appearance_desc': 'Personalize a aparência da aplicação',
    'theme': 'Tema',
    'theme_light': 'Claro',
    'theme_dark': 'Escuro',
    'theme_system': 'Sistema',
    'theme_active_light': 'Tema claro ativo',
    'theme_active_dark': 'Tema escuro ativo',
    'theme_active_system': 'Tema do sistema ativo',
    'axia_desc': 'Motor de inteligência ativa para orçamentos',
    'enable_axia': 'Ativar Axia',
    'enable_axia_desc': 'Análise automática de orçamentos com sugestões inteligentes',
    'auto_recommendations': 'Permitir recomendações automáticas',
    'auto_recommendations_desc': 'Usar IA generativa para sugestões avançadas',
    'predictive_mode': 'Ativar modo preditivo',
    'predictive_mode_desc': 'Previsões baseadas no histórico de obras (beta)',
    'min_margin': 'Margem mínima (%)',
    'alert_sensitivity': 'Sensibilidade de alerta',
    'sensitivity_low': 'Baixa',
    'sensitivity_medium': 'Média',
    'sensitivity_high': 'Alta',
    'data_privacy': 'Dados e Privacidade',
    'data_privacy_desc': 'Gerir os seus dados e configurações de privacidade',
    'export_data': 'Exportar Dados',
    'export_data_desc': 'Baixar uma cópia dos seus dados',
    'export': 'Exportar',
    'session_history': 'Histórico de Sessões',
    'session_history_desc': 'Ver dispositivos conectados',
    'view_sessions': 'Ver Sessões',
    'delete_account': 'Eliminar Conta',
    'delete_account_short': 'Remover permanentemente',
    'delete_account_title': 'Eliminar Conta Permanentemente',
    'delete_account_desc': 'Esta ação é irreversível. Todos os seus dados, incluindo obras, orçamentos, RDOs e clientes serão permanentemente eliminados.',
    'confirm_deletion': 'Confirmar Eliminação',
    'save_settings': 'Guardar Definições',
    'saving': 'A guardar...',
    'settings_saved': 'Definições guardadas com sucesso!',
    'export_started': 'A exportação de dados será iniciada em breve...',
    'delete_requires_email': 'Esta funcionalidade requer confirmação adicional via email.',
  },
  'pt-BR': {
    'save': 'Salvar',
    'cancel': 'Cancelar',
    'delete': 'Excluir',
    'edit': 'Editar',
    'create': 'Criar',
    'search': 'Pesquisar',
    'filter': 'Filtrar',
    'loading': 'Carregando...',
    'no_results': 'Sem resultados',
    'confirm': 'Confirmar',
    'back': 'Voltar',
    'next': 'Próximo',
    'previous': 'Anterior',
    'yes': 'Sim',
    'no': 'Não',
    'dashboard': 'Painel',
    'obras': 'Obras',
    'clientes': 'Clientes',
    'orcamentos': 'Orçamentos',
    'rdos': 'RDOs',
    'financeiro': 'Financeiro',
    'settings': 'Configurações',
    'active': 'Ativo',
    'inactive': 'Inativo',
    'pending': 'Pendente',
    'approved': 'Aprovado',
    'rejected': 'Rejeitado',
    'today': 'Hoje',
    'yesterday': 'Ontem',
    'tomorrow': 'Amanhã',
    'this_week': 'Esta semana',
    'this_month': 'Este mês',
    'settings_title': 'Configurações',
    'settings_subtitle': 'Personalize sua experiência e preferências',
    'email_notifications': 'Notificações por Email',
    'email_notifications_desc': 'Configure quais emails deseja receber',
    'new_rdos': 'Novos RDOs',
    'new_rdos_desc': 'Receber email quando um RDO é enviado para aprovação',
    'budgets': 'Orçamentos',
    'budgets_desc': 'Notificações sobre alterações em orçamentos',
    'project_alerts': 'Alertas de Obra',
    'project_alerts_desc': 'Alertas sobre atrasos e problemas nas obras',
    'weekly_reports': 'Relatórios Semanais',
    'weekly_reports_desc': 'Resumo semanal das atividades das suas obras',
    'push_notifications': 'Notificações Push',
    'push_notifications_desc': 'Notificações no navegador e dispositivos móveis',
    'enable_push': 'Ativar Notificações Push',
    'enable_push_desc': 'Permitir notificações no navegador',
    'urgent_alerts': 'Alertas Urgentes',
    'urgent_alerts_desc': 'Notificações imediatas para problemas críticos',
    'task_reminders': 'Lembretes de Tarefas',
    'task_reminders_desc': 'Receber lembretes de tarefas pendentes',
    'push_permission_note': 'As notificações push requerem permissão do navegador',
    'regional_preferences': 'Preferências Regionais',
    'regional_preferences_desc': 'Idioma, formato de data e moeda',
    'language': 'Idioma',
    'date_format': 'Formato de Data',
    'currency_label': 'Moeda',
    'timezone': 'Fuso Horário',
    'example': 'Exemplo',
    'current_time_in': 'Hora atual em',
    'appearance': 'Aparência',
    'appearance_desc': 'Personalize a aparência do aplicativo',
    'theme': 'Tema',
    'theme_light': 'Claro',
    'theme_dark': 'Escuro',
    'theme_system': 'Sistema',
    'theme_active_light': 'Tema claro ativo',
    'theme_active_dark': 'Tema escuro ativo',
    'theme_active_system': 'Tema do sistema ativo',
    'axia_desc': 'Motor de inteligência ativa para orçamentos',
    'enable_axia': 'Ativar Axia',
    'enable_axia_desc': 'Análise automática de orçamentos com sugestões inteligentes',
    'auto_recommendations': 'Permitir recomendações automáticas',
    'auto_recommendations_desc': 'Usar IA generativa para sugestões avançadas',
    'predictive_mode': 'Ativar modo preditivo',
    'predictive_mode_desc': 'Previsões baseadas no histórico de obras (beta)',
    'min_margin': 'Margem mínima (%)',
    'alert_sensitivity': 'Sensibilidade de alerta',
    'sensitivity_low': 'Baixa',
    'sensitivity_medium': 'Média',
    'sensitivity_high': 'Alta',
    'data_privacy': 'Dados e Privacidade',
    'data_privacy_desc': 'Gerenciar seus dados e configurações de privacidade',
    'export_data': 'Exportar Dados',
    'export_data_desc': 'Baixar uma cópia dos seus dados',
    'export': 'Exportar',
    'session_history': 'Histórico de Sessões',
    'session_history_desc': 'Ver dispositivos conectados',
    'view_sessions': 'Ver Sessões',
    'delete_account': 'Excluir Conta',
    'delete_account_short': 'Remover permanentemente',
    'delete_account_title': 'Excluir Conta Permanentemente',
    'delete_account_desc': 'Esta ação é irreversível. Todos os seus dados, incluindo obras, orçamentos, RDOs e clientes serão permanentemente excluídos.',
    'confirm_deletion': 'Confirmar Exclusão',
    'save_settings': 'Salvar Configurações',
    'saving': 'Salvando...',
    'settings_saved': 'Configurações salvas com sucesso!',
    'export_started': 'A exportação de dados será iniciada em breve...',
    'delete_requires_email': 'Esta funcionalidade requer confirmação adicional via email.',
  },
  'en-US': {
    'save': 'Save',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'edit': 'Edit',
    'create': 'Create',
    'search': 'Search',
    'filter': 'Filter',
    'loading': 'Loading...',
    'no_results': 'No results',
    'confirm': 'Confirm',
    'back': 'Back',
    'next': 'Next',
    'previous': 'Previous',
    'yes': 'Yes',
    'no': 'No',
    'dashboard': 'Dashboard',
    'obras': 'Projects',
    'clientes': 'Clients',
    'orcamentos': 'Budgets',
    'rdos': 'Daily Reports',
    'financeiro': 'Finance',
    'settings': 'Settings',
    'active': 'Active',
    'inactive': 'Inactive',
    'pending': 'Pending',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'today': 'Today',
    'yesterday': 'Yesterday',
    'tomorrow': 'Tomorrow',
    'this_week': 'This week',
    'this_month': 'This month',
    'settings_title': 'Settings',
    'settings_subtitle': 'Customize your experience and preferences',
    'email_notifications': 'Email Notifications',
    'email_notifications_desc': 'Configure which emails you want to receive',
    'new_rdos': 'New Daily Reports',
    'new_rdos_desc': 'Receive email when a daily report is submitted for approval',
    'budgets': 'Budgets',
    'budgets_desc': 'Notifications about budget changes',
    'project_alerts': 'Project Alerts',
    'project_alerts_desc': 'Alerts about delays and issues in projects',
    'weekly_reports': 'Weekly Reports',
    'weekly_reports_desc': 'Weekly summary of your project activities',
    'push_notifications': 'Push Notifications',
    'push_notifications_desc': 'Browser and mobile device notifications',
    'enable_push': 'Enable Push Notifications',
    'enable_push_desc': 'Allow browser notifications',
    'urgent_alerts': 'Urgent Alerts',
    'urgent_alerts_desc': 'Immediate notifications for critical issues',
    'task_reminders': 'Task Reminders',
    'task_reminders_desc': 'Receive reminders for pending tasks',
    'push_permission_note': 'Push notifications require browser permission',
    'regional_preferences': 'Regional Preferences',
    'regional_preferences_desc': 'Language, date format and currency',
    'language': 'Language',
    'date_format': 'Date Format',
    'currency_label': 'Currency',
    'timezone': 'Timezone',
    'example': 'Example',
    'current_time_in': 'Current time in',
    'appearance': 'Appearance',
    'appearance_desc': 'Customize the application appearance',
    'theme': 'Theme',
    'theme_light': 'Light',
    'theme_dark': 'Dark',
    'theme_system': 'System',
    'theme_active_light': 'Light theme active',
    'theme_active_dark': 'Dark theme active',
    'theme_active_system': 'System theme active',
    'axia_desc': 'Active intelligence engine for budgets',
    'enable_axia': 'Enable Axia',
    'enable_axia_desc': 'Automatic budget analysis with smart suggestions',
    'auto_recommendations': 'Allow automatic recommendations',
    'auto_recommendations_desc': 'Use generative AI for advanced suggestions',
    'predictive_mode': 'Enable predictive mode',
    'predictive_mode_desc': 'Predictions based on project history (beta)',
    'min_margin': 'Minimum margin (%)',
    'alert_sensitivity': 'Alert sensitivity',
    'sensitivity_low': 'Low',
    'sensitivity_medium': 'Medium',
    'sensitivity_high': 'High',
    'data_privacy': 'Data & Privacy',
    'data_privacy_desc': 'Manage your data and privacy settings',
    'export_data': 'Export Data',
    'export_data_desc': 'Download a copy of your data',
    'export': 'Export',
    'session_history': 'Session History',
    'session_history_desc': 'View connected devices',
    'view_sessions': 'View Sessions',
    'delete_account': 'Delete Account',
    'delete_account_short': 'Permanently remove',
    'delete_account_title': 'Permanently Delete Account',
    'delete_account_desc': 'This action is irreversible. All your data, including projects, budgets, daily reports and clients will be permanently deleted.',
    'confirm_deletion': 'Confirm Deletion',
    'save_settings': 'Save Settings',
    'saving': 'Saving...',
    'settings_saved': 'Settings saved successfully!',
    'export_started': 'Data export will start shortly...',
    'delete_requires_email': 'This feature requires additional email confirmation.',
  },
  'es-ES': {
    'save': 'Guardar',
    'cancel': 'Cancelar',
    'delete': 'Eliminar',
    'edit': 'Editar',
    'create': 'Crear',
    'search': 'Buscar',
    'filter': 'Filtrar',
    'loading': 'Cargando...',
    'no_results': 'Sin resultados',
    'confirm': 'Confirmar',
    'back': 'Volver',
    'next': 'Siguiente',
    'previous': 'Anterior',
    'yes': 'Sí',
    'no': 'No',
    'dashboard': 'Panel',
    'obras': 'Obras',
    'clientes': 'Clientes',
    'orcamentos': 'Presupuestos',
    'rdos': 'Partes Diarios',
    'financeiro': 'Finanzas',
    'settings': 'Configuración',
    'active': 'Activo',
    'inactive': 'Inactivo',
    'pending': 'Pendiente',
    'approved': 'Aprobado',
    'rejected': 'Rechazado',
    'today': 'Hoy',
    'yesterday': 'Ayer',
    'tomorrow': 'Mañana',
    'this_week': 'Esta semana',
    'this_month': 'Este mes',
    'settings_title': 'Configuración',
    'settings_subtitle': 'Personalice su experiencia y preferencias',
    'email_notifications': 'Notificaciones por Email',
    'email_notifications_desc': 'Configure qué emails desea recibir',
    'new_rdos': 'Nuevos Partes Diarios',
    'new_rdos_desc': 'Recibir email cuando un parte diario se envía para aprobación',
    'budgets': 'Presupuestos',
    'budgets_desc': 'Notificaciones sobre cambios en presupuestos',
    'project_alerts': 'Alertas de Obra',
    'project_alerts_desc': 'Alertas sobre retrasos y problemas en las obras',
    'weekly_reports': 'Informes Semanales',
    'weekly_reports_desc': 'Resumen semanal de las actividades de sus obras',
    'push_notifications': 'Notificaciones Push',
    'push_notifications_desc': 'Notificaciones en el navegador y dispositivos móviles',
    'enable_push': 'Activar Notificaciones Push',
    'enable_push_desc': 'Permitir notificaciones en el navegador',
    'urgent_alerts': 'Alertas Urgentes',
    'urgent_alerts_desc': 'Notificaciones inmediatas para problemas críticos',
    'task_reminders': 'Recordatorios de Tareas',
    'task_reminders_desc': 'Recibir recordatorios de tareas pendientes',
    'push_permission_note': 'Las notificaciones push requieren permiso del navegador',
    'regional_preferences': 'Preferencias Regionales',
    'regional_preferences_desc': 'Idioma, formato de fecha y moneda',
    'language': 'Idioma',
    'date_format': 'Formato de Fecha',
    'currency_label': 'Moneda',
    'timezone': 'Zona Horaria',
    'example': 'Ejemplo',
    'current_time_in': 'Hora actual en',
    'appearance': 'Apariencia',
    'appearance_desc': 'Personalice la apariencia de la aplicación',
    'theme': 'Tema',
    'theme_light': 'Claro',
    'theme_dark': 'Oscuro',
    'theme_system': 'Sistema',
    'theme_active_light': 'Tema claro activo',
    'theme_active_dark': 'Tema oscuro activo',
    'theme_active_system': 'Tema del sistema activo',
    'axia_desc': 'Motor de inteligencia activa para presupuestos',
    'enable_axia': 'Activar Axia',
    'enable_axia_desc': 'Análisis automático de presupuestos con sugerencias inteligentes',
    'auto_recommendations': 'Permitir recomendaciones automáticas',
    'auto_recommendations_desc': 'Usar IA generativa para sugerencias avanzadas',
    'predictive_mode': 'Activar modo predictivo',
    'predictive_mode_desc': 'Predicciones basadas en el historial de obras (beta)',
    'min_margin': 'Margen mínimo (%)',
    'alert_sensitivity': 'Sensibilidad de alerta',
    'sensitivity_low': 'Baja',
    'sensitivity_medium': 'Media',
    'sensitivity_high': 'Alta',
    'data_privacy': 'Datos y Privacidad',
    'data_privacy_desc': 'Gestionar sus datos y configuraciones de privacidad',
    'export_data': 'Exportar Datos',
    'export_data_desc': 'Descargar una copia de sus datos',
    'export': 'Exportar',
    'session_history': 'Historial de Sesiones',
    'session_history_desc': 'Ver dispositivos conectados',
    'view_sessions': 'Ver Sesiones',
    'delete_account': 'Eliminar Cuenta',
    'delete_account_short': 'Eliminar permanentemente',
    'delete_account_title': 'Eliminar Cuenta Permanentemente',
    'delete_account_desc': 'Esta acción es irreversible. Todos sus datos, incluyendo obras, presupuestos, partes diarios y clientes serán eliminados permanentemente.',
    'confirm_deletion': 'Confirmar Eliminación',
    'save_settings': 'Guardar Configuración',
    'saving': 'Guardando...',
    'settings_saved': '¡Configuración guardada con éxito!',
    'export_started': 'La exportación de datos comenzará en breve...',
    'delete_requires_email': 'Esta funcionalidad requiere confirmación adicional por email.',
  },
};

// Currency configuration
const currencyConfig: Record<string, { locale: string; symbol: string }> = {
  EUR: { locale: 'pt-PT', symbol: '€' },
  USD: { locale: 'en-US', symbol: '$' },
  GBP: { locale: 'en-GB', symbol: '£' },
  BRL: { locale: 'pt-BR', symbol: 'R$' },
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<RegionalPreferences>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
        } catch {
          return DEFAULT_PREFERENCES;
        }
      }
    }
    return DEFAULT_PREFERENCES;
  });

  // Persist preferences to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = useCallback((prefs: Partial<RegionalPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  }, []);

  // Format currency based on preferences
  const formatCurrency = useCallback((value: number): string => {
    const config = currencyConfig[preferences.currency] || currencyConfig.EUR;
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: preferences.currency,
    }).format(value);
  }, [preferences.currency]);

  // Format number based on locale
  const formatNumber = useCallback((value: number, decimals: number = 2): string => {
    return new Intl.NumberFormat(preferences.language, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }, [preferences.language]);

  // Format date based on preferences
  const formatDate = useCallback((date: Date | string, includeTime: boolean = false): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '-';
    }

    const options: Intl.DateTimeFormatOptions = {
      timeZone: preferences.timezone,
    };

    // Parse the date format
    switch (preferences.dateFormat) {
      case 'dd/MM/yyyy':
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
        break;
      case 'MM/dd/yyyy':
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
        break;
      case 'yyyy-MM-dd':
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
        break;
      default:
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
    }

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }

    // Use the appropriate locale for formatting
    const localeMap: Record<string, string> = {
      'dd/MM/yyyy': 'pt-PT',
      'MM/dd/yyyy': 'en-US',
      'yyyy-MM-dd': 'sv-SE', // Swedish locale uses ISO format
    };

    const locale = localeMap[preferences.dateFormat] || preferences.language;
    
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  }, [preferences.dateFormat, preferences.timezone, preferences.language]);

  // Get current time in the user's timezone
  const getCurrentTime = useCallback((): Date => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: preferences.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
    
    return new Date(
      parseInt(getPart('year')),
      parseInt(getPart('month')) - 1,
      parseInt(getPart('day')),
      parseInt(getPart('hour')),
      parseInt(getPart('minute')),
      parseInt(getPart('second'))
    );
  }, [preferences.timezone]);

  // Translation function
  const t = useCallback((key: string): string => {
    const dict = translations[preferences.language] || translations['pt-PT'];
    return dict[key] || key;
  }, [preferences.language]);

  const value: PreferencesContextType = {
    preferences,
    updatePreferences,
    formatCurrency,
    formatDate,
    formatNumber,
    getCurrentTime,
    t,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
