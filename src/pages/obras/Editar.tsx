import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ObraForm } from '@/components/obras/ObraForm';
import { useObras, useObra } from '@/hooks/useObras';
import type { ObraFormData } from '@/types/obras';

export default function EditarObraPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateObra } = useObras();
  const { obra, isLoading } = useObra(id);

  const handleSubmit = async (data: ObraFormData) => {
    if (!id) return;
    await updateObra.mutateAsync({ id, ...data });
    navigate(`/obras/${id}`);
  };

  if (isLoading) {
    return (
      <AppLayout title="A carregar...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!obra) {
    return (
      <AppLayout title="Obra não encontrada">
        <div className="p-6 text-center">
          <p className="text-muted-foreground">A obra solicitada não foi encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/obras')}>
            Voltar às Obras
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Editar: ${obra.nome}`}
      subtitle="Atualize as informações da obra"
      actions={
        <Button variant="outline" onClick={() => navigate(`/obras/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Obra</CardTitle>
            <CardDescription>
              Atualize as informações do projeto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ObraForm
              obra={obra}
              onSubmit={handleSubmit}
              onCancel={() => navigate(`/obras/${id}`)}
              isLoading={updateObra.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
