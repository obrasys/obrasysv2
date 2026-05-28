import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2, FileText, ClipboardCheck, Wallet, Users, CalendarDays,
  Search, MapPin, CheckCircle, XCircle, Minus, ArrowUpDown,
} from "lucide-react";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useState, useMemo } from "react";

interface UserRow {
  user_id: string;
  nome: string;
  email: string;
  role: string;
  created_at: string;
  empresa_nome: string | null;
  avatar_url: string | null;
  has_created_project: boolean;
  has_created_budget: boolean;
  total_records_created: number;
  last_login_date: string | null;
  last_action_date: string | null;
  obras_count: number;
  orcamentos_count: number;
  rdos_count: number;
  contas_count: number;
  autos_count: number;
  membros_count: number;
}

const MODULE_COLS = [
  { key: "obras_count", label: "Obras", icon: Building2, color: "text-blue-600" },
  { key: "orcamentos_count", label: "Orçamentos", icon: FileText, color: "text-purple-600" },
  { key: "rdos_count", label: "RDOs", icon: CalendarDays, color: "text-teal-600" },
  { key: "contas_count", label: "Financeiro", icon: Wallet, color: "text-amber-600" },
  { key: "autos_count", label: "Medições", icon: ClipboardCheck, color: "text-green-600" },
  { key: "membros_count", label: "Equipa", icon: Users, color: "text-rose-600" },
] as const;

function getEngagementLevel(user: UserRow): { label: string; cls: string; score: number } {
  const now = new Date();
  const lastAction = user.last_action_date ? new Date(user.last_action_date) : null;
  const daysSinceAction = lastAction ? differenceInDays(now, lastAction) : 999;

  if (user.total_records_created >= 10 && daysSinceAction <= 7)
    return { label: "Power User", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", score: 4 };
  if (user.total_records_created >= 3 && daysSinceAction <= 14)
    return { label: "Ativo", cls: "bg-blue-500/15 text-blue-700 border-blue-500/30", score: 3 };
  if (user.has_created_project && daysSinceAction <= 30)
    return { label: "Explorador", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30", score: 2 };
  if (daysSinceAction <= 30)
    return { label: "Novo", cls: "bg-sky-500/15 text-sky-700 border-sky-500/30", score: 1 };
  return { label: "Inativo", cls: "bg-destructive/15 text-destructive border-destructive/30", score: 0 };
}

function ModuleCell({ count }: { count: number }) {
  if (count === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />;
  return (
    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-primary/10 text-xs font-semibold text-primary">
      {count}
    </span>
  );
}

export function UserUsageMap() {
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("last_action");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-user-usage-map"],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: e1 } = await supabase
        .from("profiles")
        .select("user_id, nome, email, role, created_at, empresa_nome, avatar_url");
      if (e1) throw e1;

      // Fetch engagement
      const { data: engagement, error: e2 } = await supabase
        .from("user_engagement_status")
        .select("user_id, has_created_project, has_created_budget, total_records_created, last_login_date, last_action_date");
      if (e2) throw e2;

      // Fetch counts per module per user
      const [obras, orcamentos, rdos, contas, autos, membros] = await Promise.all([
        supabase.from("obras").select("user_id"),
        supabase.from("orcamentos").select("user_id"),
        supabase.from("relatorios_diarios").select("user_id"),
        supabase.from("contas_financeiras").select("user_id"),
        supabase.from("autos_medicao").select("user_id"),
        supabase.from("equipa_membros").select("user_id"),
      ]);

      const countBy = (data: any[] | null, uid: string) =>
        data?.filter((r) => r.user_id === uid).length || 0;

      return (profiles || []).map((p) => {
        const eng = engagement?.find((e) => e.user_id === p.user_id);
        return {
          ...p,
          has_created_project: eng?.has_created_project || false,
          has_created_budget: eng?.has_created_budget || false,
          total_records_created: eng?.total_records_created || 0,
          last_login_date: eng?.last_login_date || null,
          last_action_date: eng?.last_action_date || null,
          obras_count: countBy(obras.data, p.user_id),
          orcamentos_count: countBy(orcamentos.data, p.user_id),
          rdos_count: countBy(rdos.data, p.user_id),
          contas_count: countBy(contas.data, p.user_id),
          autos_count: countBy(autos.data, p.user_id),
          membros_count: countBy(membros.data, p.user_id),
        } as UserRow;
      });
    },
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    let result = users;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.nome?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.empresa_nome?.toLowerCase().includes(q)
      );
    }

    if (filterLevel !== "all") {
      result = result.filter((u) => getEngagementLevel(u).label === filterLevel);
    }

    result = [...result].sort((a, b) => {
      if (sortBy === "last_action") {
        const da = a.last_action_date ? new Date(a.last_action_date).getTime() : 0;
        const db = b.last_action_date ? new Date(b.last_action_date).getTime() : 0;
        return db - da;
      }
      if (sortBy === "records") return b.total_records_created - a.total_records_created;
      if (sortBy === "engagement") return getEngagementLevel(b).score - getEngagementLevel(a).score;
      if (sortBy === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

    return result;
  }, [users, search, filterLevel, sortBy]);

  // Summary counts
  const summary = useMemo(() => {
    if (!users) return { power: 0, active: 0, explorer: 0, new_: 0, inactive: 0 };
    const counts = { power: 0, active: 0, explorer: 0, new_: 0, inactive: 0 };
    users.forEach((u) => {
      const level = getEngagementLevel(u).label;
      if (level === "Power User") counts.power++;
      else if (level === "Ativo") counts.active++;
      else if (level === "Explorador") counts.explorer++;
      else if (level === "Novo") counts.new_++;
      else counts.inactive++;
    });
    return counts;
  }, [users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Power Users", count: summary.power, cls: "bg-emerald-500/15 text-emerald-700" },
          { label: "Ativos", count: summary.active, cls: "bg-blue-500/15 text-blue-700" },
          { label: "Exploradores", count: summary.explorer, cls: "bg-amber-500/15 text-amber-700" },
          { label: "Novos", count: summary.new_, cls: "bg-sky-500/15 text-sky-700" },
          { label: "Inativos", count: summary.inactive, cls: "bg-destructive/15 text-destructive" },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setFilterLevel(filterLevel === s.label.replace("s", "").replace("Exploradore", "Explorador").replace("Ativo", "Ativo").replace("Novo", "Novo") ? "all" : 
              s.label === "Power Users" ? "Power User" : 
              s.label === "Ativos" ? "Ativo" : 
              s.label === "Exploradores" ? "Explorador" : 
              s.label === "Novos" ? "Novo" : "Inativo"
            )}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${s.cls} ${
              filterLevel !== "all" && filterLevel !== (s.label === "Power Users" ? "Power User" : s.label === "Ativos" ? "Ativo" : s.label === "Exploradores" ? "Explorador" : s.label === "Novos" ? "Novo" : "Inativo")
                ? "opacity-40"
                : ""
            }`}
          >
            <span className="font-bold">{s.count}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, email ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] h-9">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_action">Última Ação</SelectItem>
            <SelectItem value="records">Total Registos</SelectItem>
            <SelectItem value="engagement">Nível Engagement</SelectItem>
            <SelectItem value="created">Data Registo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Utilizador</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  {MODULE_COLS.map((col) => (
                    <TableHead key={col.key} className="text-center px-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-center">
                              <col.icon className={`h-3.5 w-3.5 ${col.color}`} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p className="text-xs">{col.label}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center min-w-[100px]">Última Ação</TableHead>
                  <TableHead className="text-center min-w-[100px]">Último Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const level = getEngagementLevel(user);
                  const initials = (user.nome || "?")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <TableRow key={user.user_id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{user.nome || "-"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                            {user.empresa_nome && (
                              <p className="text-[10px] text-muted-foreground/70 truncate">{user.empresa_nome}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-[10px] ${level.cls}`}>
                          {level.label}
                        </Badge>
                      </TableCell>
                      {MODULE_COLS.map((col) => (
                        <TableCell key={col.key} className="text-center px-2">
                          <ModuleCell count={(user as any)[col.key]} />
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <span className="font-mono font-semibold text-sm">{user.total_records_created}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.last_action_date ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(user.last_action_date), { addSuffix: true, locale: pt })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{format(new Date(user.last_action_date), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.last_login_date ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(user.last_login_date), { addSuffix: true, locale: pt })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{format(new Date(user.last_login_date), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                      Nenhum utilizador encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-right">
        {filtered.length} de {users?.length || 0} utilizadores
      </p>
    </div>
  );
}
