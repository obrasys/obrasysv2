import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoForm } from '@/components/orcamentos/OrcamentoForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrcamentoFormData } from '@/types/orcamentos';

export default function CriarOrcamentoPage() {
  const navigate = useNavigate();
  const { createOrcamento } = useOrcamentos();

  const handleSubmit = async (data: OrcamentoFormData) => {
    const result = await createOrcamento.mutateAsync(data);
    navigate(`/orcamentos/${result.id}/editar`);
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
                isLoading={createOrcamento.isPending}
                submitLabel="Criar e Continuar"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
