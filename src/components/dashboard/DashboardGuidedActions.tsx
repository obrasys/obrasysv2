import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import {
  Sparkles,
  FileUp,
  Map,
  FileText,
  TrendingUp,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react';

interface ActionItem {
  key: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  to: string;
  accent: string;
  iconBg: string;
  iconColor: string;
}

const ACTIONS: ActionItem[] = [
  {
    key: 'criar-orcamento',
    title: 'Criar orçamento',
    description: 'Inicie um novo orçamento com Axia',
    icon: Sparkles,
    to: '/orcamentos/inteligente',
    accent: 'hover:border-primary/40',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    key: 'importar-documentos',
    title: 'Importar documentos',
    description: 'PDF, Excel ou caderno de encargos',
    icon: FileUp,
    to: '/orcamentos/inteligente?step=importar',
    accent: 'hover:border-blue-400/40',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
  },
  {
    key: 'analisar-planta',
    title: 'Analisar planta',
    description: 'Medição automática a partir de plantas',
    icon: Map,
    to: '/plantas',
    accent: 'hover:border-emerald-400/40',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
  },
  {
    key: 'gerar-proposta',
    title: 'Gerar proposta',
    description: 'Proposta comercial em PDF versionada',
    icon: FileText,
    to: '/orcamentos',
    accent: 'hover:border-violet-400/40',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600',
  },
  {
    key: 'acompanhar-margem',
    title: 'Acompanhar margem',
    description: 'Balanço financeiro consolidado',
    icon: TrendingUp,
    to: '/financeiro',
    accent: 'hover:border-amber-400/40',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
  },
  {
    key: 'rever-documentos',
    title: 'Rever documentos',
    description: 'Pendências e validações Axia',
    icon: ClipboardCheck,
    to: '/orcamentos?filter=em_revisao',
    accent: 'hover:border-cyan-400/40',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-600',
  },
  {
    key: 'auditar-orcamento',
    title: 'Auditar orçamento',
    description: 'Verificação automática com Axia',
    icon: ShieldCheck,
    to: '/orcamentos',
    accent: 'hover:border-rose-400/40',
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-600',
  },
];

export const DashboardGuidedActions = () => {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="guided-actions-title" className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 id="guided-actions-title" className="text-base font-semibold tracking-tight">
            O que pretende fazer hoje?
          </h2>
          <p className="text-xs text-muted-foreground">
            Ações guiadas pela Axia para acelerar o seu fluxo de trabalho.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.key}
              role="button"
              tabIndex={0}
              onClick={() => navigate(action.to)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(action.to);
                }
              }}
              className={`group cursor-pointer rounded-xl border bg-card p-3 transition-all hover:shadow-md hover:-translate-y-0.5 ${action.accent}`}
            >
              <div className={`w-9 h-9 rounded-lg ${action.iconBg} flex items-center justify-center mb-2 transition-transform group-hover:scale-110`}>
                <Icon className={`w-4 h-4 ${action.iconColor}`} />
              </div>
              <h3 className="text-xs font-semibold leading-tight mb-0.5">{action.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                {action.description}
              </p>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default DashboardGuidedActions;
