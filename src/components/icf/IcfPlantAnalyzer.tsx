import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileImage, Sparkles, Check, Layers, Box, LayoutGrid } from 'lucide-react';
import { usePlanImports } from '@/hooks/usePlanImports';
import { useIcfPlantAnalysis, type IcfPlantAnalysisResult } from '@/hooks/useIcfPlantAnalysis';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IcfPlantAnalyzerProps {
  obraId: string;
  configuracaoId: string;
  espessuraNucleo: number;
  classeBetao: string;
  classeAco: string;
}

export function IcfPlantAnalyzer({
  obraId,
  configuracaoId,
  espessuraNucleo,
  classeBetao,
  classeAco,
}: IcfPlantAnalyzerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { plans, isLoading: plansLoading } = usePlanImports(obraId);
  const {
    analyze,
    isAnalyzing,
    analysisResult,
    setAnalysisResult,
    createRecords,
    isCreating,
  } = useIcfPlantAnalysis();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const empresaId = user?.id || '';

  const handleSelectExisting = () => {
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;
    analyze({
      filePath: plan.file_path,
      obraId,
      configuracaoId,
      empresaId,
      espessuraNucleo,
      classeBetao,
      classeAco,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const filePath = `${user.id}/${obraId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('plan-files').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      analyze({
        filePath,
        obraId,
        configuracaoId,
        empresaId,
        espessuraNucleo,
        classeBetao,
        classeAco,
      });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateAll = () => {
    if (!analysisResult) return;
    createRecords({
      result: analysisResult,
      obraId,
      configuracaoId,
      empresaId,
      espessuraNucleo,
    });
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Axia™ — Análise de Planta ICF
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Carregue uma planta de estrutura ou arquitetura e a Axia extrai automaticamente paredes, fundações e lajes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysisResult && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={plansLoading || isAnalyzing}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecionar planta existente..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <FileImage className="h-3 w-3" />
                        {p.nome_ficheiro} (Rev.{p.revision_number})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSelectExisting}
                disabled={!selectedPlanId || isAnalyzing}
                size="sm"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground self-center">ou</div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isAnalyzing}
              >
                {isUploading || isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Carregar nova planta
              </Button>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>A Axia está a analisar a planta... Isto pode demorar até 30 segundos.</span>
          </div>
        )}

        {analysisResult && !isCreating && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ResultCard
                icon={<Layers className="h-5 w-5 text-blue-500" />}
                label="Paredes"
                count={analysisResult.paredes.length}
                details={analysisResult.paredes.map(p => `${p.referencia}: ${p.comprimento}m × ${p.altura_util}m`)}
              />
              <ResultCard
                icon={<Box className="h-5 w-5 text-amber-500" />}
                label="Fundações"
                count={analysisResult.fundacoes.length}
                details={analysisResult.fundacoes.map(f => `${f.referencia || f.tipo_fundacao}: ${f.comprimento}×${f.largura}×${f.altura}m`)}
              />
              <ResultCard
                icon={<LayoutGrid className="h-5 w-5 text-green-500" />}
                label="Lajes"
                count={analysisResult.lajes.length}
                details={analysisResult.lajes.map(l => `${l.referencia || 'Laje'}: ${l.area}m² (${l.espessura_total}m)`)}
              />
            </div>

            {analysisResult.paredes.some(p => p.vaos && p.vaos.length > 0) && (
              <div className="text-sm text-muted-foreground">
                Vãos detectados: {analysisResult.paredes.reduce((sum, p) => sum + (p.vaos?.length || 0), 0)} tipos
              </div>
            )}

            {analysisResult.notas && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                {analysisResult.notas}
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCreateAll} disabled={isCreating} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Criar todos os registos ICF
              </Button>
              <Button variant="outline" onClick={() => setAnalysisResult(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isCreating && (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>A criar registos de paredes, fundações e lajes...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultCard({
  icon,
  label,
  count,
  details,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  details: string[];
}) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{label}</span>
        </div>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {details.map((d, i) => (
          <p key={i} className="text-xs text-muted-foreground">{d}</p>
        ))}
        {details.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum encontrado</p>}
      </div>
    </div>
  );
}
