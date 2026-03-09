import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { EmpresaModal } from '@/components/perfil/EmpresaModal';
import { AddUserDialog } from '@/components/admin/AddUserDialog';

export default function PerfilPage() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile, trialDaysRemaining } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
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
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          {/* Avatar & Quick Info */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="relative mx-auto">
                <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.nome} />
                  <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                    {getInitials(profile.nome)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full shadow-md"
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <CardTitle className="mt-4">{profile.nome}</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  <Shield className="w-3 h-3 mr-1" />
                  {getRoleLabel(profile.role)}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Membro desde {format(new Date(profile.trial_start), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                  </span>
                </div>
                
                {!profile.trial_expired && trialDaysRemaining > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-full justify-center py-2">
                      ⏳ {trialDaysRemaining} dias restantes de trial
                    </Badge>
                  </div>
                )}
                
                {/* Company Button */}
                <Button 
                  variant="outline" 
                  className="w-full mt-2" 
                  onClick={() => setEmpresaModalOpen(true)}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Dados da Empresa
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Atualize os seus dados pessoais e da empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">
                      <User className="w-4 h-4 inline mr-2" />
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
                    <Label htmlFor="email">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      O email não pode ser alterado
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="empresa">
                      <Building2 className="w-4 h-4 inline mr-2" />
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
                    <Label htmlFor="nif">
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
                    <Label htmlFor="telefone">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Telefone
                    </Label>
                    <Input
                      id="telefone"
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                      placeholder="+351 912 345 678"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({
                      nome: profile.nome,
                      empresa: profile.empresa || '',
                      telefone: profile.telefone || '',
                      nif: profile.nif || '',
                    })}
                  >
                    Cancelar
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
        </div>
      </div>

      {/* Empresa Modal */}
      <EmpresaModal 
        open={empresaModalOpen} 
        onOpenChange={setEmpresaModalOpen} 
      />
    </AppLayout>
  );
}
