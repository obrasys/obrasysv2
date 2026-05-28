import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoForm } from '@/components/orcamentos/OrcamentoForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Map } from 'lucide-react';
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

  const handleImportarPlanta = async (data: OrcamentoFormData) => {
    if (!data.titulo?.trim()) {
      toast.error('Indique o título do orçamento antes de importar a planta.');
      return;
    }
    try {
      const result = await createOrcamento.mutateAsync(data);
      toast.success('Orçamento criado. Importe a planta para gerar os quantitativos.');
      navigate(`/orcamentos/${result.id}/plantas`);
    } catch {
      toast.error('Não foi possível iniciar a importação da planta.');
    }
  };

  return (
    <AppLayout title="Criar Orçamento" subtitle="Preencha as informações do novo orçamento">
      <div className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col gap-3 p-4 h-full">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                    Já tem o orçamento em Excel?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Importe .xlsx, .csv, .pdf ou .docx e a Axia organiza tudo por si.
                  </p>
                </div>
                <Button onClick={() => setImportOpen(true)} variant="default" className="mt-auto">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Importar Excel
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col gap-3 p-4 h-full">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <Map className="w-4 h-4 text-primary" />
                    Tem a planta do projeto?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Carregue um PDF/imagem da planta e gere quantitativos automáticos para este orçamento.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-auto"
                  onClick={() => {
                    // Trigger form submit via a custom event picked up by OrcamentoForm
                    document.dispatchEvent(new CustomEvent('orcamento-form:submit-for-planta'));
                  }}
                >
                  <Map className="w-4 h-4 mr-2" />
                  Importar Planta
                </Button>
              </CardContent>
            </Card>
          </div>

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
                onImportPlanta={handleImportarPlanta}
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
