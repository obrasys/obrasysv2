import { useSearchParams } from 'react-router-dom';
import { useInstalacoes } from '@/hooks/useInstalacoes';
import { PackageForm } from './PackageForm';
import { EstimativasCard } from './EstimativasCard';
import { PreviaOrcamentoCard } from './PreviaOrcamentoCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { SPECIALTY_LABELS, PROFILE_LABELS, type Specialty } from '@/types/instalacoes';

interface Props {
  specialty: Specialty;
}

export function SpecialtyPage({ specialty }: Props) {
  const [searchParams] = useSearchParams();
  const defaultObraId = searchParams.get('obra') ?? undefined;
  const { packages, createPackage, deletePackage } = useInstalacoes();

  const filtered = packages.filter(p => p.specialty === specialty);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PackageForm
        specialty={specialty}
        defaultObraId={defaultObraId}
        onSubmit={data => createPackage.mutate(data)}
        loading={createPackage.isPending}
      />

      {filtered.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pacotes de {SPECIALTY_LABELS[specialty]}</h3>
          {filtered.map(pkg => (
            <div key={pkg.id} className="space-y-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">
                      {pkg.obras?.nome ?? 'Obra'} — {PROFILE_LABELS[pkg.profile]}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {pkg.typology} | {pkg.area_m2}m² | {pkg.bathrooms} WC | {pkg.bedrooms} quartos
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                      {pkg.status === 'draft' ? 'Rascunho' : pkg.status === 'sent' ? 'Enviado' : 'Ativo'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => deletePackage.mutate(pkg.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
              <EstimativasCard pkg={pkg} />
              <PreviaOrcamentoCard packageId={pkg.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
