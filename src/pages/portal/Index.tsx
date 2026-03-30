import { ClientPortalLayout } from '@/components/portal/ClientPortalLayout';
import { PortalObraCard } from '@/components/portal/PortalObraCard';
import { useClientPortal } from '@/hooks/useClientPortal';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Building2, HardHat, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const PortalIndex = () => {
  const { obras, obrasLoading } = useClientPortal();
  const { profile } = useAuth();

  const obrasEmCurso = obras?.filter(o => o.status === 'em_curso').length || 0;
  const obrasConcluidas = obras?.filter(o => o.status === 'concluida').length || 0;
  const obrasPlaneamento = obras?.filter(o => o.status === 'planeamento' || o.status === 'pausada').length || 0;

  const firstName = profile?.nome?.split(' ')[0] || 'Cliente';

  return (
    <ClientPortalLayout
      title={`Olá, ${firstName}`}
      subtitle="Acompanhe o progresso das suas obras em tempo real"
    >
      {obrasLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !obras || obras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Sem obras atribuídas</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Quando a sua obra for adjudicada, poderá acompanhar todo o progresso aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <HardHat className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none">{obrasEmCurso}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Em Curso</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none">{obrasConcluidas}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Concluídas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none">{obrasPlaneamento}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Planeamento</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Obras Grid */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">As suas obras</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {obras.map((obra) => (
                <PortalObraCard key={obra.id} obra={obra} />
              ))}
            </div>
          </div>
        </div>
      )}
    </ClientPortalLayout>
  );
};

export default PortalIndex;