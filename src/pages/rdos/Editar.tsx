import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { RDOForm } from '@/components/rdos';
import { useRDO, useRDOs } from '@/hooks/useRDOs';
import type { RDOFormData } from '@/types/rdos';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function EditarRDOPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rdo, isLoading } = useRDO(id);
  const { updateRDO } = useRDOs();

  const handleSubmit = async (data: RDOFormData) => {
    if (!id) return;
    await updateRDO.mutateAsync({ id, data });
    navigate(`/rdos/${id}`);
  };

  if (isLoading) {
    return (
      <AppLayout title="Editar RDO">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
          </div>
          <div className="max-w-2xl space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!rdo) {
    return (
      <AppLayout title="RDO não encontrado">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">RDO não encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              O relatório que procura não existe ou foi eliminado.
            </p>
            <Button className="mt-4" onClick={() => navigate('/rdos')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à lista
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (rdo.status !== 'rascunho') {
    return (
      <AppLayout title="RDO não editável">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">RDO não editável</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Este relatório já foi submetido e não pode ser editado.
            </p>
            <Button className="mt-4" onClick={() => navigate(`/rdos/${id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ver detalhes
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Editar RDO">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/rdos/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar RDO</h1>
            <p className="text-muted-foreground">{rdo.obra?.nome}</p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <RDOForm
            rdo={rdo}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/rdos/${id}`)}
            isLoading={updateRDO.isPending}
          />
        </div>
      </div>
    </AppLayout>
  );
}
