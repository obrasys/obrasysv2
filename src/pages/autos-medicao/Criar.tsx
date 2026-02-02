import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { AutoMedicaoForm } from '@/components/autos-medicao';
import { useAutosMedicao } from '@/hooks/useAutosMedicao';
import { ArrowLeft } from 'lucide-react';
import type { AutoMedicaoFormData } from '@/types/autos-medicao';

export default function CriarAutoMedicaoPage() {
  const navigate = useNavigate();
  const { createAuto, isCreating } = useAutosMedicao();

  const handleSubmit = (data: AutoMedicaoFormData) => {
    createAuto(data, {
      onSuccess: () => {
        navigate('/autos-medicao');
      },
    });
  };

  return (
    <AppLayout title="Novo Auto de Medição" subtitle="Criar certificado de medição">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Novo Auto de Medição</h1>
            <p className="text-muted-foreground">
              Crie um novo certificado de medição
            </p>
          </div>
        </div>

        <AutoMedicaoForm onSubmit={handleSubmit} isLoading={isCreating} />
      </div>
    </AppLayout>
  );
}
