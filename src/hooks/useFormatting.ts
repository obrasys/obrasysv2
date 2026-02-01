import { usePreferences } from '@/contexts/PreferencesContext';
import { useMemo } from 'react';

/**
 * Hook that provides formatting utilities based on user preferences
 */
export function useFormatting() {
  const { preferences, formatCurrency, formatDate, formatNumber, getCurrentTime, t } = usePreferences();

  // Get timezone display name
  const timezoneDisplay = useMemo(() => {
    const timezoneNames: Record<string, string> = {
      'Europe/Lisbon': 'Lisboa (WET/WEST)',
      'Europe/London': 'Londres (GMT/BST)',
      'Europe/Madrid': 'Madrid (CET/CEST)',
      'America/Sao_Paulo': 'São Paulo (BRT)',
    };
    return timezoneNames[preferences.timezone] || preferences.timezone;
  }, [preferences.timezone]);

  // Get language display name
  const languageDisplay = useMemo(() => {
    const languageNames: Record<string, string> = {
      'pt-PT': 'Português (Portugal)',
      'pt-BR': 'Português (Brasil)',
      'en-US': 'English (US)',
      'es-ES': 'Español',
    };
    return languageNames[preferences.language] || preferences.language;
  }, [preferences.language]);

  // Get currency display
  const currencyDisplay = useMemo(() => {
    const currencyNames: Record<string, string> = {
      'EUR': 'Euro (€)',
      'USD': 'Dólar Americano ($)',
      'GBP': 'Libra Esterlina (£)',
      'BRL': 'Real Brasileiro (R$)',
    };
    return currencyNames[preferences.currency] || preferences.currency;
  }, [preferences.currency]);

  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = getCurrentTime();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    const rtf = new Intl.RelativeTimeFormat(preferences.language, { numeric: 'auto' });

    if (diffDays > 0) {
      return rtf.format(-diffDays, 'day');
    } else if (diffHours > 0) {
      return rtf.format(-diffHours, 'hour');
    } else if (diffMinutes > 0) {
      return rtf.format(-diffMinutes, 'minute');
    } else {
      return t('today');
    }
  };

  // Format percentage
  const formatPercentage = (value: number, decimals: number = 1): string => {
    return new Intl.NumberFormat(preferences.language, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  };

  // Get current time formatted
  const getCurrentTimeFormatted = (includeSeconds: boolean = false): string => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: preferences.timezone,
      hour: '2-digit',
      minute: '2-digit',
    };
    
    if (includeSeconds) {
      options.second = '2-digit';
    }

    return new Intl.DateTimeFormat(preferences.language, options).format(now);
  };

  // Get current date formatted
  const getCurrentDateFormatted = (): string => {
    return formatDate(new Date());
  };

  return {
    // Core formatting
    formatCurrency,
    formatDate,
    formatNumber,
    formatRelativeTime,
    formatPercentage,
    
    // Current time/date
    getCurrentTime,
    getCurrentTimeFormatted,
    getCurrentDateFormatted,
    
    // Display names
    timezoneDisplay,
    languageDisplay,
    currencyDisplay,
    
    // Translation
    t,
    
    // Raw preferences
    preferences,
  };
}
