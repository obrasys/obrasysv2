import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Download, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

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
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [trialFilter, setTrialFilter] = useState<string>("all");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);

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

  // Filter profiles
  const filteredProfiles = profiles?.filter((profile) => {
    const matchesSearch = 
      profile.nome?.toLowerCase().includes(search.toLowerCase()) ||
      profile.email?.toLowerCase().includes(search.toLowerCase()) ||
      profile.empresa?.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === "all" || profile.role === roleFilter;
    const matchesTrial = trialFilter === "all" || 
      (trialFilter === "active" && !profile.trial_expired) ||
      (trialFilter === "expired" && profile.trial_expired);
    
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Trial</TableHead>
                    <TableHead>Data Registo</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
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
                        <Badge variant={profile.trial_expired ? "destructive" : "secondary"}>
                          {profile.trial_expired ? "Expirado" : "Ativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {profile.created_at
                          ? format(new Date(profile.created_at), "dd/MM/yyyy", { locale: pt })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {editingUserId === profile.id ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleSaveRole(profile.id)}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleEditRole(profile.id, profile.role as UserRole)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
