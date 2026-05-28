import { useNavigate } from 'react-router-dom';
import {
  FileText,
  BookOpen,
  ClipboardList,
  ShoppingCart,
  Handshake,
  FileSignature,
  Receipt,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ControloCustosPanel } from './ControloCustosPanel';

interface Props {
  obraId: string;
}

interface DossierLink {
  key: string;
  label: string;
  desc: string;
  icon: typeof FileText;
  to?: string;
  external?: boolean;
}

export function ObraDossierTab({ obraId }: Props) {
  const navigate = useNavigate();

  const sections: { group: string; items: DossierLink[] }[] = [
    {
      group: 'Pré-obra',
      items: [
        { key: 'orcamento', label: 'Orçamento Base', desc: 'Capítulos e artigos adjudicados', icon: FileText, to: `/orcamentos?obra=${obraId}` },
        { key: 'cadernos', label: 'Caderno de Encargos', desc: 'Documentos técnicos e validação', icon: BookOpen, to: `/obras/${obraId}/cadernos` },
        { key: 'ff', label: 'Folha de Fecho', desc: 'Custos previstos consolidados', icon: ClipboardList, to: `/folha-fecho?obra=${obraId}` },
      ],
    },
    {
      group: 'Contratação',
      items: [
        { key: 'mce', label: 'Consultas / MCE', desc: 'Mapa comparativo de fornecedores', icon: ShoppingCart, to: `/financeiro/fornecedores?obra=${obraId}` },
        { key: 'adj', label: 'Adjudicações / NE', desc: 'Notas de encomenda e contratos', icon: Handshake, to: `/financeiro?obra=${obraId}` },
        { key: 'contratos', label: 'Contratos', desc: 'Empreitada e subempreitadas', icon: FileSignature, to: `/obras/${obraId}/financeiro` },
      ],
    },
    {
      group: 'Execução',
      items: [
        { key: 'autos', label: 'Autos de Medição', desc: 'Faturação progressiva', icon: Receipt, to: `/autos-medicao?obra=${obraId}` },
        { key: 'faturas', label: 'Faturas', desc: 'Emitidas e recebidas', icon: Wallet, to: `/financeiro?obra=${obraId}` },
        { key: 'recebimentos', label: 'Recebimentos', desc: 'Plano faseado por fração', icon: TrendingUp, to: `/obras/${obraId}/financeiro` },
      ],
    },
    {
      group: 'Fecho',
      items: [
        { key: 'rececao', label: 'Receção Provisória', desc: 'Vistoria e aceitação', icon: CheckCircle2 },
        { key: 'garantias', label: 'Garantias', desc: 'Retenções 5% e prazos', icon: ShieldCheck },
        { key: 'spv', label: 'SPV', desc: 'Serviço pós-venda e ocorrências', icon: Briefcase },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Dossier do Promotor
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Vista agregadora do ciclo completo da obra - desde estudo de viabilidade ao serviço pós-venda.
          </p>
        </CardHeader>
      </Card>

      <ControloCustosPanel obraId={obraId} />

      {sections.map((s) => (
        <Card key={s.group} className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {s.group}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {s.items.map((it) => {
              const Icon = it.icon;
              const disabled = !it.to;
              return (
                <button
                  key={it.key}
                  onClick={() => it.to && navigate(it.to)}
                  disabled={disabled}
                  className="text-left rounded-lg border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{it.label}</p>
                      <p className="text-xs text-muted-foreground">{it.desc}</p>
                      {disabled && (
                        <p className="text-[10px] mt-1 text-muted-foreground italic">Em breve</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
