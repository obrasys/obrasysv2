import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoForm } from '@/components/orcamentos/OrcamentoForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { OrcamentoFormData } from '@/types/orcamentos';

export default function CriarOrcamentoPage() {
  const navigate = useNavigate();
  const { createOrcamento } = useOrcamentos();
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const handleSubmit = async (data: OrcamentoFormData) => {
    const result = await createOrcamento.mutateAsync(data);
    navigate(`/orcamentos/${result.id}/editar`);
  };

  const handleSaveDraft = async (data: OrcamentoFormData) => {
    setIsSavingDraft(true);
    try {
      await createOrcamento.mutateAsync(data);
      toast.success('Rascunho guardado com sucesso!');
      navigate('/orcamentos');
    } catch {
      toast.error('Erro ao guardar rascunho.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <AppLayout title="Criar Orçamento" subtitle="Preencha as informações do novo orçamento">
      <div className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Orçamento</CardTitle>
              <CardDescription>
                Configure o título, obra associada e parâmetros de cálculo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrcamentoForm
                onSubmit={handleSubmit}
                onSaveDraft={handleSaveDraft}
                isLoading={createOrcamento.isPending}
                isSavingDraft={isSavingDraft}
                submitLabel="Criar e Continuar"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
