import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
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

  // Fetch failed login attempts
  const { data: failedLogins, isLoading: loginsLoading, refetch: refetchLogins } = useQuery({
    queryKey: ["admin-failed-logins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("failed_login_attempts")
        .select("*")
        .order("attempted_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch price audit log
  const { data: priceAuditLog, isLoading: priceLogLoading, refetch: refetchPriceLog } = useQuery({
    queryKey: ["admin-price-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch migrated users for migration audit
  const { data: migratedUsers, isLoading: migratedLoading, refetch: refetchMigrated } = useQuery({
    queryKey: ["admin-migrated-users-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("migrated_users")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = () => {
    if (activeTab === "login-attempts") refetchLogins();
    else if (activeTab === "price-audit") refetchPriceLog();
    else if (activeTab === "migration") refetchMigrated();
  };

  // Parse detalhes JSON for price audit log
  const getAuditDetails = (detalhes: unknown) => {
    if (!detalhes || typeof detalhes !== "object") return { old_price: null, new_price: null };
    const d = detalhes as Record<string, unknown>;
    return {
      old_price: d.old_price ?? d.preco_antigo ?? null,
      new_price: d.new_price ?? d.preco_novo ?? null,
    };
  };

  return (
    <AppLayout
      title="Auditoria do Sistema"
      subtitle="Logs de segurança e histórico de ações críticas"
      actions={
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="login-attempts" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Tentativas de Login
            </TabsTrigger>
            <TabsTrigger value="price-audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Auditoria de Preços
            </TabsTrigger>
            <TabsTrigger value="migration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Migração V1→V2
            </TabsTrigger>
          </TabsList>

          {/* Failed Login Attempts */}
          <TabsContent value="login-attempts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Tentativas de Login Falhadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loginsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : failedLogins?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma tentativa de login falhada registada
                  </p>
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
                      {failedLogins?.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">{attempt.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{attempt.ip_address || "-"}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                            {attempt.user_agent || "-"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(attempt.attempted_at), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price Audit Log */}
          <TabsContent value="price-audit">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Alterações de Preços</CardTitle>
              </CardHeader>
              <CardContent>
                {priceLogLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : priceAuditLog?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum registo de auditoria de preços
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ação</TableHead>
                        <TableHead>Material ID</TableHead>
                        <TableHead>Preço Antigo</TableHead>
                        <TableHead>Preço Novo</TableHead>
                        <TableHead>Executado Por</TableHead>
                        <TableHead>Data/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {priceAuditLog?.map((log) => {
                        const details = getAuditDetails(log.detalhes);
                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant={
                                log.acao === "create" || log.acao === "criar" ? "default" :
                                log.acao === "update" || log.acao === "atualizar" ? "secondary" :
                                log.acao === "delete" || log.acao === "eliminar" ? "destructive" : "outline"
                              }>
                                {log.acao}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {log.material_id?.slice(0, 8)}...
                            </TableCell>
                            <TableCell>
                              {details.old_price ? `€${Number(details.old_price).toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell>
                              {details.new_price ? `€${Number(details.new_price).toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {log.executado_por || "Sistema"}
                            </TableCell>
                            <TableCell>
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Migration Audit */}
          <TabsContent value="migration">
            <Card>
              <CardHeader>
                <CardTitle>Estado da Migração de Utilizadores</CardTitle>
              </CardHeader>
              <CardContent>
                {migratedLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : migratedUsers?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum utilizador migrado
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Email Enviado</TableHead>
                        <TableHead>Migrado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {migratedUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.nome || "-"}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={
                              user.status === "completed" ? "default" :
                              user.status === "email_sent" ? "secondary" :
                              user.status === "pending" ? "outline" : "destructive"
                            }>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.email_sent_at 
                              ? format(new Date(user.email_sent_at), "dd/MM/yyyy", { locale: pt })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {user.migrated_at 
                              ? format(new Date(user.migrated_at), "dd/MM/yyyy", { locale: pt })
                              : "-"}
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
    </AppLayout>
  );
}
