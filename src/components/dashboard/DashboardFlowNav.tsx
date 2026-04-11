import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  FileText,
  Database,
  Calendar,
  ClipboardList,
  ClipboardCheck,
  Clock,
  Wallet,
  ArrowRight,
} from 'lucide-react';

const flows = [
  {
    title: 'Fluxo Comercial',
    description: 'Clientes, orçamentos e propostas',
    items: [
      { icon: Users, label: 'Clientes', href: '/clientes' },
      { icon: FileText, label: 'Orçamentos', href: '/orcamentos' },
      { icon: Database, label: 'Base de Preços', href: '/base-precos' },
    ],
    cta: { label: 'Abrir comercial', href: '/clientes' },
    accent: 'bg-primary/5 border-primary/10',
  },
  {
    title: 'Fluxo de Execução',
    description: 'Planeamento, diários e medições',
    items: [
      { icon: Calendar, label: 'Tarefas', href: '/tarefas' },
      { icon: ClipboardList, label: 'RDOs', href: '/rdos' },
      { icon: ClipboardCheck, label: 'Medições', href: '/autos-medicao' },
      { icon: Clock, label: 'Livro de Ponto', href: '/livro-ponto' },
    ],
    cta: { label: 'Abrir execução', href: '/obras' },
    accent: 'bg-success/5 border-success/10',
  },
  {
    title: 'Fluxo Financeiro',
    description: 'Recebimentos, pagamentos e previsões',
    items: [
      { icon: Wallet, label: 'Financeiro', href: '/financeiro' },
    ],
    cta: { label: 'Abrir financeiro', href: '/financeiro' },
    accent: 'bg-warning/5 border-warning/10',
  },
];

export function DashboardFlowNav() {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground">Navegação por Fluxo</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {flows.map((flow) => (
          <Card key={flow.title} className={`rounded-xl shadow-card border ${flow.accent}`}>
            <CardContent className="pt-5 pb-4 space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-foreground">{flow.title}</h3>
                <p className="text-xs text-muted-foreground">{flow.description}</p>
              </div>
              <div className="space-y-1">
                {flow.items.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-background/80 transition-colors text-left"
                  >
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate(flow.cta.href)}>
                {flow.cta.label} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
