import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Download, Edit2, Check, X, KeyRound, CalendarPlus, Loader2, UserPlus } from "lucide-react";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type UserRole = "admin" | "gestor" | "fiscal" | "cliente" | "financeiro" | "sales";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "gestor", label: "Gestor" },
  { value: "fiscal", label: "Fiscal" },
  { value: "cliente", label: "Cliente" },
  { value: "financeiro", label: "Financeiro" },
  { value: "sales", label: "Sales" },
];

export default function AdminUtilizadores() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [trialFilter, setTrialFilter] = useState<string>("all");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "password_reset" | "renew_trial";
    userId: string;
    email: string;
    nome: string;
  } | null>(null);

  const { data: profiles, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      toast.success("Role atualizado com sucesso");
      setEditingUserId(null);
      setEditingRole(null);
    },
    onError: (error) => toast.error("Erro ao atualizar role: " + error.message),
  });

  const adminActionMutation = useMutation({
    mutationFn: async (params: { action: string; userId?: string; email?: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Ação executada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
      setConfirmAction(null);
    },
  });

  const isTrialExpiredByDate = (profile: any) => {
    if (!profile.trial_end) return false;
    return new Date(profile.trial_end) < new Date();
  };

  const filteredProfiles = profiles?.filter((profile) => {
    const matchesSearch =
      profile.nome?.toLowerCase().includes(search.toLowerCase()) ||
      profile.email?.toLowerCase().includes(search.toLowerCase()) ||
      profile.empresa?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || profile.role === roleFilter;
    const expired = isTrialExpiredByDate(profile);
    const matchesTrial = trialFilter === "all" ||
      (trialFilter === "active" && !expired) ||
      (trialFilter === "expired" && expired);
    return matchesSearch && matchesRole && matchesTrial;
  });

  const handleExportCSV = () => {
    if (!filteredProfiles) return;
    const headers = ["Nome", "Email", "Empresa", "Role", "Trial Expirado", "Data Registo"];
    const rows = filteredProfiles.map(p => [
      p.nome || "", p.email || "", p.empresa || "", p.role,
      p.trial_expired ? "Sim" : "Não",
      p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy", { locale: pt }) : ""
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `utilizadores_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    toast.success("Ficheiro CSV exportado");
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "password_reset") {
      adminActionMutation.mutate({ action: "send_password_reset", email: confirmAction.email });
    } else {
      adminActionMutation.mutate({ action: "renew_trial", userId: confirmAction.userId });
    }
  };

  return (
    <AdminLayout
      title="Gestão de Utilizadores"
      subtitle={`${filteredProfiles?.length || 0} utilizadores encontrados`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button size="sm" onClick={() => setShowAddUser(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os roles</SelectItem>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={trialFilter} onValueChange={setTrialFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Trial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Trial ativo</SelectItem>
              <SelectItem value="expired">Trial expirado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="shrink-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Trial</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Registo</TableHead>
                      <TableHead className="w-[130px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles?.map((profile) => {
                      const expired = isTrialExpiredByDate(profile);
                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary uppercase shrink-0">
                                {(profile.nome || profile.email || "?").charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{profile.nome || "—"}</p>
                                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                                {profile.empresa && (
                                  <p className="text-[11px] text-muted-foreground/70 truncate">{profile.empresa}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {editingUserId === profile.id ? (
                              <Select value={editingRole || profile.role} onValueChange={(v) => setEditingRole(v as UserRole)}>
                                <SelectTrigger className="w-[110px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_OPTIONS.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="capitalize text-xs">{profile.role}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={expired ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {expired ? "Expirado" : "Ativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {profile.trial_end
                              ? format(new Date(profile.trial_end), "dd/MM/yy", { locale: pt })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {profile.created_at
                              ? format(new Date(profile.created_at), "dd/MM/yy", { locale: pt })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {editingUserId === profile.id ? (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                    if (editingRole) updateRoleMutation.mutate({ userId: profile.id, role: editingRole });
                                  }}>
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                    setEditingUserId(null);
                                    setEditingRole(null);
                                  }}>
                                    <X className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar role"
                                    onClick={() => { setEditingUserId(profile.id); setEditingRole(profile.role as UserRole); }}>
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Reset password"
                                    onClick={() => setConfirmAction({
                                      type: "password_reset", userId: profile.user_id,
                                      email: profile.email, nome: profile.nome,
                                    })}>
                                    <KeyRound className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Renovar trial"
                                    onClick={() => setConfirmAction({
                                      type: "renew_trial", userId: profile.user_id,
                                      email: profile.email, nome: profile.nome,
                                    })}>
                                    <CalendarPlus className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "password_reset" ? "Enviar Reset de Password" : "Renovar Trial"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "password_reset"
                ? `Será enviado um email de redefinição de password para ${confirmAction?.email}.`
                : `O trial de ${confirmAction?.nome} será renovado por mais 30 dias.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={adminActionMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={adminActionMutation.isPending}>
              {adminActionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AddUserDialog open={showAddUser} onOpenChange={setShowAddUser} />
    </AdminLayout>
  );
}
