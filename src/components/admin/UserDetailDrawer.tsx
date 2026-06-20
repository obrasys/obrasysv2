import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Mail, Phone, Building2, Calendar, Clock, Crown, FileText, Wallet,
  ClipboardCheck, Users, CalendarDays, AlertOctagon, MapPin, Globe, Shield,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface Props {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDrawer({ userId, open, onOpenChange }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-detail-v3", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.functions.invoke("admin-get-user-detail", {
        body: { userId },
      });
      if (error) throw error;
      return data;
    },
  });

  const p = data?.profile;
  const s = data?.subscriber;
  const e = data?.engagement;

  const initials = (p?.nome || "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Perfil do Utilizador</SheetTitle>
          <SheetDescription>Visão 360º da atividade e dados</SheetDescription>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !p ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Utilizador não encontrado</p>
        ) : (
          <div className="space-y-5 mt-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold truncate">{p.nome || "—"}</h3>
                <p className="text-sm text-muted-foreground truncate">{p.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{p.role || "user"}</Badge>
                  {s?.subscribed ? (
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                      <Crown className="h-3 w-3 mr-1" />{s.subscription_tier || "Pago"}
                    </Badge>
                  ) : p.trial_end && new Date(p.trial_end) > new Date() ? (
                    <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30">
                      Trial · termina {format(new Date(p.trial_end), "dd/MM", { locale: pt })}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">Trial expirado</Badge>
                  )}
                  {data.mfa?.enabled && (
                    <Badge variant="outline" className="text-[10px]">
                      <Shield className="h-3 w-3 mr-1" />MFA
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact info */}
            <Card>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <InfoRow icon={Mail} label="Email" value={p.email} />
                <InfoRow icon={Phone} label="Telefone" value={p.telefone || "—"} />
                <InfoRow icon={Building2} label="Empresa" value={p.empresa_nome || p.empresa || "—"} />
                <InfoRow icon={FileText} label="NIF" value={p.empresa_nif || p.nif || "—"} />
                <InfoRow icon={MapPin} label="Cidade" value={p.empresa_cidade || "—"} />
                <InfoRow icon={Globe} label="País" value={p.empresa_pais || "—"} />
                <InfoRow icon={Calendar} label="Registo"
                  value={p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy", { locale: pt }) : "—"} />
                <InfoRow icon={Clock} label="Último login"
                  value={e?.last_login_date ? formatDistanceToNow(new Date(e.last_login_date), { addSuffix: true, locale: pt }) : "—"} />
              </CardContent>
            </Card>

            {/* Activity counters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atividade</p>
                {data.orgInfo && (
                  <p className="text-[10px] text-muted-foreground">
                    {data.orgInfo.name} · {data.orgInfo.memberCount} {data.orgInfo.memberCount === 1 ? "membro" : "membros"}
                    {data.orgInfo.role ? ` · ${data.orgInfo.role}` : ""}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <Stat icon={Building2} label="Obras" value={data.counts?.obras ?? 0} />
                <Stat icon={FileText} label="Orçamentos" value={data.counts?.orcamentos ?? 0} />
                <Stat icon={CalendarDays} label="RDOs" value={data.counts?.rdos ?? 0} />
                <Stat icon={Wallet} label="Contas" value={data.counts?.contas ?? 0} />
                <Stat icon={ClipboardCheck} label="Medições" value={data.counts?.autos ?? 0} />
                <Stat icon={Users} label="Alocações" value={data.counts?.alocacoes ?? 0} />
              </div>
            </div>



            {/* Subscription details */}
            {s && (
              <Card>
                <CardContent className="p-4 space-y-2 text-xs">
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    <Crown className="h-4 w-4 text-primary" />Subscrição
                  </p>
                  <Separator />
                  <InfoRow label="Status" value={s.subscription_status || "—"} />
                  <InfoRow label="Tier" value={s.subscription_tier || "—"} />
                  <InfoRow label="Stripe Customer" value={s.stripe_customer_id || "—"} />
                  <InfoRow label="Renovação"
                    value={s.subscription_end ? format(new Date(s.subscription_end), "dd/MM/yyyy", { locale: pt }) : "—"} />
                </CardContent>
              </Card>
            )}

            {/* Recent obras */}
            {data.obras.length > 0 && (
              <ListSection title="Obras recentes" items={data.obras.map((o: any) => ({
                primary: o.nome,
                secondary: `${o.status || ""} · ${format(new Date(o.created_at), "dd/MM/yyyy")}`,
              }))} />
            )}

            {/* Recent orcamentos */}
            {data.orcamentos.length > 0 && (
              <ListSection title="Orçamentos recentes" items={data.orcamentos.map((o: any) => ({
                primary: o.titulo,
                secondary: `${o.status || ""} · €${Number(o.valor_total || 0).toLocaleString("pt-PT")}`,
              }))} />
            )}

            {/* Tickets */}
            {data.tickets.length > 0 && (
              <ListSection title="Tickets de suporte" items={data.tickets.map((t: any) => ({
                primary: t.titulo,
                secondary: `${t.status} · ${t.prioridade} · ${formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: pt })}`,
              }))} />
            )}

            {/* Devices */}
            {data.devices.length > 0 && (
              <ListSection title="Dispositivos confiáveis" items={data.devices.map((d: any) => ({
                primary: d.device_label || "Dispositivo",
                secondary: d.last_used_at
                  ? `Último uso ${formatDistanceToNow(new Date(d.last_used_at), { addSuffix: true, locale: pt })}`
                  : "—",
              }))} />
            )}

            {!data.tickets.length && !data.devices.length && (
              <p className="text-[11px] text-muted-foreground text-center py-2">
                <AlertOctagon className="h-3 w-3 inline mr-1" />
                Sem tickets ou dispositivos registados
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="text-center p-2 bg-muted/50 rounded-lg">
      <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
      <p className="text-base font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: { primary: string; secondary: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40">
            <p className="text-xs font-medium truncate">{item.primary}</p>
            <p className="text-[10px] text-muted-foreground truncate">{item.secondary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
