import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Globe,
  Palette,
  Shield,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sun,
  Moon,
  Monitor,
  BellRing,
  BellOff,
  FileJson,
  KeyRound,
  Languages,
  CalendarDays,
  Banknote,
  MapPin,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useFormatting } from '@/hooks/useFormatting';
import { AxiaIcon } from '@/components/axia/AxiaIcon';
import { useCompanyAISettings } from '@/hooks/useAIBudgetInsights';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// ─── Setting Row Component ───
function SettingRow({ 
  icon: Icon, 
  label, 
  description, 
  checked, 
  onCheckedChange, 
  disabled = false,
  variant = 'default',
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  variant?: 'default' | 'success' | 'warning';
}) {
  const iconBg = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
  }[variant];

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${checked && !disabled ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch 
        checked={checked} 
        onCheckedChange={onCheckedChange} 
        disabled={disabled} 
      />
    </div>
  );
}

// ─── Theme Card ───
function ThemeOption({ 
  value, 
  label, 
  icon: Icon, 
  active, 
  onClick 
}: { 
  value: string; 
  label: string; 
  icon: React.ElementType; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
        active 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : 'border-border hover:border-primary/30 hover:bg-muted/50'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={`text-sm font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{label}</span>
      {active && <Badge variant="secondary" className="text-[10px] px-2 py-0">Ativo</Badge>}
    </button>
  );
}

export default function DefinicoesPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreferences } = usePreferences();
  const { formatCurrency, formatDate, getCurrentTimeFormatted, timezoneDisplay, t } = useFormatting();
  const { settings: axiaSettings, isLoading: axiaLoading, updateSettings: updateAxiaSettings } = useCompanyAISettings();
  const { settings: userSettings, isLoading: settingsLoading, updateSetting, isSaving } = useUserSettings();
  const { user } = useAuth();
  
  const [axiaEnabled, setAxiaEnabled] = useState(true);
  const [axiaLlm, setAxiaLlm] = useState(true);
  const [axiaPredictive, setAxiaPredictive] = useState(true);
  const [axiaContextual, setAxiaContextual] = useState(true);
  const [axiaMargin, setAxiaMargin] = useState('15');
  const [axiaSensitivity, setAxiaSensitivity] = useState('2.5');
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isExporting, setIsExporting] = useState(false);

  // Check push permission status
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Sync Axia settings when loaded
  useEffect(() => {
    if (axiaSettings) {
      setAxiaEnabled(axiaSettings.enabled);
      setAxiaLlm(axiaSettings.llm_enabled);
      setAxiaPredictive(true);
      setAxiaContextual(axiaSettings.contextual_assistant_enabled ?? true);
      setAxiaMargin(String(axiaSettings.min_margin_percent));
      setAxiaSensitivity(String(axiaSettings.outlier_zscore));
    }
  }, [axiaSettings]);

  // Live clock for timezone preview
  const [currentTime, setCurrentTime] = useState(getCurrentTimeFormatted(true));
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeFormatted(true));
    }, 1000);
    return () => clearInterval(interval);
  }, [getCurrentTimeFormatted]);

  // ─── Push Notification Request ───
  const handleRequestPush = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('O seu navegador não suporta notificações push');
      return;
    }
    
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    
    if (permission === 'granted') {
      updateSetting('push_enabled', true);
      toast.success('Notificações push ativadas!');
      // Show a test notification
      new Notification('Obra Sys', {
        body: 'Notificações push ativadas com sucesso!',
        icon: '/favicon.ico',
      });
    } else if (permission === 'denied') {
      updateSetting('push_enabled', false);
      toast.error('Permissão de notificações negada. Altere nas definições do navegador.');
    }
  }, [updateSetting]);

  // ─── Export Data ───
  const handleExportData = useCallback(async () => {
    if (!user?.id) return;
    setIsExporting(true);
    
    try {
      // Fetch user's main data in parallel
      const [obras, orcamentos, clientes, rdos, contas] = await Promise.all([
        supabase.from('obras').select('*').eq('user_id', user.id),
        supabase.from('orcamentos').select('*').eq('user_id', user.id),
        supabase.from('clientes').select('*').eq('user_id', user.id),
        supabase.from('relatorios_diarios').select('*').eq('user_id', user.id),
        supabase.from('contas_financeiras').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        obras: obras.data || [],
        orcamentos: orcamentos.data || [],
        clientes: clientes.data || [],
        relatorios_diarios: rdos.data || [],
        contas_financeiras: contas.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `obra-sys-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setIsExporting(false);
    }
  }, [user]);

  const handleDeleteAccount = () => {
    toast.error('Esta funcionalidade requer confirmação adicional via email. Contacte o suporte.');
  };

  const exampleAmount = 12500.75;
  const exampleDate = new Date();

  if (settingsLoading) {
    return (
      <AppLayout title={t('settings_title')}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={t('settings_title')}
      subtitle={t('settings_subtitle')}
      actions={
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>
      }
    >
      <div className="p-4 md:p-6">
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notificações</span>
              <span className="sm:hidden">Notif.</span>
            </TabsTrigger>
            <TabsTrigger value="regional" className="gap-1.5 text-xs sm:text-sm">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Regional</span>
              <span className="sm:hidden">Reg.</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5 text-xs sm:text-sm">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Aparência</span>
              <span className="sm:hidden">Visual</span>
            </TabsTrigger>
            <TabsTrigger value="axia" className="gap-1.5 text-xs sm:text-sm">
              <AxiaIcon size={16} className="text-[#7C3AED]" />
              Axia
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-1.5 text-xs sm:text-sm">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Privacidade</span>
              <span className="sm:hidden">Priv.</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── NOTIFICATIONS TAB ─── */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Email Notifications */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t('email_notifications')}</CardTitle>
                      <CardDescription className="text-xs">{t('email_notifications_desc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <SettingRow
                    icon={FileJson}
                    label={t('new_rdos')}
                    description={t('new_rdos_desc')}
                    checked={userSettings.email_rdos}
                    onCheckedChange={(v) => updateSetting('email_rdos', v)}
                  />
                  <SettingRow
                    icon={Banknote}
                    label={t('budgets')}
                    description={t('budgets_desc')}
                    checked={userSettings.email_orcamentos}
                    onCheckedChange={(v) => updateSetting('email_orcamentos', v)}
                  />
                  <SettingRow
                    icon={AlertTriangle}
                    label={t('project_alerts')}
                    description={t('project_alerts_desc')}
                    checked={userSettings.email_alertas}
                    onCheckedChange={(v) => updateSetting('email_alertas', v)}
                    variant="warning"
                  />
                  <SettingRow
                    icon={CalendarDays}
                    label={t('weekly_reports')}
                    description={t('weekly_reports_desc')}
                    checked={userSettings.email_relatorios}
                    onCheckedChange={(v) => updateSetting('email_relatorios', v)}
                  />
                </CardContent>
              </Card>

              {/* Push Notifications */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t('push_notifications')}</CardTitle>
                      <CardDescription className="text-xs">{t('push_notifications_desc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  {/* Push master toggle */}
                  <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${userSettings.push_enabled ? 'bg-emerald-500/5' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${userSettings.push_enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                        {userSettings.push_enabled ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t('enable_push')}</p>
                        <p className="text-xs text-muted-foreground">{t('enable_push_desc')}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={userSettings.push_enabled} 
                      onCheckedChange={(v) => {
                        if (v && pushPermission !== 'granted') {
                          handleRequestPush();
                        } else {
                          updateSetting('push_enabled', v);
                        }
                      }} 
                    />
                  </div>

                  <SettingRow
                    icon={AlertTriangle}
                    label={t('urgent_alerts')}
                    description={t('urgent_alerts_desc')}
                    checked={userSettings.push_alertas}
                    onCheckedChange={(v) => updateSetting('push_alertas', v)}
                    disabled={!userSettings.push_enabled}
                    variant="warning"
                  />
                  <SettingRow
                    icon={Clock}
                    label={t('task_reminders')}
                    description={t('task_reminders_desc')}
                    checked={userSettings.push_tarefas}
                    onCheckedChange={(v) => updateSetting('push_tarefas', v)}
                    disabled={!userSettings.push_enabled}
                  />

                  {/* Permission status & request */}
                  <div className="pt-3">
                    {pushPermission === 'granted' ? (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-700 text-xs">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span className="font-medium">Permissão concedida — as notificações push estão ativas.</span>
                      </div>
                    ) : pushPermission === 'denied' ? (
                      <div className="flex flex-col gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                            <BellOff className="w-5 h-5 text-destructive" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-destructive">Permissão bloqueada</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              As notificações foram bloqueadas pelo navegador. Para reativar, siga os passos abaixo:
                            </p>
                          </div>
                        </div>
                        <div className="ml-[52px] space-y-1.5">
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                            <span>Clique no ícone 🔒 na barra de endereços do navegador</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                            <span>Procure <strong>"Notificações"</strong> e altere para <strong>"Permitir"</strong></span>
                          </div>
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                            <span>Recarregue a página e ative novamente aqui</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <BellRing className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Ativar notificações push</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Receba alertas importantes diretamente no seu navegador ou dispositivo, mesmo quando não estiver a usar a aplicação.
                            </p>
                          </div>
                        </div>
                        <Button 
                          onClick={handleRequestPush} 
                          className="ml-[52px] w-fit gap-2"
                          size="sm"
                        >
                          <Bell className="w-4 h-4" />
                          Permitir Notificações
                        </Button>
                        <p className="ml-[52px] text-[10px] text-muted-foreground">
                          O navegador vai pedir a sua autorização. Pode desativar a qualquer momento.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Save indicator */}
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                A guardar...
              </div>
            )}
          </TabsContent>

          {/* ─── REGIONAL TAB ─── */}
          <TabsContent value="regional" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t('regional_preferences')}</CardTitle>
                    <CardDescription className="text-xs">{t('regional_preferences_desc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <Languages className="w-4 h-4 text-muted-foreground" />
                      {t('language')}
                    </Label>
                    <Select 
                      value={preferences.language} 
                      onValueChange={(v) => updatePreferences({ language: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-PT">🇵🇹 Português (Portugal)</SelectItem>
                        <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                        <SelectItem value="es-ES">🇪🇸 Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      {t('date_format')}
                    </Label>
                    <Select 
                      value={preferences.dateFormat} 
                      onValueChange={(v) => updatePreferences({ dateFormat: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                        <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                        <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('example')}: <span className="font-mono text-foreground">{formatDate(exampleDate)}</span>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <Banknote className="w-4 h-4 text-muted-foreground" />
                      {t('currency_label')}
                    </Label>
                    <Select 
                      value={preferences.currency} 
                      onValueChange={(v) => updatePreferences({ currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">€ Euro</SelectItem>
                        <SelectItem value="USD">$ Dólar Americano</SelectItem>
                        <SelectItem value="GBP">£ Libra Esterlina</SelectItem>
                        <SelectItem value="BRL">R$ Real Brasileiro</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('example')}: <span className="font-mono text-foreground">{formatCurrency(exampleAmount)}</span>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {t('timezone')}
                    </Label>
                    <Select 
                      value={preferences.timezone} 
                      onValueChange={(v) => updatePreferences({ timezone: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Lisbon">Lisboa (WET/WEST)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT/BST)</SelectItem>
                        <SelectItem value="Europe/Madrid">Madrid (CET/CEST)</SelectItem>
                        <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Live clock */}
                <div className="mt-6">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('current_time_in')} {timezoneDisplay}</p>
                      <p className="text-lg font-mono font-semibold text-foreground">{currentTime}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── APPEARANCE TAB ─── */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t('appearance')}</CardTitle>
                    <CardDescription className="text-xs">{t('appearance_desc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Label className="text-sm mb-4 block">{t('theme')}</Label>
                <div className="grid grid-cols-3 gap-3">
                  <ThemeOption 
                    value="light" 
                    label={t('theme_light')} 
                    icon={Sun} 
                    active={theme === 'light'} 
                    onClick={() => setTheme('light')} 
                  />
                  <ThemeOption 
                    value="dark" 
                    label={t('theme_dark')} 
                    icon={Moon} 
                    active={theme === 'dark'} 
                    onClick={() => setTheme('dark')} 
                  />
                  <ThemeOption 
                    value="system" 
                    label={t('theme_system')} 
                    icon={Monitor} 
                    active={theme === 'system'} 
                    onClick={() => setTheme('system')} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── AXIA TAB ─── */}
          <TabsContent value="axia" className="space-y-6">
            <Card className="border-[#7C3AED]/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                    <AxiaIcon size={20} className="text-[#7C3AED]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Axia – Motor Inteligente</CardTitle>
                    <CardDescription className="text-xs">{t('axia_desc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <SettingRow
                  icon={Bell}
                  label={t('enable_axia')}
                  description={t('enable_axia_desc')}
                  checked={axiaEnabled}
                  onCheckedChange={(v) => {
                    setAxiaEnabled(v);
                    updateAxiaSettings.mutate({ enabled: v });
                  }}
                  variant="success"
                />
                <SettingRow
                  icon={Bell}
                  label={t('auto_recommendations')}
                  description={t('auto_recommendations_desc')}
                  checked={axiaLlm}
                  onCheckedChange={(v) => {
                    setAxiaLlm(v);
                    updateAxiaSettings.mutate({ llm_enabled: v });
                  }}
                  disabled={!axiaEnabled}
                />
                <SettingRow
                  icon={Clock}
                  label={t('predictive_mode')}
                  description={t('predictive_mode_desc')}
                  checked={axiaPredictive}
                  onCheckedChange={(v) => {
                    setAxiaPredictive(v);
                    updateAxiaSettings.mutate({ enabled: axiaEnabled });
                  }}
                  disabled={!axiaEnabled}
                />
                <SettingRow
                  icon={Smartphone}
                  label="Assistente Contextual"
                  description="Chat inteligente da Axia com acesso aos dados da plataforma"
                  checked={axiaContextual}
                  onCheckedChange={(v) => {
                    setAxiaContextual(v);
                    updateAxiaSettings.mutate({ contextual_assistant_enabled: v } as any);
                  }}
                  disabled={!axiaEnabled}
                />

                <Separator className="my-3" />

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm">{t('min_margin')}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={axiaMargin}
                      onChange={(e) => setAxiaMargin(e.target.value)}
                      onBlur={() => {
                        const val = parseFloat(axiaMargin);
                        if (!isNaN(val)) updateAxiaSettings.mutate({ min_margin_percent: val });
                      }}
                      disabled={!axiaEnabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{t('alert_sensitivity')}</Label>
                    <Select
                      value={axiaSensitivity}
                      onValueChange={(v) => {
                        setAxiaSensitivity(v);
                        updateAxiaSettings.mutate({ outlier_zscore: parseFloat(v) });
                      }}
                      disabled={!axiaEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3.5">{t('sensitivity_low')}</SelectItem>
                        <SelectItem value="2.5">{t('sensitivity_medium')}</SelectItem>
                        <SelectItem value="1.5">{t('sensitivity_high')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── PRIVACY TAB ─── */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t('data_privacy')}</CardTitle>
                    <CardDescription className="text-xs">{t('data_privacy_desc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Export Data */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium">{t('export_data')}</h4>
                      <p className="text-xs text-muted-foreground">{t('export_data_desc')}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2" 
                        onClick={handleExportData}
                        disabled={isExporting}
                      >
                        {isExporting ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> A exportar...</>
                        ) : (
                          <><Download className="w-3.5 h-3.5 mr-1.5" /> {t('export')}</>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Delete Account */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                    <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-destructive">{t('delete_account')}</h4>
                      <p className="text-xs text-muted-foreground">{t('delete_account_short')}</p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            {t('delete')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                              <AlertTriangle className="w-5 h-5" />
                              {t('delete_account_title')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('delete_account_desc')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAccount}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t('confirm_deletion')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
