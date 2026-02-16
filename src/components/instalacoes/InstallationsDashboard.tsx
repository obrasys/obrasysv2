import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Droplets, Wifi, TrendingUp, Plus } from 'lucide-react';
import { useInstalacoes } from '@/hooks/useInstalacoes';
import { SPECIALTY_LABELS, PROFILE_LABELS, type Specialty } from '@/types/instalacoes';
import { useNavigate } from 'react-router-dom';
import { useFormatting } from '@/hooks/useFormatting';

const SPECIALTY_ICONS: Record<Specialty, React.ElementType> = {
  electrical: Zap,
  plumbing: Droplets,
  telecom: Wifi,
};

const SPECIALTY_ROUTES: Record<Specialty, string> = {
  electrical: '/instalacoes/eletrica',
  plumbing: '/instalacoes/canalizacao',
  telecom: '/instalacoes/telecom',
};

export function InstallationsDashboard() {
  const { packages, packagesLoading } = useInstalacoes();
  const navigate = useNavigate();
  const { formatCurrency } = useFormatting();

  const totalCost = packages.reduce((s, p) => s + Number(p.total_cost_estimated), 0);
  const avgProgress = packages.length > 0
    ? Math.round(packages.reduce((s, p) => s + Number(p.progress_percent), 0) / packages.length)
    : 0;

  const bySpecialty = (s: Specialty) => packages.filter(p => p.specialty === s);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total Estimado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <p className="text-xs text-muted-foreground">{packages.length} pacote(s) ativo(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Especialidades</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {(['electrical', 'plumbing', 'telecom'] as Specialty[]).map(s => {
              const Icon = SPECIALTY_ICONS[s];
              const count = bySpecialty(s).length;
              return (
                <Button key={s} variant="outline" size="sm" onClick={() => navigate(SPECIALTY_ROUTES[s])}>
                  <Icon className="h-4 w-4 mr-1" />
                  {count}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {(['electrical', 'plumbing', 'telecom'] as Specialty[]).map(s => {
          const Icon = SPECIALTY_ICONS[s];
          return (
            <Button key={s} onClick={() => navigate(SPECIALTY_ROUTES[s])} variant="outline">
              <Icon className="h-4 w-4 mr-2" />
              {SPECIALTY_LABELS[s]}
            </Button>
          );
        })}
        <Button variant="outline" onClick={() => navigate('/instalacoes/configurar')}>
          Configurar
        </Button>
      </div>

      {/* Packages table */}
      <Card>
        <CardHeader>
          <CardTitle>Pacotes Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {packagesLoading ? (
            <p className="text-muted-foreground">A carregar...</p>
          ) : packages.length === 0 ? (
            <p className="text-muted-foreground">Nenhum pacote criado. Selecione uma especialidade para começar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Obra</th>
                    <th className="text-left py-2">Especialidade</th>
                    <th className="text-left py-2">Perfil</th>
                    <th className="text-right py-2">Custo Est.</th>
                    <th className="text-right py-2">Progresso</th>
                    <th className="text-left py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map(pkg => {
                    const Icon = SPECIALTY_ICONS[pkg.specialty];
                    return (
                      <tr key={pkg.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => navigate(SPECIALTY_ROUTES[pkg.specialty] + '?obra=' + pkg.obra_id)}>
                        <td className="py-2">{pkg.obras?.nome ?? '-'}</td>
                        <td className="py-2 flex items-center gap-1">
                          <Icon className="h-3 w-3" />
                          {SPECIALTY_LABELS[pkg.specialty]}
                        </td>
                        <td className="py-2">{PROFILE_LABELS[pkg.profile]}</td>
                        <td className="py-2 text-right">{formatCurrency(Number(pkg.total_cost_estimated))}</td>
                        <td className="py-2 text-right">{Number(pkg.progress_percent)}%</td>
                        <td className="py-2">
                          <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                            {pkg.status === 'draft' ? 'Rascunho' : pkg.status === 'sent' ? 'Enviado' : 'Ativo'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
