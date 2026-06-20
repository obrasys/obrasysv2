import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Euro, TrendingUp, UserPlus, Repeat, AlertOctagon, Activity, Crown, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, subDays, startOfDay, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { useMemo } from "react";
import { PLANS, type PlanKey } from "@/config/plans";

const PLAN_COLORS: Record<string, string> = {
  starter: "#0F4C5C",
  professional: "#2563eb",
  promotor: "#9333ea",
  trial: "#f59e0b",
  expired: "#ef4444",
};

function KPI({ icon: Icon, label, value, hint, tone = "default" }: {
  icon: any; label: string; value: string | number; hint?: string;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const toneCls: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/15 text-emerald-700",
    warn: "bg-amber-500/15 text-amber-700",
    danger: "bg-destructive/15 text-destructive",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1 truncate">{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${toneCls[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminBusinessMetrics() {
  const { data: profiles } = useQuery({
    queryKey: ["admin-bm-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, created_at, trial_start, trial_end, trial_expired, empresa_pais");
      if (error) throw error;
      return data;
    },
  });

  const { data: subscribers } = useQuery({
    queryKey: ["admin-bm-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscribers")
        .select("user_id, subscribed, subscription_tier, subscription_status, subscription_end, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: engagement } = useQuery({
    queryKey: ["admin-bm-engagement"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_engagement_status")
        .select("user_id, last_login_date, last_action_date");
      if (error) throw error;
      return data;
    },
  });

  const metrics = useMemo(() => {
    const now = new Date();
    const total = profiles?.length || 0;

    const active = (subscribers || []).filter((s) => s.subscribed);
    const tierToKey = (t: string | null): PlanKey | null => {
      if (!t) return null;
      const k = t.toLowerCase() as PlanKey;
      return PLANS[k] ? k : null;
    };

    let mrr = 0;
    const planCounts: Record<string, number> = { starter: 0, professional: 0, promotor: 0 };
    active.forEach((s) => {
      const k = tierToKey(s.subscription_tier);
      if (k) {
        mrr += PLANS[k].price;
        planCounts[k] = (planCounts[k] || 0) + 1;
      }
    });

    const paying = active.length;
    const churned = (subscribers || []).filter(
      (s) => s.subscription_status === "canceled" || s.subscription_status === "past_due"
    ).length;

    const trialActive = (profiles || []).filter(
      (p) => p.trial_end && new Date(p.trial_end) > now && !active.find((s) => s.user_id === p.user_id)
    ).length;
    const trialExpired = (profiles || []).filter(
      (p) => p.trial_expired || (p.trial_end && new Date(p.trial_end) < now)
    ).length;

    const totalTrialsEver = trialActive + trialExpired + paying;
    const conversion = totalTrialsEver > 0 ? (paying / totalTrialsEver) * 100 : 0;

    const last7 = (profiles || []).filter((p) => differenceInDays(now, new Date(p.created_at)) <= 7).length;
    const last30 = (profiles || []).filter((p) => differenceInDays(now, new Date(p.created_at)) <= 30).length;

    const eng = engagement || [];
    const dau = eng.filter((e) => e.last_action_date && differenceInDays(now, new Date(e.last_action_date)) <= 1).length;
    const wau = eng.filter((e) => e.last_action_date && differenceInDays(now, new Date(e.last_action_date)) <= 7).length;
    const mau = eng.filter((e) => e.last_action_date && differenceInDays(now, new Date(e.last_action_date)) <= 30).length;

    // Signups per day (last 30 days)
    const daily: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(now, i), "dd/MM");
      daily[d] = 0;
    }
    (profiles || []).forEach((p) => {
      const d = startOfDay(new Date(p.created_at));
      if (differenceInDays(now, d) <= 29) {
        const k = format(d, "dd/MM");
        if (k in daily) daily[k]++;
      }
    });
    const signupSeries = Object.entries(daily).map(([date, count]) => ({ date, signups: count }));

    // Country distribution
    const byCountry: Record<string, number> = {};
    (profiles || []).forEach((p) => {
      const c = (p.empresa_pais || "—").trim() || "—";
      byCountry[c] = (byCountry[c] || 0) + 1;
    });
    const countrySeries = Object.entries(byCountry)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const planPie = [
      { name: "Starter", value: planCounts.starter, key: "starter" },
      { name: "Professional", value: planCounts.professional, key: "professional" },
      { name: "Promotor", value: planCounts.promotor, key: "promotor" },
      { name: "Trial", value: trialActive, key: "trial" },
      { name: "Expirados", value: trialExpired, key: "expired" },
    ].filter((p) => p.value > 0);

    return {
      total, mrr, arr: mrr * 12, paying, churned, trialActive, trialExpired,
      conversion, last7, last30, dau, wau, mau, signupSeries, countrySeries, planPie,
    };
  }, [profiles, subscribers, engagement]);

  const fmtEur = (n: number) =>
    n >= 1000 ? `€${(n / 1000).toFixed(1)}k` : `€${n.toFixed(0)}`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Métricas de Negócio
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI icon={Euro} label="MRR" value={fmtEur(metrics.mrr)} hint={`ARR ${fmtEur(metrics.arr)}`} tone="success" />
          <KPI icon={Crown} label="Pagantes" value={metrics.paying} hint={`${metrics.churned} churned`} />
          <KPI icon={Repeat} label="Conversão Trial→Pago" value={`${metrics.conversion.toFixed(1)}%`}
               hint={`${metrics.trialActive} trials ativos`} tone={metrics.conversion >= 10 ? "success" : "warn"} />
          <KPI icon={UserPlus} label="Novos (30d)" value={metrics.last30} hint={`${metrics.last7} nos últimos 7d`} />
          <KPI icon={Activity} label="DAU" value={metrics.dau} hint="Ativos hoje" />
          <KPI icon={TrendingUp} label="WAU" value={metrics.wau} hint="Ativos 7d" />
          <KPI icon={Sparkles} label="MAU" value={metrics.mau} hint="Ativos 30d" />
          <KPI icon={AlertOctagon} label="Trials Expirados" value={metrics.trialExpired}
               hint="Oportunidade win-back" tone={metrics.trialExpired > 0 ? "danger" : "default"} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Novos Signups (últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={metrics.signupSeries}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="url(#signupGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.planPie.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={metrics.planPie} dataKey="value" nameKey="name" cx="50%" cy="50%"
                       innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {metrics.planPie.map((entry) => (
                      <Cell key={entry.key} fill={PLAN_COLORS[entry.key] || "#999"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {metrics.countrySeries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Países</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {metrics.countrySeries.map((c) => (
                <Badge key={c.name} variant="secondary" className="text-xs">
                  {c.name} · <span className="font-bold ml-1">{c.value}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
