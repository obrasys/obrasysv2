import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

interface NotificationSettings {
  emailRDOs: boolean;
  emailOrcamentos: boolean;
  emailAlertas: boolean;
  emailRelatorios: boolean;
  pushNotifications: boolean;
  pushAlertas: boolean;
  pushTarefas: boolean;
}

interface PreferencesSettings {
  language: string;
  dateFormat: string;
  currency: string;
  timezone: string;
}

export default function DefinicoesPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailRDOs: true,
    emailOrcamentos: true,
    emailAlertas: true,
    emailRelatorios: false,
    pushNotifications: true,
    pushAlertas: true,
    pushTarefas: true,
  });

  const [preferences, setPreferences] = useState<PreferencesSettings>({
    language: 'pt-PT',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR',
    timezone: 'Europe/Lisbon',
  });

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePreferenceChange = (key: keyof PreferencesSettings, value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate save - in a real app this would save to the database
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Definições guardadas com sucesso!');
  };

  const handleExportData = () => {
    toast.info('A exportação de dados será iniciada em breve...');
    // In a real app, this would trigger a data export
  };

  const handleDeleteAccount = () => {
    toast.error('Esta funcionalidade requer confirmação adicional via email.');
  };

  return (
    <AppLayout 
      title="Definições"
      subtitle="Personalize a sua experiência e preferências"
      actions={
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Notificações por Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Notificações por Email
              </CardTitle>
              <CardDescription>
                Configure quais emails deseja receber
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Novos RDOs</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber email quando um RDO é submetido para aprovação
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
                  <Label>Orçamentos</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações sobre alterações em orçamentos
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
                  <Label>Alertas de Obra</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas sobre atrasos e problemas nas obras
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
                  <Label>Relatórios Semanais</Label>
                  <p className="text-sm text-muted-foreground">
                    Resumo semanal das atividades das suas obras
                  </p>
                </div>
                <Switch
                  checked={notifications.emailRelatorios}
                  onCheckedChange={() => handleNotificationChange('emailRelatorios')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notificações Push */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Notificações Push
              </CardTitle>
              <CardDescription>
                Notificações no navegador e dispositivos móveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativar Notificações Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir notificações no navegador
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
                  <Label>Alertas Urgentes</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações imediatas para problemas críticos
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
                  <Label>Lembretes de Tarefas</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber lembretes de tarefas pendentes
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
                  <span>As notificações push requerem permissão do navegador</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferências Regionais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Preferências Regionais
              </CardTitle>
              <CardDescription>
                Idioma, formato de data e moeda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select 
                  value={preferences.language} 
                  onValueChange={(v) => handlePreferenceChange('language', v)}
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
                <Label>Formato de Data</Label>
                <Select 
                  value={preferences.dateFormat} 
                  onValueChange={(v) => handlePreferenceChange('dateFormat', v)}
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
              </div>
              
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select 
                  value={preferences.currency} 
                  onValueChange={(v) => handlePreferenceChange('currency', v)}
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
              </div>
              
              <div className="space-y-2">
                <Label>Fuso Horário</Label>
                <Select 
                  value={preferences.timezone} 
                  onValueChange={(v) => handlePreferenceChange('timezone', v)}
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
            </CardContent>
          </Card>

          {/* Aparência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Aparência
              </CardTitle>
              <CardDescription>
                Personalize a aparência da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select defaultValue="light">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O tema escuro estará disponível em breve
                </p>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Tema claro ativo</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dados e Privacidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Dados e Privacidade
            </CardTitle>
            <CardDescription>
              Gerir os seus dados e configurações de privacidade
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
                      <h4 className="font-medium">Exportar Dados</h4>
                      <p className="text-xs text-muted-foreground">Baixar uma cópia dos seus dados</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
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
                      <h4 className="font-medium">Histórico de Sessões</h4>
                      <p className="text-xs text-muted-foreground">Ver dispositivos conectados</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Database className="w-4 h-4 mr-2" />
                    Ver Sessões
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
                      <h4 className="font-medium text-destructive">Eliminar Conta</h4>
                      <p className="text-xs text-muted-foreground">Remover permanentemente</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/50 hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="w-5 h-5" />
                          Eliminar Conta Permanentemente
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação é irreversível. Todos os seus dados, incluindo obras, orçamentos, RDOs e clientes serão permanentemente eliminados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Confirmar Eliminação
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
                A guardar...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Definições
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
