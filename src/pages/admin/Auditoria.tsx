import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Shield, AlertTriangle, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function AdminAuditoria() {
  const [activeTab, setActiveTab] = useState("login-attempts");

  const { data: failedLogins, isLoading: l1, refetch: r1 } = useQuery({
    queryKey: ["admin-failed-logins"],
    queryFn: async () => {
      const { data, error } = await supabase.from("failed_login_attempts").select("*").order("attempted_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: priceAuditLog, isLoading: l2, refetch: r2 } = useQuery({
    queryKey: ["admin-price-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("price_audit_log").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: migratedUsers, isLoading: l3, refetch: r3 } = useQuery({
    queryKey: ["admin-migrated-users-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("migrated_users").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = () => {
    if (activeTab === "login-attempts") r1();
    else if (activeTab === "price-audit") r2();
    else r3();
  };

  const getAuditDetails = (detalhes: unknown) => {
    if (!detalhes || typeof detalhes !== "object") return { old_price: null, new_price: null };
    const d = detalhes as Record<string, unknown>;
    return { old_price: d.old_price ?? d.preco_antigo ?? null, new_price: d.new_price ?? d.preco_novo ?? null };
  };

  return (
    <AdminLayout
      title="Auditoria do Sistema"
      subtitle="Logs de segurança e ações críticas"
      actions={
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Atualizar
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="login-attempts" className="text-xs gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Logins
            </TabsTrigger>
            <TabsTrigger value="price-audit" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Preços
            </TabsTrigger>
            <TabsTrigger value="migration" className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Migração
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login-attempts">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Tentativas de Login Falhadas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {l1 ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
                ) : !failedLogins?.length ? (
                  <p className="text-muted-foreground text-center py-12 text-sm">Nenhuma tentativa registada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>User Agent</TableHead>
                        <TableHead>Data/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedLogins.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium text-sm">{a.email}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{a.ip_address || "—"}</Badge></TableCell>
                          <TableCell className="max-w-[250px] truncate text-xs text-muted-foreground">{a.user_agent || "—"}</TableCell>
                          <TableCell className="text-xs">{format(new Date(a.attempted_at), "dd/MM/yyyy HH:mm:ss", { locale: pt })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="price-audit">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Alterações de Preços</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {l2 ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
                ) : !priceAuditLog?.length ? (
                  <p className="text-muted-foreground text-center py-12 text-sm">Sem registos</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ação</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Preço Antigo</TableHead>
                        <TableHead>Preço Novo</TableHead>
                        <TableHead>Por</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {priceAuditLog.map((log) => {
                        const d = getAuditDetails(log.detalhes);
                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant={log.acao === "delete" || log.acao === "eliminar" ? "destructive" : "secondary"} className="text-xs">{log.acao}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{log.material_id?.slice(0, 8)}...</TableCell>
                            <TableCell className="text-xs">{d.old_price ? `€${Number(d.old_price).toFixed(2)}` : "—"}</TableCell>
                            <TableCell className="text-xs">{d.new_price ? `€${Number(d.new_price).toFixed(2)}` : "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{log.executado_por || "Sistema"}</TableCell>
                            <TableCell className="text-xs">{format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="migration">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Migração de Utilizadores</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {l3 ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
                ) : !migratedUsers?.length ? (
                  <p className="text-muted-foreground text-center py-12 text-sm">Nenhum utilizador migrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Email Enviado</TableHead>
                        <TableHead>Migrado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {migratedUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium text-sm">{u.nome || "—"}</TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.status === "completed" ? "default" : u.status === "pending" ? "outline" : "secondary"} className="text-xs">
                              {u.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.email_sent_at ? format(new Date(u.email_sent_at), "dd/MM/yyyy", { locale: pt }) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.migrated_at ? format(new Date(u.migrated_at), "dd/MM/yyyy", { locale: pt }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
