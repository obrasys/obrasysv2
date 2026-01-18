import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { RDOForm } from '@/components/rdos';
import { useRDOs } from '@/hooks/useRDOs';
import type { RDOFormData } from '@/types/rdos';
import { ArrowLeft } from 'lucide-react';

export default function CriarRDOPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const obraId = searchParams.get('obra') || undefined;
  const { createRDO } = useRDOs();

  const handleSubmit = async (data: RDOFormData) => {
    await createRDO.mutateAsync(data);
    if (obraId) {
      navigate(`/obras/${obraId}`);
    } else {
      navigate('/rdos');
    }
  };

  return (
    <AppLayout title="Novo RDO">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo RDO</h1>
            <p className="text-muted-foreground">
              Criar relatório diário de obra
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <RDOForm
            obraId={obraId}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            isLoading={createRDO.isPending}
          />
        </div>
      </div>
    </AppLayout>
  );
}
