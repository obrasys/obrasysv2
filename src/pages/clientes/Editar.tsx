import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClienteForm } from '@/components/clientes';
import { useCliente } from '@/hooks/useClientes';
import { useClientes } from '@/hooks/useClientes';
import type { ClienteFormData } from '@/types/clientes';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function EditarClientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cliente, isLoading } = useCliente(id);
  const { updateCliente } = useClientes();

  const handleSubmit = async (data: ClienteFormData) => {
    if (!id) return;
    await updateCliente.mutateAsync({ id, data });
    navigate(`/clientes/${id}`);
  };

  if (isLoading) {
    return (
      <AppLayout title="Editar Cliente">
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
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!cliente) {
    return (
      <AppLayout title="Cliente não encontrado">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Cliente não encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              O cliente que procura não existe ou foi eliminado.
            </p>
            <Button className="mt-4" onClick={() => navigate('/clientes')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à lista
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Editar Cliente">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/clientes/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Cliente</h1>
            <p className="text-muted-foreground">{cliente.nome}</p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <ClienteForm
            cliente={cliente}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/clientes/${id}`)}
            isLoading={updateCliente.isPending}
          />
        </div>
      </div>
    </AppLayout>
  );
}
