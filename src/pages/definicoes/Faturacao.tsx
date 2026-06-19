import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, ExternalLink, Briefcase, Users, Cloud, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard, MetricCard, MetricCardGrid } from "@/components/patterns";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_LIMITS, type RuntimeTier } from "@/config/planLimits";
import seloFounder from "@/assets/selo_founder.png";

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  starter: "Starter",
  professional: "Professional",
  promotor: "Promotor",
  enterprise: "Enterprise",
  founder: "Parceiro Fundador",
};

interface Usage {
  obrasAtivas: number | null;
  utilizadores: number | null;
  documentos: number | null;
  axiaExtracoes: number | null;
  integracoes: number | null;
}

function formatLimit(used: number | null, max: number) {
  if (used === null) return "—";
  if (max === 0) return `${used}`;
  return `${used} / ${max}`;
}

export default function DefinicoesFaturacao() {
  const navigate = useNavigate();
  const { subscription, loading } = useSubscription();
  const { organization } = useAuth();
  const tier = (subscription?.subscription_tier ?? "trial") as RuntimeTier;
  const isFounder = subscription?.is_founder === true || tier === "founder";
  const limits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.trial;

  const [usage, setUsage] = useState<Usage>({
    obrasAtivas: null,
    utilizadores: null,
    documentos: null,
    axiaExtracoes: null,
    integracoes: null,
  });

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;

    (async () => {
      const orgId = organization.id;
      const sb = supabase as any;
      const [obrasRes, membersRes, docsRes, axiaRes, integRes] = await Promise.all([
        sb.from("obras")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "em_curso"),
        sb.from("organization_members")
          .select("user_id", { count: "exact", head: true })
          .eq("organization_id", orgId),
        sb.from("documentos")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId),
        sb.from("axia_usage_log")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId),
        sb.from("integrations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId),
      ]);

      if (cancelled) return;
      setUsage({
        obrasAtivas: obrasRes.error ? null : obrasRes.count ?? 0,
        utilizadores: membersRes.error ? null : membersRes.count ?? 0,
        documentos: docsRes.error ? null : docsRes.count ?? 0,
        axiaExtracoes: axiaRes.error ? null : axiaRes.count ?? 0,
        integracoes: integRes.error ? null : integRes.count ?? 0,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

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
          {isFounder ? (
            <img
              src={seloFounder}
              alt="Selo Parceiro Fundador"
              className="h-14 w-14 rounded-2xl object-cover shadow-md"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="h-6 w-6" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-text-muted">Plano</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-text-strong">
                {loading ? "A carregar…" : PLAN_LABELS[tier] ?? tier}
              </p>
              {isFounder && (
                <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                  Vitalício
                </Badge>
              )}
            </div>
            {isFounder ? (
              <p className="text-xs text-text-muted">
                Acesso vitalício a todas as funcionalidades. Obrigado por acreditar no ObraSys desde o início.
              </p>
            ) : subscription?.subscription_end ? (
              <p className="text-xs text-text-muted">
                Próxima renovação: {new Date(subscription.subscription_end).toLocaleDateString("pt-PT")}
              </p>
            ) : (
              <p className="text-xs text-text-muted">Sem renovação agendada.</p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Utilização" description="Consumo atual do teu plano.">
        <MetricCardGrid columns={3}>
          <MetricCard
            icon={Briefcase}
            label="Obras ativas"
            value={formatLimit(usage.obrasAtivas, limits.maxObrasAtivas)}
            hint={limits.maxObrasAtivas === 0 ? "Ilimitado no teu plano" : `Limite: ${limits.maxObrasAtivas}`}
          />
          <MetricCard
            icon={Users}
            label="Utilizadores"
            value={formatLimit(usage.utilizadores, limits.maxUtilizadores)}
            hint={limits.maxUtilizadores === 0 ? "Ilimitado no teu plano" : `Limite: ${limits.maxUtilizadores}`}
          />
          <MetricCard
            icon={Cloud}
            label="Armazenamento"
            value="—"
            hint="Em breve"
          />
          <MetricCard
            icon={Sparkles}
            label="Extrações Axia"
            value={usage.axiaExtracoes !== null ? String(usage.axiaExtracoes) : "—"}
            hint={usage.axiaExtracoes === null ? "Em breve" : "Total acumulado"}
          />
          <MetricCard
            icon={FileText}
            label="Documentos"
            value={usage.documentos !== null ? String(usage.documentos) : "—"}
            hint={usage.documentos === null ? "Em breve" : "Total na organização"}
          />
          <MetricCard
            icon={ExternalLink}
            label="Integrações"
            value={usage.integracoes !== null ? String(usage.integracoes) : "—"}
            hint={usage.integracoes === null ? "Em breve" : "Ativas"}
          />
        </MetricCardGrid>
      </SectionCard>

      <SectionCard
        title="Faturação da empresa"
        description="Dados fiscais usados na emissão de faturas e propostas."
        actions={
          <Button variant="outline" onClick={() => navigate("/definicoes/organizacao")}>
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
