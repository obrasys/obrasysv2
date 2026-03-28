import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { RDOForm } from '@/components/rdos';
import { useRDOs } from '@/hooks/useRDOs';
import { useProjectMaterialRequests } from '@/hooks/useProjectResources';
import type { RDOFormData } from '@/types/rdos';
import { ArrowLeft } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function CriarRDOPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const obraId = searchParams.get('obra') || undefined;
  const { createRDO } = useRDOs();
  const { createRequest } = useProjectMaterialRequests(obraId);

  const handleSubmit = async (data: RDOFormData & { materialRequests?: any[] }) => {
    const rdo = await createRDO.mutateAsync(data);

    // Save material requests
    if (data.materialRequests && data.materialRequests.length > 0) {
      const tomorrow = format(addDays(new Date(data.data), 1), 'yyyy-MM-dd');
      for (const req of data.materialRequests) {
        await createRequest.mutateAsync({
          project_id: data.obra_id,
          rdo_id: rdo.id,
          needed_for_date: tomorrow,
          free_text_item_name: req.free_text_item_name,
          item_type: req.item_type,
          quantity: req.quantity,
          unit: req.unit,
          priority: req.priority,
          notes: req.notes || undefined,
        });
      }
    }

    if (obraId) {
      navigate(`/obras/${obraId}`);
    } else {
      navigate('/rdos');
    }
  };

  return (
    <AppLayout title="Novo RDO">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Novo RDO</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Criar relatório diário de obra
            </p>
          </div>
        </div>

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
