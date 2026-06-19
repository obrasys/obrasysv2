import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Building2, Upload, Loader2, Save, Trash2, Receipt, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Formulário inline da empresa (sem Dialog).
 * Usado em /definicoes/organizacao para edição direta na página.
 */
export function EmpresaInlineForm() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    empresa_nome: profile?.empresa_nome || '',
    empresa_nif: profile?.empresa_nif || '',
    empresa_morada: profile?.empresa_morada || '',
    empresa_cidade: profile?.empresa_cidade || '',
    empresa_codigo_postal: profile?.empresa_codigo_postal || '',
    empresa_pais: profile?.empresa_pais || 'Portugal',
    empresa_telefone: profile?.empresa_telefone || '',
    empresa_email: profile?.empresa_email || '',
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Por favor, selecione uma imagem PNG, JPG ou SVG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }
    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('empresa-logos')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('empresa-logos')
        .getPublicUrl(fileName);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ empresa_logo_url: `${publicUrl}?t=${Date.now()}` })
        .eq('user_id', user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast.success('Logotipo atualizado com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao carregar logotipo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!user) return;
    setIsUploadingLogo(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ empresa_logo_url: null })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Logotipo removido');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Erro ao remover logotipo');
    } finally {
      setIsUploadingLogo(false);
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
          empresa_nome: formData.empresa_nome || null,
          empresa_nif: formData.empresa_nif || null,
          empresa_morada: formData.empresa_morada || null,
          empresa_cidade: formData.empresa_cidade || null,
          empresa_codigo_postal: formData.empresa_codigo_postal || null,
          empresa_pais: formData.empresa_pais || null,
          empresa_telefone: formData.empresa_telefone || null,
          empresa_email: formData.empresa_email || null,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Dados da empresa atualizados!');
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Erro ao atualizar dados da empresa');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24 border-2 border-border">
              <AvatarImage src={profile?.empresa_logo_url || undefined} alt="Logo da empresa" />
              <AvatarFallback className="text-2xl bg-muted">
                <Building2 className="w-10 h-10 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label>Logotipo da Empresa</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Carregar
                </Button>
                {profile?.empresa_logo_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={isUploadingLogo}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máximo 2MB.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>

          <Separator />

          {/* Form Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="empresa_nome">Nome da Empresa</Label>
              <Input
                id="empresa_nome"
                value={formData.empresa_nome}
                onChange={(e) => setFormData((p) => ({ ...p, empresa_nome: e.target.value }))}
                placeholder="Nome completo da empresa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_nif">NIF / CIF</Label>
              <Input
                id="empresa_nif"
                value={formData.empresa_nif}
                onChange={(e) => setFormData((p) => ({ ...p, empresa_nif: e.target.value }))}
                placeholder="Número de contribuinte"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_email">Email Corporativo</Label>
              <Input
                id="empresa_email"
                type="email"
                value={formData.empresa_email}
                onChange={(e) => setFormData((p) => ({ ...p, empresa_email: e.target.value }))}
                placeholder="email@empresa.pt"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="empresa_morada">Morada</Label>
              <Input
                id="empresa_morada"
                value={formData.empresa_morada}
                onChange={(e) => setFormData((p) => ({ ...p, empresa_morada: e.target.value }))}
                placeholder="Rua, número, andar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_cidade">Cidade</Label>
              <Input
                id="empresa_cidade"
                value={formData.empresa_cidade}
                onChange={(e) => setFormData((p) => ({ ...p, empresa_cidade: e.target.value }))}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_codigo_postal">Código Postal</Label>
              <Input
                id="empresa_codigo_postal"
                value={formData.empresa_codigo_postal}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, empresa_codigo_postal: e.target.value }))
                }
                placeholder="0000-000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_pais">País</Label>
              <Input
                id="empresa_pais"
                value={formData.empresa_pais}
                onChange={(e) => setFormData((p) => ({ ...p, empresa_pais: e.target.value }))}
                placeholder="Portugal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_telefone">Telefone</Label>
              <Input
                id="empresa_telefone"
                type="tel"
                value={formData.empresa_telefone}
                onChange={(e) => setFormData((p) => ({ ...p, empresa_telefone: e.target.value }))}
                placeholder="+351 000 000 000"
              />
            </div>
          </div>

          <Separator />

          {/* Integrações de Faturação */}
          <button
            type="button"
            onClick={() => navigate('/definicoes/integracoes')}
            className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">Integrações de Faturação</div>
                <p className="text-xs text-muted-foreground">
                  Configure Moloni, InvoiceXpress ou exportação manual
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex justify-end">
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
  );
}
