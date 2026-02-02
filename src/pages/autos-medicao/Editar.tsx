import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { AutoMedicaoForm } from '@/components/autos-medicao';
import { useAutoMedicao, useAutosMedicao } from '@/hooks/useAutosMedicao';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { AutoMedicaoFormData } from '@/types/autos-medicao';

export default function EditarAutoMedicaoPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: auto, isLoading } = useAutoMedicao(id);
  const { updateAuto, isUpdating } = useAutosMedicao();

  const handleSubmit = (data: AutoMedicaoFormData) => {
    if (!id) return;
    
    updateAuto({ id, data }, {
      onSuccess: () => {
        navigate(`/autos-medicao/${id}`);
      },
    });
  };

  if (isLoading) {
    return (
      <AppLayout title="A carregar..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!auto) {
    return (
      <AppLayout title="Não encontrado" subtitle="">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Auto de medição não encontrado</p>
          <Button className="mt-4" onClick={() => navigate('/autos-medicao')}>
            Voltar à lista
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Editar Auto nº ${auto.numero_auto}`} subtitle={auto.obra?.nome || ''}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Auto nº {auto.numero_auto}</h1>
            <p className="text-muted-foreground">
              {auto.obra?.nome}
            </p>
          </div>
        </div>

        <AutoMedicaoForm 
          auto={auto} 
          onSubmit={handleSubmit} 
          isLoading={isUpdating} 
        />
      </div>
    </AppLayout>
  );
}
