import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShieldCheck, HardHat, ClipboardCheck, AlertOctagon, Save,
  Loader2, Sparkles, Ban, TriangleAlert,
} from 'lucide-react';
import { useDailyReportQualitySafety } from '@/hooks/useDailyReports';
import type { QualityStatus } from '@/types/daily-reports';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  reportId: string;
  obraId: string;
}

const QUALITY_STATUS_LABELS: Record<QualityStatus, string> = {
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  partial: 'Parcial',
};

const QUALITY_STATUS_COLORS: Record<QualityStatus, string> = {
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-destructive/10 text-destructive',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

interface QualityForm {
  inspections_count: number;
  non_conformities_count: number;
  rework_generated: boolean;
  blocked_tasks_by_quality: number;
  rejected_quantity: number;
  reexecuted_quantity: number;
  quality_status: QualityStatus;
  notes: string;
}

interface SafetyForm {
  incidents_count: number;
  near_misses_count: number;
  interdicted_workfronts_count: number;
  stoppages_due_safety: number;
  lost_hours_due_safety: number;
  notes: string;
}

const INITIAL_QUALITY: QualityForm = {
  inspections_count: 0,
  non_conformities_count: 0,
  rework_generated: false,
  blocked_tasks_by_quality: 0,
  rejected_quantity: 0,
  reexecuted_quantity: 0,
  quality_status: 'approved',
  notes: '',
};

const INITIAL_SAFETY: SafetyForm = {
  incidents_count: 0,
  near_misses_count: 0,
  interdicted_workfronts_count: 0,
  stoppages_due_safety: 0,
  lost_hours_due_safety: 0,
  notes: '',
};

export function RDOQualitySafetyEditor({ reportId, obraId }: Props) {
  const { quality, safety, saveQuality, saveSafety } = useDailyReportQualitySafety(reportId);
  const { toast } = useToast();

  const [qForm, setQForm] = useState<QualityForm>({ ...INITIAL_QUALITY });
  const [sForm, setSForm] = useState<SafetyForm>({ ...INITIAL_SAFETY });
  const [axiaInsight, setAxiaInsight] = useState('');
  const [axiaLoading, setAxiaLoading] = useState(false);

  // Populate from existing data
  useEffect(() => {
    if (quality) {
      setQForm({
        inspections_count: quality.inspections_count ?? 0,
        non_conformities_count: quality.non_conformities_count ?? 0,
        rework_generated: quality.rework_generated ?? false,
        blocked_tasks_by_quality: quality.blocked_tasks_by_quality ?? 0,
        rejected_quantity: quality.rejected_quantity ?? 0,
        reexecuted_quantity: quality.reexecuted_quantity ?? 0,
        quality_status: (quality.quality_status as QualityStatus) ?? 'approved',
        notes: quality.notes ?? '',
      });
    }
  }, [quality]);

  useEffect(() => {
    if (safety) {
      setSForm({
        incidents_count: safety.incidents_count ?? 0,
        near_misses_count: safety.near_misses_count ?? 0,
        interdicted_workfronts_count: safety.interdicted_workfronts_count ?? 0,
        stoppages_due_safety: safety.stoppages_due_safety ?? 0,
        lost_hours_due_safety: safety.lost_hours_due_safety ?? 0,
        notes: safety.notes ?? '',
      });
    }
  }, [safety]);

  const handleSaveQuality = () => {
    saveQuality.mutate(
      {
        ...(quality?.id ? { id: quality.id } : {}),
        daily_report_id: reportId,
        obra_id: obraId,
        ...qForm,
      },
      {
        onSuccess: () => toast({ title: 'Qualidade guardada' }),
        onError: () => toast({ title: 'Erro ao guardar', variant: 'destructive' }),
      }
    );
  };

  const handleSaveSafety = () => {
    saveSafety.mutate(
      {
        ...(safety?.id ? { id: safety.id } : {}),
        daily_report_id: reportId,
        obra_id: obraId,
        ...sForm,
      },
      {
        onSuccess: () => toast({ title: 'Segurança guardada' }),
        onError: () => toast({ title: 'Erro ao guardar', variant: 'destructive' }),
      }
    );
  };

  const askAxia = async () => {
    setAxiaLoading(true);
    setAxiaInsight('');
    try {
      const question = `Analisa os dados de qualidade e segurança deste RDO:
Qualidade: ${qForm.inspections_count} inspeções, ${qForm.non_conformities_count} não conformidades, ${qForm.rejected_quantity} rejeitados, ${qForm.reexecuted_quantity} reexecutados, status: ${qForm.quality_status}, retrabalho: ${qForm.rework_generated ? 'sim' : 'não'}, tarefas bloqueadas: ${qForm.blocked_tasks_by_quality}.
Segurança: ${sForm.incidents_count} incidentes, ${sForm.near_misses_count} quase-acidentes, ${sForm.interdicted_workfronts_count} frentes interditadas, ${sForm.stoppages_due_safety} paragens, ${sForm.lost_hours_due_safety}h perdidas.
Dá recomendações práticas de melhoria e alerta para riscos críticos.`;

      const res = await supabase.functions.invoke('axia-chat', {
        body: { question },
        headers: { Accept: 'text/event-stream' },
      });

      if (res.error) throw res.error;

      const reader = (res.data as ReadableStream).getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              setAxiaInsight(fullText);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: any) {
      console.error('Axia error:', err);
      setAxiaInsight('Não foi possível obter análise da Axia neste momento.');
    } finally {
      setAxiaLoading(false);
    }
  };

  // Summary indicators
  const hasQualityIssues = qForm.non_conformities_count > 0 || qForm.rejected_quantity > 0;
  const hasSafetyIssues = sForm.incidents_count > 0 || sForm.interdicted_workfronts_count > 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className={hasQualityIssues ? 'border-orange-300 dark:border-orange-700' : ''}>
          <CardContent className="p-3 text-center">
            <ClipboardCheck className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{qForm.inspections_count}</p>
            <p className="text-[10px] text-muted-foreground">Inspeções</p>
          </CardContent>
        </Card>
        <Card className={qForm.non_conformities_count > 0 ? 'border-destructive/40' : ''}>
          <CardContent className="p-3 text-center">
            <AlertOctagon className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-lg font-bold">{qForm.non_conformities_count}</p>
            <p className="text-[10px] text-muted-foreground">Não Conform.</p>
          </CardContent>
        </Card>
        <Card className={sForm.incidents_count > 0 ? 'border-destructive/40' : ''}>
          <CardContent className="p-3 text-center">
            <TriangleAlert className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{sForm.incidents_count}</p>
            <p className="text-[10px] text-muted-foreground">Incidentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <HardHat className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{sForm.lost_hours_due_safety}h</p>
            <p className="text-[10px] text-muted-foreground">Horas perdidas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="qualidade">
        <TabsList className="w-full">
          <TabsTrigger value="qualidade" className="flex-1 text-xs gap-1">
            <ShieldCheck className="h-3 w-3" /> Qualidade
            {hasQualityIssues && <Badge variant="destructive" className="h-4 w-4 p-0 text-[9px] justify-center ml-1">!</Badge>}
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex-1 text-xs gap-1">
            <HardHat className="h-3 w-3" /> Segurança
            {hasSafetyIssues && <Badge variant="destructive" className="h-4 w-4 p-0 text-[9px] justify-center ml-1">!</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Quality tab */}
        <TabsContent value="qualidade" className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Inspeções realizadas</Label>
              <Input type="number" min={0} value={qForm.inspections_count} onChange={e => setQForm(f => ({ ...f, inspections_count: Number(e.target.value) }))} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Não conformidades</Label>
              <Input type="number" min={0} value={qForm.non_conformities_count} onChange={e => setQForm(f => ({ ...f, non_conformities_count: Number(e.target.value) }))} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Estado qualidade</Label>
              <Select value={qForm.quality_status} onValueChange={v => setQForm(f => ({ ...f, quality_status: v as QualityStatus }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(QUALITY_STATUS_LABELS) as [QualityStatus, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-1 ${QUALITY_STATUS_COLORS[k]}`}>{v}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Qtd. rejeitada</Label>
              <Input type="number" min={0} value={qForm.rejected_quantity} onChange={e => setQForm(f => ({ ...f, rejected_quantity: Number(e.target.value) }))} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Qtd. reexecutada</Label>
              <Input type="number" min={0} value={qForm.reexecuted_quantity} onChange={e => setQForm(f => ({ ...f, reexecuted_quantity: Number(e.target.value) }))} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Tarefas bloqueadas</Label>
              <Input type="number" min={0} value={qForm.blocked_tasks_by_quality} onChange={e => setQForm(f => ({ ...f, blocked_tasks_by_quality: Number(e.target.value) }))} className="h-9 text-xs" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={qForm.rework_generated} onCheckedChange={v => setQForm(f => ({ ...f, rework_generated: v }))} />
            <Label className="text-xs">Gerou retrabalho</Label>
          </div>

          <div>
            <Label className="text-xs">Observações de qualidade</Label>
            <Textarea value={qForm.notes} onChange={e => setQForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas sobre inspeções, resultados..." className="text-xs min-h-[50px]" />
          </div>

          <Button size="sm" onClick={handleSaveQuality} disabled={saveQuality.isPending} className="text-xs">
            {saveQuality.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Guardar Qualidade
          </Button>
        </TabsContent>

        {/* Safety tab */}
        <TabsContent value="seguranca" className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Incidentes</Label>
              <Input type="number" min={0} value={sForm.incidents_count} onChange={e => setSForm(f => ({ ...f, incidents_count: Number(e.target.value) }))} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Quase-acidentes</Label>
              <Input type="number" min={0} value={sForm.near_misses_count} onChange={e => setSForm(f => ({ ...f, near_misses_count: Number(e.target.value) }))} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Frentes interditadas</Label>
              <Input type="number" min={0} value={sForm.interdicted_workfronts_count} onChange={e => setSForm(f => ({ ...f, interdicted_workfronts_count: Number(e.target.value) }))} className="h-9 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Paragens por segurança</Label>
              <Input type="number" min={0} value={sForm.stoppages_due_safety} onChange={e => setSForm(f => ({ ...f, stoppages_due_safety: Number(e.target.value) }))} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Horas perdidas</Label>
              <Input type="number" min={0} step={0.5} value={sForm.lost_hours_due_safety} onChange={e => setSForm(f => ({ ...f, lost_hours_due_safety: Number(e.target.value) }))} className="h-9 text-xs" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Observações de segurança</Label>
            <Textarea value={sForm.notes} onChange={e => setSForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas sobre segurança, ocorrências..." className="text-xs min-h-[50px]" />
          </div>

          <Button size="sm" onClick={handleSaveSafety} disabled={saveSafety.isPending} className="text-xs">
            {saveSafety.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Guardar Segurança
          </Button>
        </TabsContent>
      </Tabs>

      {/* Axia Analysis */}
      <Card className="border-[#00679d]/30 bg-[#00679d]/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00679d]" />
            Análise Axia™
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            A Axia analisa os dados de qualidade e segurança e identifica riscos e recomendações.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={askAxia}
            disabled={axiaLoading}
            className="text-xs border-[#00679d]/30 text-[#00679d] hover:bg-[#00679d]/10"
          >
            {axiaLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            {axiaLoading ? 'A analisar...' : 'Pedir análise Axia™'}
          </Button>
          {axiaInsight && (
            <div className="mt-2 p-3 rounded-md bg-background border text-xs whitespace-pre-wrap leading-relaxed">
              {axiaInsight}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
