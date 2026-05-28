import { useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Printer, AlertTriangle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useObras } from '@/hooks/useObras';
import { useIcfBlockLibrary } from '@/hooks/useIcfBlockLibrary';
import { useIcfWallPanels } from '@/hooks/useIcfWallPanels';
import { useIcfAssistantSession } from '@/hooks/useIcfAssistantSession';
import { ICFBlockSvgViewer } from '@/components/icf/library/ICFBlockSvgViewer';
import { calculateICFWallComposition } from '@/lib/icf-homeblock-composition';

const ICF_DISCLAIMER =
  'As medições e composições ICF geradas pela Axia são estimativas assistidas para apoio à orçamentação e planeamento. Devem ser revistas e validadas por responsável técnico antes da execução. O Obra Sys não substitui projeto executivo, cálculo estrutural ou responsabilidade técnica de obra.';

const IcfManual = () => {
  const [params, setParams] = useSearchParams();
  const { obras } = useObras();
  const sessionParam = params.get('session');
  const session = useIcfAssistantSession(sessionParam ?? undefined);
  const [obraId, setObraId] = useState(params.get('obra') || '');

  useEffect(() => {
    if (sessionParam && session.data?.obra_id && !obraId) {
      setObraId(session.data.obra_id);
      const next = new URLSearchParams(params);
      next.set('obra', session.data.obra_id);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionParam, session.data?.obra_id]);

  const { data: panels } = useIcfWallPanels(obraId);
  const { data: blocks } = useIcfBlockLibrary();

  const blockByCode = useMemo(() => {
    const m = new Map<string, any>();
    (blocks ?? []).forEach(b => m.set(b.code, b));
    return m;
  }, [blocks]);

  const usedBlockCodes = useMemo(() => {
    const s = new Set<string>();
    (panels ?? []).forEach(p => p.selected_block_code && s.add(p.selected_block_code));
    return Array.from(s);
  }, [panels]);

  const handleObra = (v: string) => {
    setObraId(v);
    const next = new URLSearchParams(params);
    next.set('obra', v);
    setParams(next, { replace: true });
  };

  const sessionLocked = !!sessionParam && !!session.data?.obra_id;
  const selectedObra = obras?.find(o => o.id === obraId);

  return (
    <AppLayout title="Manual ICF" subtitle="Manual técnico dinâmico HOMEBLOCK">
      <div className="p-4 md:p-6 space-y-6 print:p-0">
        <div className="flex items-center justify-between gap-3 print:hidden">
          {sessionLocked ? (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Sessão Axia:</span>
              <span className="font-medium">{selectedObra?.nome ?? 'Obra associada'}</span>
              <Badge variant="outline" className="ml-1 text-[10px]">{session.data?.plan_kind}</Badge>
            </div>
          ) : (
            <Select value={obraId} onValueChange={handleObra}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Selecionar obra…" /></SelectTrigger>
              <SelectContent>
                {obras?.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={() => window.print()} disabled={!obraId}>
            <Printer className="h-4 w-4 mr-2" /> Preparar para PDF
          </Button>
        </div>


        {!obraId ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
            Selecione uma obra para gerar o manual.
          </CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle>Sistema construtivo HOMEBLOCK</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  O sistema HOMEBLOCK é uma solução ICF (Cofragem em Betão Isolado) composta por
                  blocos de poliestireno expandido que servem de cofragem permanente para paredes em
                  betão armado. Esta obra utiliza os seguintes componentes:
                </p>
                <ul className="list-disc pl-5">
                  {usedBlockCodes.map(c => (
                    <li key={c}>{blockByCode.get(c)?.name ?? c}</li>
                  ))}
                  {usedBlockCodes.length === 0 && <li className="italic">Nenhum componente selecionado.</li>}
                </ul>
              </CardContent>
            </Card>

            {usedBlockCodes.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Desenhos técnicos</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {usedBlockCodes.map(c => {
                      const b = blockByCode.get(c);
                      if (!b?.drawing_file) return null;
                      return (
                        <div key={c} className="space-y-2">
                          <div className="text-sm font-medium">{b.name}</div>
                          <div className="aspect-[4/3] bg-white border rounded-lg">
                            <ICFBlockSvgViewer src={b.drawing_file} alt={b.name} showZoom={false} className="w-full h-full" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Composição por pano de parede</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(panels ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sem panos registados.</p>
                ) : (
                  panels!.map(p => {
                    const block = blockByCode.get(p.selected_block_code);
                    const comp = block
                      ? calculateICFWallComposition({
                          wall_panel_id: p.id,
                          length_m: p.length_m,
                          height_m: p.height_m,
                          openings: p.openings ?? [],
                          block,
                        })
                      : null;
                    return (
                      <div key={p.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <div className="font-medium text-sm">{p.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {[p.floor, p.room].filter(Boolean).join(' · ')} - {p.length_m}m × {p.height_m}m
                            </div>
                          </div>
                          <Badge variant="outline">{p.selected_block_code}</Badge>
                        </div>
                        {comp && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <Stat label="Fiadas" v={comp.rows} />
                            <Stat label="Blocos/fiada" v={comp.blocks_per_row} />
                            <Stat label="Blocos (final)" v={comp.estimated_final_block_qty} />
                            <Stat label="Área líquida" v={`${comp.net_area_m2.toFixed(2)} m²`} />
                          </div>
                        )}
                        {comp && comp.warnings.length > 0 && (
                          <div className="text-xs text-amber-700 space-y-0.5">
                            {comp.warnings.map((w, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {w}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10">
              <CardHeader><CardTitle className="text-amber-900 dark:text-amber-200 text-base">Aviso técnico</CardTitle></CardHeader>
              <CardContent className="text-sm text-amber-900/90 dark:text-amber-200">
                {ICF_DISCLAIMER}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const Stat = ({ label, v }: { label: string; v: any }) => (
  <div className="border rounded-md py-1.5 px-2 bg-muted/30">
    <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    <div className="text-sm font-semibold">{v}</div>
  </div>
);

export default IcfManual;
