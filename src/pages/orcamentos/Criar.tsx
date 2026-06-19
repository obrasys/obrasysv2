import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoForm } from '@/components/orcamentos/OrcamentoForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Map, Hammer, Building2, Check } from 'lucide-react';
import { ImportOrcamentoModal } from '@/components/importar/ImportOrcamentoModal';
import { toast } from 'sonner';
import type { OrcamentoFormData } from '@/types/orcamentos';
import { type BudgetMode } from '@/lib/orcamento-seed-chapters';
import { cn } from '@/lib/utils';

export default function CriarOrcamentoPage() {
  const navigate = useNavigate();
  const { createOrcamento } = useOrcamentos();
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [budgetMode, setBudgetMode] = useState<BudgetMode>('remodelacao');

  // Garantir que o formulário arranca SEMPRE limpo (sem restauros do BFCache do
  // browser ou de estados preservados entre navegações). A key força um remount
  // do <OrcamentoForm/> a cada entrada nesta página.
  const formMountKey = useMemo(() => `criar-orcamento-${Date.now()}`, []);

  useEffect(() => {
    // Limpa eventuais rascunhos do fluxo Essencial para evitar confusão.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('orcamento-essencial-draft'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }, []);

  const buildPayload = (data: OrcamentoFormData) => ({
    ...data,
    seed_canonical_chapters: budgetMode === 'construcao_nova',
  });

  const handleSubmit = async (data: OrcamentoFormData) => {
    const result = await createOrcamento.mutateAsync(buildPayload(data));
    navigate(`/orcamentos/${result.id}/editar`);
  };

  const handleSaveDraft = async (data: OrcamentoFormData) => {
    setIsSavingDraft(true);
    try {
      await createOrcamento.mutateAsync(buildPayload(data));
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
      const result = await createOrcamento.mutateAsync(buildPayload(data));
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
          {/* Mode selector — Remodelação vs Construção Nova */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tipo de orçamento</CardTitle>
              <CardDescription>
                Escolha o ponto de partida. Pode adicionar ou remover capítulos depois.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <ModeCard
                  active={budgetMode === 'remodelacao'}
                  onClick={() => setBudgetMode('remodelacao')}
                  icon={<Hammer className="w-5 h-5" />}
                  title="Remodelação"
                  description="Orçamento em branco. Adicione apenas os capítulos do que vai intervir (pintura, pavimentos, etc.)."
                />
                <ModeCard
                  active={budgetMode === 'construcao_nova'}
                  onClick={() => setBudgetMode('construcao_nova')}
                  icon={<Building2 className="w-5 h-5" />}
                  title="Construção Nova"
                  description="Cria automaticamente os 38 capítulos canónicos (estrutura, acabamentos, instalações…)."
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="flex flex-col gap-3 p-4 h-full">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Sistema construtivo ICF?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Use o motor paramétrico ICF para orçamentar paredes, fundações e lajes — sem precisar de uma obra associada.
                  </p>
                </div>
                <Button onClick={() => navigate('/icf')} variant="default" className="mt-auto">
                  <Building2 className="w-4 h-4 mr-2" />
                  Abrir Módulo ICF
                </Button>
              </CardContent>
            </Card>

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
                  onClick={() => navigate('/planta-leitura')}
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
                key={formMountKey}
                onSubmit={handleSubmit}
                onSaveDraft={handleSaveDraft}
                onImportPlanta={handleImportarPlanta}
                isLoading={createOrcamento.isPending}
                isSavingDraft={isSavingDraft}
                submitLabel={budgetMode === 'construcao_nova' ? 'Criar com 38 capítulos' : 'Criar e Continuar'}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ImportOrcamentoModal open={importOpen} onOpenChange={setImportOpen} />
    </AppLayout>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative text-left rounded-xl border-2 p-4 transition-all',
        'hover:border-primary/60 hover:bg-primary/5',
        active ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-border bg-background',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'shrink-0 rounded-lg p-2',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{title}</p>
            {active && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">{description}</p>
        </div>
      </div>
    </button>
  );
}
