import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Cloud, Clipboard, Hammer, Users, AlertTriangle, ShieldCheck, TrendingUp,
  Save, Send, CheckCircle2
} from 'lucide-react';
import { useDailyReports, useDailyReportActivities, useDailyReportConstraints, useDailyReportResources, useDailyReportQualitySafety } from '@/hooks/useDailyReports';
import { useScheduleTasks } from '@/hooks/useSchedule';
import type { DailyReportFormData, DayType, WeatherImpact, WorkRegime, DAY_TYPE_LABELS, WEATHER_OPTIONS } from '@/types/daily-reports';
import { format } from 'date-fns';

interface Props {
  obraId: string;
  scheduleVersionId?: string;
}

export function DailyReportForm({ obraId, scheduleVersionId }: Props) {
  const { reports, createReport, submitReport, approveReport } = useDailyReports(obraId);
  const { tasks } = useScheduleTasks(scheduleVersionId, obraId);

  const [formData, setFormData] = useState<DailyReportFormData>({
    obra_id: obraId,
    report_date: format(new Date(), 'yyyy-MM-dd'),
    day_type: 'normal',
    weather_impact: 'none',
    work_regime: 'normal',
    planned_work_hours: 8,
  });

  const [activeTab, setActiveTab] = useState('resumo');

  const handleCreate = () => {
    createReport.mutate(formData);
  };

  // Get latest report for inline editing
  const latestDraft = reports?.find(r => r.status === 'draft');

  return (
    <div className="space-y-4">
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
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approveReport.mutate(report.id)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aprovar
                    </Button>
                  )}
                </div>
              </div>
            ))}
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
                <TabsTrigger value="atividades" className="text-xs gap-1"><Clipboard className="h-3 w-3" />Atividades</TabsTrigger>
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
                <div className="text-center py-8 text-muted-foreground">
                  <Clipboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecione atividades do cronograma para registar avanço.</p>
                  <p className="text-xs mt-1">{tasks?.length || 0} atividades disponíveis no cronograma.</p>
                </div>
              </TabsContent>

              <TabsContent value="producao" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Hammer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Registe a produção física por serviço e zona.</p>
                </div>
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
                </div>
              </TabsContent>

              <TabsContent value="qualidade" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Registe inspeções, não conformidades e segurança.</p>
                </div>
              </TabsContent>

              <TabsContent value="impacto" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">O impacto automático será calculado após aprovação da RDO.</p>
                  <p className="text-xs mt-1">Inclui recálculo de progresso, duração remanescente e caminho crítico.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
