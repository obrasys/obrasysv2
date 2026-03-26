import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  Database,
  Download,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
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

interface NotificationSettings {
  emailRDOs: boolean;
  emailOrcamentos: boolean;
  emailAlertas: boolean;
  emailRelatorios: boolean;
  pushNotifications: boolean;
  pushAlertas: boolean;
  pushTarefas: boolean;
}

export default function DefinicoesPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreferences } = usePreferences();
  const { formatCurrency, formatDate, getCurrentTimeFormatted, timezoneDisplay, t } = useFormatting();
  const { settings: axiaSettings, isLoading: axiaLoading, updateSettings: updateAxiaSettings } = useCompanyAISettings();
  
  const [axiaEnabled, setAxiaEnabled] = useState(true);
  const [axiaLlm, setAxiaLlm] = useState(true);
  const [axiaPredictive, setAxiaPredictive] = useState(true);
  const [axiaContextual, setAxiaContextual] = useState(true);
  const [axiaMargin, setAxiaMargin] = useState('15');
  const [axiaSensitivity, setAxiaSensitivity] = useState('2.5');

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
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailRDOs: true,
    emailOrcamentos: true,
    emailAlertas: true,
    emailRelatorios: true,
    pushNotifications: true,
    pushAlertas: true,
    pushTarefas: true,
  });

  // Live clock for timezone preview
  const [currentTime, setCurrentTime] = useState(getCurrentTimeFormatted(true));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeFormatted(true));
    }, 1000);
    return () => clearInterval(interval);
  }, [getCurrentTimeFormatted]);

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success(t('settings_saved'));
  };

  const handleExportData = () => {
    toast.info(t('export_started'));
  };

  const handleDeleteAccount = () => {
    toast.error(t('delete_requires_email'));
  };

  const exampleAmount = 12500.75;
  const exampleDate = new Date();

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
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {t('email_notifications')}
              </CardTitle>
              <CardDescription>
                {t('email_notifications_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('new_rdos')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('new_rdos_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.emailRDOs}
                  onCheckedChange={() => handleNotificationChange('emailRDOs')}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('budgets')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('budgets_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.emailOrcamentos}
                  onCheckedChange={() => handleNotificationChange('emailOrcamentos')}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('project_alerts')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('project_alerts_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.emailAlertas}
                  onCheckedChange={() => handleNotificationChange('emailAlertas')}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('weekly_reports')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('weekly_reports_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.emailRelatorios}
                  onCheckedChange={() => handleNotificationChange('emailRelatorios')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                {t('push_notifications')}
              </CardTitle>
              <CardDescription>
                {t('push_notifications_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('enable_push')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('enable_push_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.pushNotifications}
                  onCheckedChange={() => handleNotificationChange('pushNotifications')}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('urgent_alerts')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('urgent_alerts_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.pushAlertas}
                  onCheckedChange={() => handleNotificationChange('pushAlertas')}
                  disabled={!notifications.pushNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('task_reminders')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('task_reminders_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.pushTarefas}
                  onCheckedChange={() => handleNotificationChange('pushTarefas')}
                  disabled={!notifications.pushNotifications}
                />
              </div>
              
              <div className="pt-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <Bell className="w-4 h-4" />
                  <span>{t('push_permission_note')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regional Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t('regional_preferences')}
              </CardTitle>
              <CardDescription>
                {t('regional_preferences_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('language')}</Label>
                <Select 
                  value={preferences.language} 
                  onValueChange={(v) => updatePreferences({ language: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="es-ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>{t('date_format')}</Label>
                <Select 
                  value={preferences.dateFormat} 
                  onValueChange={(v) => updatePreferences({ dateFormat: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/MM/yyyy">DD/MM/AAAA (18/01/2026)</SelectItem>
                    <SelectItem value="MM/dd/yyyy">MM/DD/AAAA (01/18/2026)</SelectItem>
                    <SelectItem value="yyyy-MM-dd">AAAA-MM-DD (2026-01-18)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('example')}: {formatDate(exampleDate)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>{t('currency_label')}</Label>
                <Select 
                  value={preferences.currency} 
                  onValueChange={(v) => updatePreferences({ currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                    <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                    <SelectItem value="GBP">Libra Esterlina (£)</SelectItem>
                    <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('example')}: {formatCurrency(exampleAmount)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>{t('timezone')}</Label>
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

              {/* Live clock preview */}
              <div className="pt-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">{t('current_time_in')} {timezoneDisplay}:</span>
                  <span className="font-mono font-medium text-primary">{currentTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                {t('appearance')}
              </CardTitle>
              <CardDescription>
                {t('appearance_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('theme')}</Label>
                <Select value={theme || 'light'} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t('theme_light')}</SelectItem>
                    <SelectItem value="dark">{t('theme_dark')}</SelectItem>
                    <SelectItem value="system">{t('theme_system')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-foreground">
                  {theme === 'dark' ? t('theme_active_dark') : theme === 'system' ? t('theme_active_system') : t('theme_active_light')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Axia Settings */}
        <Card className="border-[#7C3AED]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AxiaIcon size={20} className="text-[#7C3AED]" />
              Axia
            </CardTitle>
            <CardDescription>
              {t('axia_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('enable_axia')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('enable_axia_desc')}
                </p>
              </div>
              <Switch
                checked={axiaEnabled}
                onCheckedChange={(v) => {
                  setAxiaEnabled(v);
                  updateAxiaSettings.mutate({ enabled: v });
                }}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('auto_recommendations')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('auto_recommendations_desc')}
                </p>
              </div>
              <Switch
                checked={axiaLlm}
                onCheckedChange={(v) => {
                  setAxiaLlm(v);
                  updateAxiaSettings.mutate({ llm_enabled: v });
                }}
                disabled={!axiaEnabled}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('predictive_mode')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('predictive_mode_desc')}
                </p>
              </div>
              <Switch
                checked={axiaPredictive}
                onCheckedChange={(v) => {
                  setAxiaPredictive(v);
                  updateAxiaSettings.mutate({ enabled: axiaEnabled });
                }}
                disabled={!axiaEnabled}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Assistente Contextual</Label>
                <p className="text-sm text-muted-foreground">
                  Chat inteligente da Axia com acesso aos dados da plataforma
                </p>
              </div>
              <Switch
                checked={axiaContextual}
                onCheckedChange={(v) => {
                  setAxiaContextual(v);
                  updateAxiaSettings.mutate({ contextual_assistant_enabled: v } as any);
                }}
                disabled={!axiaEnabled}
              />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('min_margin')}</Label>
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
                <Label>{t('alert_sensitivity')}</Label>
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

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('data_privacy')}
            </CardTitle>
            <CardDescription>
              {t('data_privacy_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Download className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{t('export_data')}</h4>
                      <p className="text-xs text-muted-foreground">{t('export_data_desc')}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    {t('export')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Database className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{t('session_history')}</h4>
                      <p className="text-xs text-muted-foreground">{t('session_history_desc')}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Database className="w-4 h-4 mr-2" />
                    {t('view_sessions')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-destructive/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-destructive">{t('delete_account')}</h4>
                      <p className="text-xs text-muted-foreground">{t('delete_account_short')}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/50 hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4 mr-2" />
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
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('save_settings')}
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
