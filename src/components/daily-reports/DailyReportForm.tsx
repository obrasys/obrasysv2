import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Cloud, Clipboard, Hammer, Users, AlertTriangle, ShieldCheck, TrendingUp,
  Save, Send, CheckCircle2, Sparkles, Loader2, GitBranch,
} from 'lucide-react';
import { useDailyReports, useDailyReportActivities, useDailyReportConstraints, useDailyReportResources, useDailyReportQualitySafety } from '@/hooks/useDailyReports';
import { useScheduleTasks } from '@/hooks/useSchedule';
import { RDOActivityEditor } from './RDOActivityEditor';
import { RDOProductionEditor } from './RDOProductionEditor';
import type { DailyReportFormData, DayType, WeatherImpact, WorkRegime } from '@/types/daily-reports';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  obraId: string;
  scheduleVersionId?: string;
}

interface ImpactSummary {
  tasks_updated: number;
  delayed_tasks: number;
  critical_delayed: number;
  project_progress: {
    planned: number;
    actual: number;
    deviation: number;
    health: string;
    probable_completion: string | null;
  } | null;
  delayed_details: Array<{
    name: string;
    delay_days: number;
    classification: string;
    is_critical: boolean;
  }>;
}

export function DailyReportForm({ obraId, scheduleVersionId }: Props) {
  const { reports, createReport, submitReport, approveReport } = useDailyReports(obraId);
  const { tasks } = useScheduleTasks(scheduleVersionId, obraId);
  const { toast } = useToast();

  const [formData, setFormData] = useState<DailyReportFormData>({
    obra_id: obraId,
    report_date: format(new Date(), 'yyyy-MM-dd'),
    day_type: 'normal',
    weather_impact: 'none',
    work_regime: 'normal',
    planned_work_hours: 8,
  });

  const [activeTab, setActiveTab] = useState('resumo');
  const [isApproving, setIsApproving] = useState(false);
  const [impactResult, setImpactResult] = useState<ImpactSummary | null>(null);

  const handleCreate = () => {
    createReport.mutate(formData);
  };

  const handleApproveWithProcessing = async (reportId: string) => {
    setIsApproving(true);
    setImpactResult(null);
    try {
      // First approve the report (this already calls process-daily-report)
      await approveReport.mutateAsync(reportId);
      
      // The processing result is returned from process-daily-report
      // Fetch the impact summary
      const { data, error } = await supabase.functions.invoke('process-daily-report', {
        body: { daily_report_id: reportId },
      });
      
      if (data?.summary) {
        setImpactResult(data.summary);
        setActiveTab('impacto');
      }
    } catch (err) {
      console.error('Approval processing error:', err);
    } finally {
      setIsApproving(false);
    }
  };

  // Get latest report for inline editing
  const latestDraft = reports?.find(r => r.status === 'draft');
  const latestSubmitted = reports?.find(r => r.status === 'submitted');

  const healthLabels: Record<string, string> = {
    on_track: '✅ No prazo',
    at_risk: '⚠️ Em risco',
    delayed: '🟠 Atrasada',
    critical: '🔴 Crítica',
  };

  return (
    <div className="space-y-4">
      {/* Schedule connection indicator */}
      {scheduleVersionId ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="h-4 w-4 text-green-600" />
          <span>Cronograma conectado — {tasks?.length || 0} tarefas disponíveis</span>
          <Badge variant="outline" className="text-[10px] text-green-700 border-green-300 bg-green-50">
            Integrado
          </Badge>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <span>Sem cronograma ativo — crie um planeamento para ativar a integração completa</span>
        </div>
      )}

      {/* Quick create */}
      {!latestDraft && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label>Data do relatório</Label>
                <Input
                  type="date"
                  value={formData.report_date}
                  onChange={e => setFormData(prev => ({ ...prev, report_date: e.target.value }))}
                />
              </div>
              <Button onClick={handleCreate} disabled={createReport.isPending}>
                <Clipboard className="h-4 w-4 mr-2" />
                {createReport.isPending ? 'A criar...' : 'Criar RDO'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report list */}
      {reports && reports.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Relatórios Diários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports.map(report => (
              <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(report.report_date), 'dd/MM/yyyy')}
                      <span className="text-muted-foreground ml-2 text-xs capitalize">{report.weekday}</span>
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {report.executive_summary || 'Sem resumo'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    report.status === 'approved' ? 'default' :
                    report.status === 'submitted' ? 'secondary' :
                    report.status === 'rejected' ? 'destructive' : 'outline'
                  }>
                    {report.status === 'draft' ? 'Rascunho' :
                     report.status === 'submitted' ? 'Submetida' :
                     report.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
                  </Badge>
                  {report.status === 'draft' && (
                    <Button size="sm" variant="outline" onClick={() => submitReport.mutate(report.id)}>
                      <Send className="h-3 w-3 mr-1" />
                      Submeter
                    </Button>
                  )}
                  {report.status === 'submitted' && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApproveWithProcessing(report.id)}
                      disabled={isApproving}
                    >
                      {isApproving ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      {isApproving ? 'A processar...' : 'Aprovar + Processar'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Impact Result after approval */}
      {impactResult && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Impacto da RDO no Cronograma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold">{impactResult.tasks_updated}</p>
                <p className="text-[10px] text-muted-foreground">Tarefas atualizadas</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${impactResult.delayed_tasks > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {impactResult.delayed_tasks}
                </p>
                <p className="text-[10px] text-muted-foreground">Atrasadas</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${impactResult.critical_delayed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {impactResult.critical_delayed}
                </p>
                <p className="text-[10px] text-muted-foreground">Críticas atrasadas</p>
              </div>
            </div>

            {impactResult.project_progress && (
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-xs font-medium mb-2">Progresso Global do Projeto</p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <p className="font-semibold">{impactResult.project_progress.planned.toFixed(1)}%</p>
                    <p className="text-muted-foreground">Previsto</p>
                  </div>
                  <div>
                    <p className="font-semibold">{impactResult.project_progress.actual.toFixed(1)}%</p>
                    <p className="text-muted-foreground">Real</p>
                  </div>
                  <div>
                    <p className={`font-semibold ${impactResult.project_progress.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {impactResult.project_progress.deviation > 0 ? '+' : ''}{impactResult.project_progress.deviation.toFixed(1)}%
                    </p>
                    <p className="text-muted-foreground">Desvio</p>
                  </div>
                  <div>
                    <p className="font-semibold">{healthLabels[impactResult.project_progress.health] || impactResult.project_progress.health}</p>
                    <p className="text-muted-foreground">Estado</p>
                  </div>
                </div>
              </div>
            )}

            {impactResult.delayed_details.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  Tarefas com atraso
                </p>
                {impactResult.delayed_details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-background rounded border">
                    <span className="truncate flex-1">{d.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="destructive" className="text-[9px]">{d.delay_days}d</Badge>
                      <Badge variant="outline" className="text-[9px]">{d.classification}</Badge>
                      {d.is_critical && <Badge className="text-[9px] bg-red-600">Crítica</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setImpactResult(null)}>
              Fechar análise de impacto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* RDO Editor tabs (for draft) */}
      {latestDraft && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Editar RDO — {format(new Date(latestDraft.report_date), 'dd/MM/yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full flex flex-wrap h-auto gap-1">
                <TabsTrigger value="resumo" className="text-xs gap-1"><Cloud className="h-3 w-3" />Resumo</TabsTrigger>
                <TabsTrigger value="atividades" className="text-xs gap-1">
                  <GitBranch className="h-3 w-3" />Atividades
                  {scheduleVersionId && <Badge variant="secondary" className="text-[9px] ml-1">{tasks?.filter(t => t.task_type === 'task').length || 0}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="producao" className="text-xs gap-1"><Hammer className="h-3 w-3" />Produção</TabsTrigger>
                <TabsTrigger value="recursos" className="text-xs gap-1"><Users className="h-3 w-3" />Recursos</TabsTrigger>
                <TabsTrigger value="restricoes" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />Restrições</TabsTrigger>
                <TabsTrigger value="qualidade" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" />Qualidade</TabsTrigger>
                <TabsTrigger value="impacto" className="text-xs gap-1"><TrendingUp className="h-3 w-3" />Impacto</TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo de dia</Label>
                    <Select defaultValue={latestDraft.day_type}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="partial">Parcial</SelectItem>
                        <SelectItem value="unproductive">Improdutivo</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Condições meteorológicas</Label>
                    <Select defaultValue={latestDraft.weather_condition || ''}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {['Limpo', 'Nublado', 'Chuva fraca', 'Chuva moderada', 'Chuva forte', 'Vento forte'].map(w => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Impacto meteorológico</Label>
                    <Select defaultValue={latestDraft.weather_impact}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="partial">Parcial</SelectItem>
                        <SelectItem value="total">Total</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Horas planeadas</Label>
                    <Input type="number" defaultValue={latestDraft.planned_work_hours} />
                  </div>
                  <div>
                    <Label>Horas reais</Label>
                    <Input type="number" defaultValue={latestDraft.actual_work_hours || ''} />
                  </div>
                </div>
                <div>
                  <Label>Resumo executivo</Label>
                  <Textarea
                    defaultValue={latestDraft.executive_summary || ''}
                    placeholder="Descreva o resumo das atividades do dia..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Ocorrências críticas</Label>
                  <Textarea
                    defaultValue={latestDraft.critical_occurrences || ''}
                    placeholder="Registe ocorrências relevantes..."
                    rows={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="atividades" className="mt-4">
                <RDOActivityEditor
                  reportId={latestDraft.id}
                  obraId={obraId}
                  scheduleVersionId={scheduleVersionId}
                />
              </TabsContent>

              <TabsContent value="producao" className="mt-4">
                <RDOProductionEditor
                  reportId={latestDraft.id}
                  obraId={obraId}
                  scheduleVersionId={scheduleVersionId}
                />
              </TabsContent>

              <TabsContent value="recursos" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Registe mão de obra, equipamentos e materiais mobilizados.</p>
                </div>
              </TabsContent>

              <TabsContent value="restricoes" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Registe impedimentos e restrições do dia.</p>
                  <p className="text-xs mt-1">Impactos são propagados automaticamente ao cronograma.</p>
                </div>
              </TabsContent>

              <TabsContent value="qualidade" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Registe inspeções, não conformidades e segurança.</p>
                </div>
              </TabsContent>

              <TabsContent value="impacto" className="mt-4">
                {impactResult ? (
                  <div className="space-y-3">
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Impacto processado com sucesso</AlertTitle>
                      <AlertDescription>
                        {impactResult.tasks_updated} tarefas atualizadas, {impactResult.delayed_tasks} com atraso detetado.
                        {impactResult.project_progress && (
                          <> Progresso global: {impactResult.project_progress.actual.toFixed(1)}% (desvio: {impactResult.project_progress.deviation > 0 ? '+' : ''}{impactResult.project_progress.deviation.toFixed(1)}%)</>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">O impacto será calculado automaticamente após aprovação da RDO.</p>
                    <p className="text-xs mt-1">Inclui recálculo de progresso, duração remanescente e caminho crítico.</p>
                    <p className="text-xs mt-2 flex items-center justify-center gap-1">
                      <Sparkles className="h-3 w-3" /> Processado pela Axia™
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
