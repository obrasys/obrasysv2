import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { useIcfResumo, useIcfConfiguracao } from '@/hooks/useIcfData';
import { useGenerateIcfBudget } from '@/hooks/useIcfBudget';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { IcfAxiaContextual } from '@/components/icf/IcfAxiaContextual';
import { IcfAxiaAnalysisPanel } from '@/components/icf/IcfAxiaAnalysisPanel';
import { IcfBudgetConfigDialog, type IcfBudgetFinancials } from '@/components/icf/IcfBudgetConfigDialog';

const IcfResumo = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
  const { data: config } = useIcfConfiguracao(configId);
  const { data: r } = useIcfResumo(configId);
  const generateBudget = useGenerateIcfBudget();

  const volumeData = r ? [
    { name: 'Paredes', value: r.volume_total_paredes },
    { name: 'Fundações', value: r.volume_total_fundacoes },
    { name: 'Lajes', value: r.volume_total_lajes },
  ] : [];

  const colors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))'];

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);

  const handleOpenBudget = () => {
    if (!r || !config) return;
    setBudgetDialogOpen(true);
  };

  const handleConfirmBudget = (values: IcfBudgetFinancials) => {
    if (!r || !config) return;
    generateBudget.mutate(
      { resumo: r, config, obraId: config.obra_id, ...values },
      {
        onSuccess: (orc) => {
          setBudgetDialogOpen(false);
          navigate(`/orcamentos/${orc.id}`);
        },
      },
    );
  };

  return (
    <AppLayout title="Resumo Global ICF" subtitle={config?.nome}>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/icf')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          {r && config && (
            <Button onClick={handleOpenBudget} disabled={generateBudget.isPending}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {generateBudget.isPending ? 'A gerar...' : 'Gerar Orçamento ICF'}
            </Button>
          )}
        </div>

        {!r && <Card><CardContent className="py-12 text-center text-muted-foreground">Sem dados para resumo.</CardContent></Card>}

        {r && (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Comprimento Total Paredes</p><p className="text-xl font-bold">{r.comprimento_total_paredes?.toFixed(2)} m</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Área Líquida Paredes</p><p className="text-xl font-bold">{r.area_liquida_total?.toFixed(2)} m²</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Área Vãos Total</p><p className="text-xl font-bold">{r.area_total_vaos?.toFixed(2)} m²</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Área Estrutural Total</p><p className="text-xl font-bold">{r.area_estrutural_total?.toFixed(2)} m²</p></CardContent></Card>
            </div>

            {/* Volumes comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Volumes de Betão</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip formatter={(v: number) => `${v.toFixed(3)} m³`} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {volumeData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Quadro Comparativo</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'Paredes', vol: r.volume_total_paredes, aco: '-' },
                      { label: 'Fundações', vol: r.volume_total_fundacoes, aco: r.aco_total_fundacoes?.toFixed(1) },
                      { label: 'Lajes', vol: r.volume_total_lajes, aco: r.aco_total_lajes?.toFixed(1) },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center p-3 rounded-lg border">
                        <span className="font-medium text-sm">{item.label}</span>
                        <div className="text-right text-sm">
                          <span className="font-bold">{item.vol?.toFixed(3)} m³</span>
                          <span className="text-muted-foreground ml-3">{item.aco} kg</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <span className="font-bold text-sm">TOTAL</span>
                      <div className="text-right text-sm">
                        <span className="font-bold text-primary">{r.volume_total_obra?.toFixed(3)} m³</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Indices */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-primary/20">
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-muted-foreground">Índice m³/m²</p>
                  <p className="text-3xl font-bold text-primary">{r.indice_m3_m2?.toFixed(4)}</p>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-muted-foreground">Índice kg/m²</p>
                  <p className="text-3xl font-bold text-primary">{r.indice_kg_m2?.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Axia */}
            <IcfAxiaContextual context="resumo" config={config} resumo={r} />
            {configId && <IcfAxiaAnalysisPanel configId={configId} />}
          </>
        )}
      </div>

      <IcfBudgetConfigDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        onConfirm={handleConfirmBudget}
        isPending={generateBudget.isPending}
      />
    </AppLayout>
  );
};

export default IcfResumo;
