import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, Droplets, Wifi, TrendingUp, Euro, Package, Settings, 
  ArrowRight, CircleDot, Ruler, Plus, BarChart3 
} from 'lucide-react';
import { useInstalacoes } from '@/hooks/useInstalacoes';
import { SPECIALTY_LABELS, PROFILE_LABELS, type Specialty, type Profile } from '@/types/instalacoes';
import { useNavigate } from 'react-router-dom';
import { useFormatting } from '@/hooks/useFormatting';

const SPECIALTY_CONFIG: Record<Specialty, { icon: React.ElementType; route: string; gradient: string; iconBg: string }> = {
  electrical: { 
    icon: Zap, 
    route: '/instalacoes/eletrica',
    gradient: 'from-amber-500/10 to-amber-500/5',
    iconBg: 'bg-amber-500/15 text-amber-600',
  },
  plumbing: { 
    icon: Droplets, 
    route: '/instalacoes/canalizacao',
    gradient: 'from-blue-500/10 to-blue-500/5',
    iconBg: 'bg-blue-500/15 text-blue-600',
  },
  telecom: { 
    icon: Wifi, 
    route: '/instalacoes/telecom',
    gradient: 'from-violet-500/10 to-violet-500/5',
    iconBg: 'bg-violet-500/15 text-violet-600',
  },
};

const PROFILE_COLORS: Record<Profile, string> = {
  eco: 'bg-emerald-100 text-emerald-700',
  med: 'bg-blue-100 text-blue-700',
  premium: 'bg-amber-100 text-amber-700',
};

export function InstallationsDashboard() {
  const { packages, packagesLoading } = useInstalacoes();
  const navigate = useNavigate();
  const { formatCurrency } = useFormatting();

  const totalCost = packages.reduce((s, p) => s + Number(p.total_cost_estimated), 0);
  const totalPoints = packages.reduce((s, p) => s + (p.points_final ?? p.points_estimated), 0);
  const totalLinear = packages.reduce((s, p) => s + (p.linear_m_final ?? p.linear_m_estimated), 0);
  const avgProgress = packages.length > 0
    ? Math.round(packages.reduce((s, p) => s + Number(p.progress_percent), 0) / packages.length)
    : 0;

  const bySpecialty = (s: Specialty) => packages.filter(p => p.specialty === s);
  const specialtyCost = (s: Specialty) => bySpecialty(s).reduce((sum, p) => sum + Number(p.total_cost_estimated), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Euro className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Custo Total</p>
              <p className="text-lg font-bold truncate">{formatCurrency(totalCost)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <CircleDot className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Pontos Totais</p>
              <p className="text-lg font-bold">{totalPoints}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Ruler className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Metros Lineares</p>
              <p className="text-lg font-bold">{totalLinear} m</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Progresso Médio</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{avgProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Specialty Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['electrical', 'plumbing', 'telecom'] as Specialty[]).map(s => {
          const config = SPECIALTY_CONFIG[s];
          const Icon = config.icon;
          const count = bySpecialty(s).length;
          const cost = specialtyCost(s);

          return (
            <Card 
              key={s} 
              className={`cursor-pointer hover:shadow-md transition-all group bg-gradient-to-br ${config.gradient} border-0`}
              onClick={() => navigate(config.route)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-11 w-11 rounded-xl ${config.iconBg} flex items-center justify-center`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
                <h3 className="font-semibold text-base mb-1">{SPECIALTY_LABELS[s]}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {count === 0 ? 'Nenhum pacote' : `${count} pacote${count > 1 ? 's' : ''}`}
                </p>
                {count > 0 && (
                  <p className="text-lg font-bold text-foreground">{formatCurrency(cost)}</p>
                )}
                {count === 0 && (
                  <Button variant="outline" size="sm" className="mt-1 gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Criar Pacote
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Packages List */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Pacotes Ativos
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/instalacoes/configurar')} className="gap-1.5 text-muted-foreground">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurar</span>
          </Button>
        </CardHeader>
        <CardContent>
          {packagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="mx-auto h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Sem pacotes criados</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione uma especialidade acima para começar a orçamentar instalações.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map(pkg => {
                const config = SPECIALTY_CONFIG[pkg.specialty];
                const Icon = config.icon;
                const progress = Number(pkg.progress_percent);

                return (
                  <div 
                    key={pkg.id} 
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(config.route + '?obra=' + pkg.obra_id)}
                  >
                    <div className={`h-9 w-9 rounded-lg ${config.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm truncate">{pkg.obras?.nome ?? 'Obra'}</p>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${PROFILE_COLORS[pkg.profile]}`}>
                          {PROFILE_LABELS[pkg.profile]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{SPECIALTY_LABELS[pkg.specialty]}</span>
                        <span>·</span>
                        <span>{pkg.typology}</span>
                        <span>·</span>
                        <span>{pkg.area_m2}m²</span>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(Number(pkg.total_cost_estimated))}</p>
                        <p className="text-[10px] text-muted-foreground">{pkg.points_final ?? pkg.points_estimated} pts</p>
                      </div>
                      <div className="w-20">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Progresso</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </div>

                    <Badge 
                      variant={pkg.status === 'active' ? 'default' : 'secondary'}
                      className="shrink-0 hidden sm:flex"
                    >
                      {pkg.status === 'draft' ? 'Rascunho' : pkg.status === 'sent' ? 'Enviado' : 'Ativo'}
                    </Badge>

                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
