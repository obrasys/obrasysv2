import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Camera, 
  Loader2, 
  Save,
  ArrowLeft,
  Calendar,
  Shield,
  UserPlus,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { EmpresaModal } from '@/components/perfil/EmpresaModal';
import { AddUserDialog } from '@/components/admin/AddUserDialog';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradePromptModal } from '@/components/subscription/UpgradePromptModal';

export default function PerfilPage() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile, trialDaysRemaining } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { tier } = useFeatureGate();
  
  const [formData, setFormData] = useState({
    nome: profile?.nome || '',
    empresa: profile?.empresa || '',
    telefone: profile?.telefone || '',
    nif: profile?.nif || '',
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Administrador',
      gestor: 'Gestor de Obra',
      fiscal: 'Fiscal',
      cliente: 'Cliente',
      financeiro: 'Financeiro',
      sales: 'Comercial',
    };
    return roles[role] || role;
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao atualizar foto');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: formData.nome,
          empresa: formData.empresa || null,
          telefone: formData.telefone || null,
          nif: formData.nif || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return (
      <AppLayout title="Perfil">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Profile completion calculation
  const completionFields = [
    profile.nome,
    profile.empresa,
    profile.telefone,
    profile.nif,
    profile.avatar_url,
    profile.empresa_nome,
    profile.empresa_morada,
    profile.empresa_cidade,
  ];
  const filledFields = completionFields.filter(Boolean).length;
  const completionPercent = Math.round((filledFields / completionFields.length) * 100);

  const companyHasData = !!(profile.empresa_nome || profile.empresa_morada);

  return (
    <AppLayout 
      title="O Meu Perfil"
      subtitle="Gerir informações pessoais e da empresa"
      actions={
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Profile Hero Card */}
        <Card className="overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/10" />
          <CardContent className="relative pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-14 sm:-mt-12">
              {/* Avatar */}
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-background shadow-lg ring-2 ring-primary/20">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.nome} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-bold">
                    {getInitials(profile.nome)}
                  </AvatarFallback>
                </Avatar>
                <button
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-5 h-5 text-background animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-background" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Name & Role */}
              <div className="text-center sm:text-left flex-1 pb-1">
                <h2 className="text-xl font-bold text-foreground">{profile.nome}</h2>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    {getRoleLabel(profile.role)}
                  </Badge>
                  {!profile.trial_expired && trialDaysRemaining > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {trialDaysRemaining} dias de trial
                    </Badge>
                  )}
                </div>
              </div>

              {/* Completion Ring */}
              <div className="hidden md:flex flex-col items-center gap-1">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4" className="stroke-muted" />
                    <circle
                      cx="32" cy="32" r="28" fill="none" strokeWidth="4"
                      className="stroke-primary"
                      strokeLinecap="round"
                      strokeDasharray={`${completionPercent * 1.76} 176`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                    {completionPercent}%
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Perfil completo</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Info Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Calendar, label: 'Membro desde', value: format(new Date(profile.trial_start), "MMM yyyy", { locale: pt }) },
            { icon: Building2, label: 'Empresa', value: profile.empresa || 'Não definida' },
            { icon: Phone, label: 'Telefone', value: profile.telefone || 'Não definido' },
            { icon: FileText, label: 'NIF', value: profile.nif || 'Não definido' },
          ].map((item) => (
            <Card key={item.label} className="group hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium truncate">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pessoal" className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="pessoal" className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="empresa" className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="equipa" className="flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              Equipa
            </TabsTrigger>
          </TabsList>

          {/* Personal Data Tab */}
          <TabsContent value="pessoal">
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="flex items-center gap-1.5 text-sm font-medium">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        Nome Completo
                      </Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="O seu nome"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-1.5 text-sm font-medium">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        Email
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          disabled
                          className="bg-muted/50 pr-20"
                        />
                        <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> Verificado
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa" className="flex items-center gap-1.5 text-sm font-medium">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        Empresa
                      </Label>
                      <Input
                        id="empresa"
                        value={formData.empresa}
                        onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
                        placeholder="Nome da empresa"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nif" className="flex items-center gap-1.5 text-sm font-medium">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        NIF / NIPC
                      </Label>
                      <Input
                        id="nif"
                        value={formData.nif}
                        onChange={(e) => setFormData(prev => ({ ...prev, nif: e.target.value }))}
                        placeholder="Número de contribuinte"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="telefone" className="flex items-center gap-1.5 text-sm font-medium">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        Telefone
                      </Label>
                      <Input
                        id="telefone"
                        type="tel"
                        value={formData.telefone}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                        placeholder="+351 912 345 678"
                        className="sm:max-w-md"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFormData({
                        nome: profile.nome,
                        empresa: profile.empresa || '',
                        telefone: profile.telefone || '',
                        nif: profile.nif || '',
                      })}
                    >
                      Repor
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          A guardar...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Tab */}
          <TabsContent value="empresa">
            <Card>
              <CardContent className="pt-6">
                {companyHasData ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40">
                      <Avatar className="w-14 h-14 border border-border">
                        <AvatarImage src={profile.empresa_logo_url || undefined} alt="Logo" />
                        <AvatarFallback className="bg-primary/10">
                          <Building2 className="w-6 h-6 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{profile.empresa_nome || profile.empresa || 'Empresa'}</h3>
                        {profile.empresa_nif && (
                          <p className="text-xs text-muted-foreground">NIF: {profile.empresa_nif}</p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setEmpresaModalOpen(true)}>
                        Editar
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { icon: MapPin, label: 'Morada', value: [profile.empresa_morada, profile.empresa_cidade, profile.empresa_codigo_postal].filter(Boolean).join(', ') || 'Não definida' },
                        { icon: Mail, label: 'Email', value: profile.empresa_email || 'Não definido' },
                        { icon: Phone, label: 'Telefone', value: profile.empresa_telefone || 'Não definido' },
                        { icon: MapPin, label: 'País', value: profile.empresa_pais || 'Portugal' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/60">
                          <item.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                            <p className="text-sm text-foreground truncate">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Dados da empresa por preencher</h3>
                    <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                      Preencha os dados da sua empresa para que apareçam nos seus orçamentos e documentos profissionais.
                    </p>
                    <Button onClick={() => setEmpresaModalOpen(true)}>
                      <Building2 className="w-4 h-4 mr-2" />
                      Preencher Dados
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="equipa">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Gestão de Equipa</h3>
                  <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                    Adicione colaboradores à sua conta para gerir obras em conjunto.
                  </p>
                  <Button
                    onClick={() => {
                      if (tier === 'starter' || tier === 'trial') {
                        setShowUpgradeModal(true);
                      } else {
                        setAddUserOpen(true);
                      }
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Adicionar Utilizador
                    {(tier === 'starter' || tier === 'trial') && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">PRO</Badge>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EmpresaModal 
        open={empresaModalOpen} 
        onOpenChange={setEmpresaModalOpen} 
      />
      <AddUserDialog 
        open={addUserOpen} 
        onOpenChange={setAddUserOpen} 
      />
      <UpgradePromptModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Funcionalidade do plano Professional"
        description="Para adicionar utilizadores à sua equipa, faça upgrade para o plano Professional que inclui até 10 utilizadores."
        requiredPlan="Professional"
      />
    </AppLayout>
  );
}
