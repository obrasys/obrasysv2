import { useNavigate } from "react-router-dom";
import { CreditCard, ExternalLink, Briefcase, Users, Cloud, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard, MetricCard, MetricCardGrid } from "@/components/patterns";
import { useSubscription } from "@/hooks/useSubscription";

export default function DefinicoesFaturacao() {
  const navigate = useNavigate();
  const { subscription, isLoading } = useSubscription();
  const planName = subscription?.plan_name ?? subscription?.tier ?? "Trial";

  return (
    <div className="space-y-6">
      <SectionCard
        title="Plano atual"
        description="Acompanha o teu plano, próximos pagamentos e limites."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/planos")}>
              Ver planos
            </Button>
            <Button onClick={() => navigate("/subscricao")}>
              Gerir subscrição <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface-sunken/40 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-text-muted">Plano</p>
            <p className="text-xl font-bold text-text-strong">
              {isLoading ? "A carregar…" : planName}
            </p>
            {subscription?.current_period_end ? (
              <p className="text-xs text-text-muted">
                Próxima renovação: {new Date(subscription.current_period_end).toLocaleDateString("pt-PT")}
              </p>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Utilização" description="Consumo atual do teu plano.">
        <MetricCardGrid columns={3}>
          <MetricCard icon={Briefcase} label="Obras ativas" value="—" hint="Em breve" />
          <MetricCard icon={Users} label="Utilizadores" value="—" hint="Em breve" />
          <MetricCard icon={Cloud} label="Armazenamento" value="—" hint="Em breve" />
          <MetricCard icon={Sparkles} label="Extrações Axia" value="—" hint="Em breve" />
          <MetricCard icon={FileText} label="Documentos" value="—" hint="Em breve" />
          <MetricCard icon={ExternalLink} label="Integrações" value="—" hint="Em breve" />
        </MetricCardGrid>
      </SectionCard>

      <SectionCard
        title="Faturação da empresa"
        description="Dados fiscais usados na emissão de faturas e propostas."
        actions={
          <Button variant="outline" onClick={() => navigate("/empresa/definicoes/faturacao")}>
            Abrir dados fiscais <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        }
      >
        <p className="text-sm text-text-muted">
          Configura razão social, NIF, morada fiscal e método de pagamento.
        </p>
      </SectionCard>
    </div>
  );
}
