import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoForm } from '@/components/orcamentos/OrcamentoForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { ImportOrcamentoModal } from '@/components/importar/ImportOrcamentoModal';
import { toast } from 'sonner';
import type { OrcamentoFormData } from '@/types/orcamentos';

export default function CriarOrcamentoPage() {
  const navigate = useNavigate();
  const { createOrcamento } = useOrcamentos();
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  Já tem o orçamento em Excel?
                </p>
                <p className="text-sm text-muted-foreground">
                  Importe um ficheiro .xlsx, .csv, .pdf ou .docx e a Axia organiza os capítulos e artigos por si.
                </p>
              </div>
              <Button onClick={() => setImportOpen(true)} variant="default">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Importar Excel
              </Button>
            </CardContent>
          </Card>

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

      <ImportOrcamentoModal open={importOpen} onOpenChange={setImportOpen} />
    </AppLayout>
  );
}
