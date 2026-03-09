import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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

  // Fetch all profiles
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

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      toast.success("Role atualizado com sucesso");
      setEditingUserId(null);
      setEditingRole(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar role: " + error.message);
    },
  });

  // Admin action mutation (password reset / renew trial)
  const adminActionMutation = useMutation({
    mutationFn: async (params: { action: string; userId?: string; email?: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
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

  // Compute trial expiration from date
  const isTrialExpiredByDate = (profile: any) => {
    if (!profile.trial_end) return false;
    return new Date(profile.trial_end) < new Date();
  };

  // Filter profiles
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
      p.nome || "",
      p.email || "",
      p.empresa || "",
      p.role,
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

  const handleEditRole = (userId: string, currentRole: UserRole) => {
    setEditingUserId(userId);
    setEditingRole(currentRole);
  };

  const handleSaveRole = (userId: string) => {
    if (editingRole) {
      updateRoleMutation.mutate({ userId, role: editingRole });
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingRole(null);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "password_reset") {
      adminActionMutation.mutate({
        action: "send_password_reset",
        email: confirmAction.email,
      });
    } else {
      adminActionMutation.mutate({
        action: "renew_trial",
        userId: confirmAction.userId,
      });
    }
  };

  return (
    <AppLayout
      title="Gestão de Utilizadores"
      subtitle="Visualizar e gerir todos os utilizadores do sistema"
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
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
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os roles</SelectItem>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={trialFilter} onValueChange={setTrialFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por trial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Trial ativo</SelectItem>
                  <SelectItem value="expired">Trial expirado</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Utilizadores ({filteredProfiles?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Trial</TableHead>
                      <TableHead>Trial Expira</TableHead>
                      <TableHead>Data Registo</TableHead>
                      <TableHead className="w-[160px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles?.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.nome || "-"}</TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>{profile.empresa || "-"}</TableCell>
                        <TableCell>
                          {editingUserId === profile.id ? (
                            <Select value={editingRole || profile.role} onValueChange={(v) => setEditingRole(v as UserRole)}>
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((role) => (
                                  <SelectItem key={role.value} value={role.value}>
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="capitalize">
                              {profile.role}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const expired = isTrialExpiredByDate(profile);
                            return (
                              <Badge variant={expired ? "destructive" : "secondary"}>
                                {expired ? "Expirado" : "Ativo"}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {profile.trial_end
                            ? format(new Date(profile.trial_end), "dd/MM/yyyy", { locale: pt })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {profile.created_at
                            ? format(new Date(profile.created_at), "dd/MM/yyyy", { locale: pt })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingUserId === profile.id ? (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => handleSaveRole(profile.id)}>
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  title="Editar role"
                                  onClick={() => handleEditRole(profile.id, profile.role as UserRole)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  title="Enviar reset de password"
                                  onClick={() => setConfirmAction({
                                    type: "password_reset",
                                    userId: profile.user_id,
                                    email: profile.email,
                                    nome: profile.nome,
                                  })}
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  title="Renovar trial"
                                  onClick={() => setConfirmAction({
                                    type: "renew_trial",
                                    userId: profile.user_id,
                                    email: profile.email,
                                    nome: profile.nome,
                                  })}
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "password_reset"
                ? "Enviar Reset de Password"
                : "Renovar Trial"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "password_reset"
                ? `Será enviado um email de redefinição de password para ${confirmAction?.email} (${confirmAction?.nome}).`
                : `O trial de ${confirmAction?.nome} (${confirmAction?.email}) será renovado por mais 30 dias.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={adminActionMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction} 
              disabled={adminActionMutation.isPending}
            >
              {adminActionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
