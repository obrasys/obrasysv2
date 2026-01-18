import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClienteForm } from '@/components/clientes';
import { useClientes } from '@/hooks/useClientes';
import type { ClienteFormData } from '@/types/clientes';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function CriarClientePage() {
  const navigate = useNavigate();
  const { createCliente } = useClientes();

  const handleSubmit = async (data: ClienteFormData) => {
    await createCliente.mutateAsync(data);
    navigate('/clientes');
  };

  return (
    <AppLayout title="Novo Cliente">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Cliente</h1>
            <p className="text-muted-foreground">
              Preencha os dados para criar um novo cliente
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <ClienteForm
            onSubmit={handleSubmit}
            onCancel={() => navigate('/clientes')}
            isLoading={createCliente.isPending}
          />
        </div>
      </div>
    </AppLayout>
  );
}
