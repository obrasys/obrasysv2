import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { aggregateDossierComposition, useIcfDossierPanels } from '@/hooks/useIcfDossier';

export function DossierComposicaoTab({ analysisId }: { analysisId: string }) {
  const { data: panels = [] } = useIcfDossierPanels(analysisId);
  const agg = aggregateDossierComposition(panels);

  if (panels.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Adicione panos na aba "Panos" para gerar a composição agregada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Panos</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{agg.panelsTotal}</p>
            <p className="text-xs text-muted-foreground">{agg.panelsValidated} validados</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Área bruta</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{agg.grossAreaM2.toFixed(2)} m²</p></CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Área líquida</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{agg.netAreaM2.toFixed(2)} m²</p></CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avisos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{agg.warnings.length}</p></CardContent>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader><CardTitle className="text-base">Blocos HOMEBLOCK</CardTitle></CardHeader>
        <CardContent>
          {agg.blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem blocos calculados — verifique composição dos panos.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="text-left py-2">Código</th><th className="text-right py-2">Quantidade</th></tr>
              </thead>
              <tbody>
                {agg.blocks.map(b => (
                  <tr key={b.code} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{b.code}</td>
                    <td className="py-2 text-right font-medium">{Math.ceil(b.qty)} un</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {agg.accessories.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader><CardTitle className="text-base">Acessórios</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {agg.accessories.map(a => (
                  <tr key={a.code} className="border-b last:border-0">
                    <td className="py-2"><span className="font-mono text-xs text-muted-foreground mr-2">{a.code}</span>{a.name}</td>
                    <td className="py-2 text-right font-medium">{Math.ceil(a.qty)} {a.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {agg.warnings.length > 0 && (
        <Card className="rounded-xl border-amber-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Avisos da composição
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {agg.warnings.map((w, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {w}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground italic">
        <Badge variant="outline" className="mr-2">Axia</Badge>
        Estimativa assistida — deve ser validada por responsável técnico antes do envio para orçamento.
      </p>
    </div>
  );
}
