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
    // Dashboard
    'dashboard': 'Painel',
    'obras': 'Obras',
    'clientes': 'Clientes',
    'orcamentos': 'Orçamentos',
    'rdos': 'RDOs',
    'financeiro': 'Financeiro',
    'settings': 'Definições',
    // Status
    'active': 'Ativo',
    'inactive': 'Inativo',
    'pending': 'Pendente',
    'approved': 'Aprovado',
    'rejected': 'Rejeitado',
    // Time
    'today': 'Hoje',
    'yesterday': 'Ontem',
    'tomorrow': 'Amanhã',
    'this_week': 'Esta semana',
    'this_month': 'Este mês',
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
