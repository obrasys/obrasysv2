import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { aggregateDossierComposition, useIcfChecklist, useIcfDossierPanels, useIcfIssues } from '@/hooks/useIcfDossier';
import type { IcfProjectAnalysis } from '@/types/icf-dossier';

const DISCLAIMER =
  'As medições e composições ICF deste manual são estimativas assistidas pela Axia, geradas a partir dos elementos carregados no dossiê. Devem ser revistas e validadas por responsável técnico antes de qualquer execução. O Obra Sys não substitui projeto executivo nem responsabilidade técnica de obra.';

export function DossierManualTab({ analysis }: { analysis: IcfProjectAnalysis }) {
  const { data: panels = [] } = useIcfDossierPanels(analysis.id);
  const { data: checklist = [] } = useIcfChecklist(analysis.id);
  const { data: issues = [] } = useIcfIssues(analysis.id);
  const agg = aggregateDossierComposition(panels);

  return (
    <Card className="rounded-xl">
      <CardContent className="pt-4 space-y-6 print:p-0">
        <div className="flex items-center justify-between print:hidden">
          <p className="text-sm text-muted-foreground">Manual técnico ICF gerado dinamicamente.</p>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
        </div>

        <section>
          <h2 className="text-lg font-bold mb-2">1. Identificação</h2>
          <div className="text-sm space-y-1">
            <p><strong>Dossiê:</strong> {analysis.titulo}</p>
            {analysis.descricao && <p><strong>Descrição:</strong> {analysis.descricao}</p>}
            <p><strong>Sistema:</strong> {analysis.sistema_icf ?? 'HOMEBLOCK'} · núcleo {analysis.espessura_nucleo_mm ?? 150} mm</p>
            <p><strong>Estado:</strong> {analysis.status}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">2. Quantitativos agregados</h2>
          <ul className="text-sm space-y-1">
            <li>Panos analisados: <strong>{agg.panelsTotal}</strong> ({agg.panelsValidated} validados)</li>
            <li>Área bruta total: <strong>{agg.grossAreaM2.toFixed(2)} m²</strong></li>
            <li>Área líquida total: <strong>{agg.netAreaM2.toFixed(2)} m²</strong></li>
          </ul>
        </section>

        {agg.blocks.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-2">3. Composição HOMEBLOCK</h2>
            <table className="w-full text-sm border rounded">
              <thead className="bg-muted/40">
                <tr><th className="text-left p-2">Código</th><th className="text-right p-2">Quantidade</th></tr>
              </thead>
              <tbody>
                {agg.blocks.map(b => (
                  <tr key={b.code} className="border-t">
                    <td className="p-2 font-mono text-xs">{b.code}</td>
                    <td className="p-2 text-right">{Math.ceil(b.qty)} un</td>
                  </tr>
                ))}
                {agg.accessories.map(a => (
                  <tr key={a.code} className="border-t">
                    <td className="p-2">{a.name} <span className="text-xs text-muted-foreground">({a.code})</span></td>
                    <td className="p-2 text-right">{Math.ceil(a.qty)} {a.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold mb-2">4. Checklist documental</h2>
          <ul className="text-sm space-y-1">
            {checklist.map(c => (
              <li key={c.id}>
                {c.status === 'present' ? '✓' : c.status === 'missing' ? '✗' : '○'} {c.item_label}
                {c.required && <span className="text-xs text-muted-foreground"> (obrigatório)</span>}
              </li>
            ))}
          </ul>
        </section>

        {issues.filter(i => i.status === 'open').length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-2">5. Pendências em aberto</h2>
            <ul className="text-sm space-y-1">
              {issues.filter(i => i.status === 'open').map(i => (
                <li key={i.id}>• <strong>{i.title}</strong>{i.message && <> — {i.message}</>}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="border-t pt-4">
          <p className="text-xs text-muted-foreground italic">{DISCLAIMER}</p>
        </section>
      </CardContent>
    </Card>
  );
}
