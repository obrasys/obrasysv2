import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInstalacoes } from '@/hooks/useInstalacoes';
import { PackageForm } from './PackageForm';
import { EstimativasCard } from './EstimativasCard';
import { PreviaOrcamentoCard } from './PreviaOrcamentoCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trash2, Plus, Package, ChevronDown, ChevronUp, 
  Zap, Droplets, Wifi, CircleDot, Ruler, Euro 
} from 'lucide-react';
import { SPECIALTY_LABELS, PROFILE_LABELS, type Specialty, type Profile } from '@/types/instalacoes';
import { useFormatting } from '@/hooks/useFormatting';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const SPECIALTY_ICONS: Record<Specialty, React.ElementType> = {
  electrical: Zap,
  plumbing: Droplets,
  telecom: Wifi,
};

const SPECIALTY_COLORS: Record<Specialty, { iconBg: string; accent: string }> = {
  electrical: { iconBg: 'bg-amber-500/15 text-amber-600', accent: 'border-amber-500/30' },
  plumbing: { iconBg: 'bg-blue-500/15 text-blue-600', accent: 'border-blue-500/30' },
  telecom: { iconBg: 'bg-violet-500/15 text-violet-600', accent: 'border-violet-500/30' },
};

const PROFILE_COLORS: Record<Profile, string> = {
  eco: 'bg-emerald-100 text-emerald-700',
  med: 'bg-blue-100 text-blue-700',
  premium: 'bg-amber-100 text-amber-700',
};

interface Props {
  specialty: Specialty;
}

export function SpecialtyPage({ specialty }: Props) {
  const [searchParams] = useSearchParams();
  const defaultObraId = searchParams.get('obra') ?? undefined;
  const { packages, createPackage, deletePackage } = useInstalacoes();
  const { formatCurrency } = useFormatting();
  const [showForm, setShowForm] = useState(false);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  const filtered = packages.filter(p => p.specialty === specialty);
  const Icon = SPECIALTY_ICONS[specialty];
  const colors = SPECIALTY_COLORS[specialty];

  const totalCost = filtered.reduce((s, p) => s + Number(p.total_cost_estimated), 0);
  const totalPoints = filtered.reduce((s, p) => s + (p.points_final ?? p.points_estimated), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* KPIs for this specialty */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg ${colors.iconBg} flex items-center justify-center shrink-0`}>
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pacotes</p>
              <p className="text-xl font-bold">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg ${colors.iconBg} flex items-center justify-center shrink-0`}>
              <Euro className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custo Total</p>
              <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg ${colors.iconBg} flex items-center justify-center shrink-0`}>
              <CircleDot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pontos</p>
              <p className="text-xl font-bold">{totalPoints}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg ${colors.iconBg} flex items-center justify-center shrink-0`}>
              <Ruler className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">€/Ponto</p>
              <p className="text-xl font-bold">
                {totalPoints > 0 ? formatCurrency(totalCost / totalPoints) : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Package Toggle */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Pacote de {SPECIALTY_LABELS[specialty]}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Novo Pacote</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
          <PackageForm
            specialty={specialty}
            defaultObraId={defaultObraId}
            onSubmit={data => {
              createPackage.mutate(data);
              setShowForm(false);
            }}
            loading={createPackage.isPending}
          />
        </div>
      )}

      {/* Packages List */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Pacotes de {SPECIALTY_LABELS[specialty]} ({filtered.length})
          </h3>

          {filtered.map(pkg => {
            const isExpanded = expandedPkg === pkg.id;

            return (
              <Collapsible key={pkg.id} open={isExpanded} onOpenChange={() => setExpandedPkg(isExpanded ? null : pkg.id)}>
                <Card className={`overflow-hidden transition-all ${isExpanded ? `border-l-2 ${colors.accent}` : ''}`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg ${colors.iconBg} flex items-center justify-center shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base">{pkg.obras?.nome ?? 'Obra'}</CardTitle>
                            <Badge variant="outline" className={`text-[10px] ${PROFILE_COLORS[pkg.profile]}`}>
                              {PROFILE_LABELS[pkg.profile]}
                            </Badge>
                            <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                              {pkg.status === 'draft' ? 'Rascunho' : pkg.status === 'sent' ? 'Enviado' : 'Ativo'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pkg.typology} · {pkg.area_m2}m² · {pkg.bathrooms} WC · {pkg.bedrooms} quartos
                          </p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-base font-bold">{formatCurrency(Number(pkg.total_cost_estimated))}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {pkg.points_final ?? pkg.points_estimated} pts
                          </p>
                        </div>
                        <div className="shrink-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <Tabs defaultValue="estimativas" className="w-full">
                        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide">
                          <TabsTrigger value="estimativas" className="text-xs gap-1">
                            <CircleDot className="h-3 w-3" />
                            Estimativas
                          </TabsTrigger>
                          <TabsTrigger value="orcamento" className="text-xs gap-1">
                            <Euro className="h-3 w-3" />
                            Orçamento
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="estimativas" className="mt-3">
                          <EstimativasCard pkg={pkg} />
                        </TabsContent>

                        <TabsContent value="orcamento" className="mt-3">
                          <PreviaOrcamentoCard packageId={pkg.id} obraId={pkg.obra_id} />
                        </TabsContent>
                      </Tabs>

                      <div className="flex justify-end pt-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                          onClick={() => deletePackage.mutate(pkg.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar Pacote
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <div className={`mx-auto h-14 w-14 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium text-foreground">Sem pacotes de {SPECIALTY_LABELS[specialty]}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie o primeiro pacote para começar a orçamentar esta especialidade.
              </p>
            </div>
            <Button onClick={() => setShowForm(true)} className="gap-2 mt-2">
              <Plus className="h-4 w-4" />
              Criar Pacote
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
