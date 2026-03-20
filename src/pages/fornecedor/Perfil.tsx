import { useState, useEffect } from 'react';
import { SupplierLayout } from '@/components/fornecedor/SupplierLayout';
import { useSupplierProfile, useUpsertSupplierProfile, useSupplierCategories } from '@/hooks/useSuppliers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, Building2, MapPin, Phone, Tag, Clock, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LogoUpload } from '@/components/fornecedor/LogoUpload';

export default function FornecedorPerfil() {
  const { data: profile, isLoading } = useSupplierProfile();
  const { data: categories = [] } = useSupplierCategories();
  const upsertProfile = useUpsertSupplierProfile();
  const { toast } = useToast();

  const [form, setForm] = useState({
    legal_name: '',
    trade_name: '',
    nif: '',
    phone: '',
    location_district: '',
    location_municipality: '',
    service_areas: '',
    delivery_capability: '',
    sla_response_hours: 48,
    min_order_value: 0,
    payment_terms: '',
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setForm({
        legal_name: profile.legal_name || '',
        trade_name: profile.trade_name || '',
        nif: profile.nif || '',
        phone: profile.phone || '',
        location_district: profile.location_district || '',
        location_municipality: profile.location_municipality || '',
        service_areas: profile.service_areas || '',
        delivery_capability: profile.delivery_capability || '',
        sla_response_hours: profile.sla_response_hours || 48,
        min_order_value: profile.min_order_value || 0,
        payment_terms: profile.payment_terms || '',
      });
      // Extract category ids from linked categories
      const catIds = (profile as any).supplier_category_link?.map((l: any) => l.category_id) || [];
      setSelectedCategories(catIds);
    }
  }, [profile]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    upsertProfile.mutate({ ...form, category_ids: selectedCategories });
  };

  if (isLoading) {
    return (
      <SupplierLayout title="Perfil da Empresa">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SupplierLayout>
    );
  }

  return (
    <SupplierLayout title="Perfil da Empresa" subtitle="Configure a apresentação da sua empresa">
      <div className="max-w-3xl space-y-6">
        {/* Status badge */}
        {profile && (
          <div className="flex items-center gap-3">
            <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
              {profile.status === 'active' ? 'Conta Ativa' : profile.status === 'pending' ? 'Pendente validação' : 'Suspensa'}
            </Badge>
            {profile.is_certified && (
              <div className="flex items-center gap-1 text-primary text-sm">
                <ShieldCheck className="h-4 w-4" />
                <span>Fornecedor Certificado ObraSys</span>
              </div>
            )}
          </div>
        )}

        {/* Company info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome Legal (Razão Social) *</Label>
                <Input
                  value={form.legal_name}
                  onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                  placeholder="Empresa Lda."
                />
              </div>
              <div className="space-y-1">
                <Label>Nome Comercial</Label>
                <Input
                  value={form.trade_name}
                  onChange={(e) => setForm({ ...form, trade_name: e.target.value })}
                  placeholder="Como aparece para os clientes"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>NIF</Label>
                <Input
                  value={form.nif}
                  onChange={(e) => setForm({ ...form, nif: e.target.value })}
                  placeholder="PT123456789"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+351 xxx xxx xxx"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Localização e Área de Atuação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Distrito principal</Label>
                <Input
                  value={form.location_district}
                  onChange={(e) => setForm({ ...form, location_district: e.target.value })}
                  placeholder="ex: Leiria"
                />
              </div>
              <div className="space-y-1">
                <Label>Município principal</Label>
                <Input
                  value={form.location_municipality}
                  onChange={(e) => setForm({ ...form, location_municipality: e.target.value })}
                  placeholder="ex: Leiria"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Zonas de atuação</Label>
              <Textarea
                value={form.service_areas}
                onChange={(e) => setForm({ ...form, service_areas: e.target.value })}
                placeholder="Descreva as regiões onde fornece serviços: ex: Distrito de Leiria, Coimbra e arredores"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categorias de Fornecimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">
                    {cat.name}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Commercial terms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Condições Comerciais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>SLA de resposta (horas)</Label>
                <Input
                  type="number"
                  value={form.sla_response_hours}
                  onChange={(e) => setForm({ ...form, sla_response_hours: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Encomenda mínima (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.min_order_value}
                  onChange={(e) => setForm({ ...form, min_order_value: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Capacidade de entrega</Label>
              <Textarea
                value={form.delivery_capability}
                onChange={(e) => setForm({ ...form, delivery_capability: e.target.value })}
                placeholder="ex: Entrega em obra, levantamento em armazém, distribuição nacional"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Condições de pagamento</Label>
              <Input
                value={form.payment_terms}
                onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                placeholder="ex: 30 dias, pagamento antecipado, etc."
              />
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={upsertProfile.isPending}
          size="lg"
        >
          {upsertProfile.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Perfil
        </Button>
      </div>
    </SupplierLayout>
  );
}
