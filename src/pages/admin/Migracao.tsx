import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, Send, Users, CheckCircle2, AlertCircle, Clock, Mail, FileJson, RefreshCw, RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface MigratedUser {
  id: string; email: string; nome: string | null; empresa: string | null;
  nif: string | null; telefone: string | null; v1_user_id: string | null;
  status: string; email_sent_at: string | null; migrated_at: string | null;
  error_message: string | null; created_at: string;
}

export default function MigracaoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jsonInput, setJsonInput] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [emailLimit, setEmailLimit] = useState(50);

  const { data: migratedUsers = [], isLoading, refetch } = useQuery({
    queryKey: ["migrated-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("migrated_users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as MigratedUser[];
    },
  });

  const stats = {
    total: migratedUsers.length,
    pendente: migratedUsers.filter(u => u.status === "pendente").length,
    email_enviado: migratedUsers.filter(u => u.status === "email_enviado").length,
    migrado: migratedUsers.filter(u => u.status === "migrado").length,
    erro: migratedUsers.filter(u => u.status === "erro").length,
  };
  const conversionRate = stats.total > 0 ? Math.round((stats.migrado / stats.total) * 100) : 0;

  const importMutation = useMutation({
    mutationFn: async (users: any[]) => {
      const { data, error } = await supabase.functions.invoke("import-v1-users", { body: { users } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Importação concluída", description: `${data.imported} importados, ${data.skipped} ignorados` });
      queryClient.invalidateQueries({ queryKey: ["migrated-users"] });
      setJsonInput("");
    },
    onError: (error: any) => toast({ title: "Erro na importação", description: error.message, variant: "destructive" }),
  });

  const sendEmailsMutation = useMutation({
    mutationFn: async ({ limit, testMode, testEmail }: { limit: number; testMode?: boolean; testEmail?: string }) => {
      const { data, error } = await supabase.functions.invoke("send-migration-emails", { body: { limit, testMode, testEmail } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Emails enviados", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["migrated-users"] });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const resendEmailMutation = useMutation({
    mutationFn: async ({ email, nome }: { email: string; nome: string | null }) => {
      const { data, error } = await supabase.functions.invoke("send-migration-emails", { body: { testMode: true, testEmail: email, userName: nome } });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      toast({ title: "Email reenviado", description: `Enviado para ${vars.email}` });
      queryClient.invalidateQueries({ queryKey: ["migrated-users"] });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const handleImport = () => {
    try {
      const users = JSON.parse(jsonInput);
      if (!Array.isArray(users)) { toast({ title: "Formato inválido", description: "Deve ser um array", variant: "destructive" }); return; }
      importMutation.mutate(users);
    } catch { toast({ title: "JSON inválido", variant: "destructive" }); }
  };

  return (
    <AdminLayout title="Migração V1 → V2" subtitle="Importar utilizadores e enviar comunicação">
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard icon={Users} title="Total" value={stats.total} />
          <KpiCard icon={Clock} title="Pendentes" value={stats.pendente} />
          <KpiCard icon={Mail} title="Email Enviado" value={stats.email_enviado} />
          <KpiCard icon={CheckCircle2} title="Migrados" value={stats.migrado} />
          <KpiCard icon={AlertCircle} title="Erros" value={stats.erro} iconClassName="bg-destructive/10" />
        </div>

        {stats.total > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Taxa de Conversão</span>
                <span className="text-xs text-muted-foreground">{conversionRate}%</span>
              </div>
              <Progress value={conversionRate} className="h-1.5" />
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import" className="text-xs gap-1.5"><Upload className="h-3.5 w-3.5" />Importar</TabsTrigger>
            <TabsTrigger value="send" className="text-xs gap-1.5"><Send className="h-3.5 w-3.5" />Enviar</TabsTrigger>
            <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="h-3.5 w-3.5" />Lista ({stats.total})</TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><FileJson className="h-4 w-4" />Importar Utilizadores V1</CardTitle>
                <CardDescription className="text-xs">Cole o JSON exportado do sistema V1</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea placeholder="Cole aqui o JSON..." value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={8} className="font-mono text-xs" />
                <Button onClick={handleImport} disabled={!jsonInput || importMutation.isPending} className="w-full" size="sm">
                  {importMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                  Importar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="send">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Teste de Email</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input type="email" placeholder="seu@email.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                  <Button onClick={() => { if (testEmail) sendEmailsMutation.mutate({ limit: 1, testMode: true, testEmail }); }} disabled={sendEmailsMutation.isPending} variant="outline" size="sm" className="w-full">
                    <Mail className="h-3.5 w-3.5 mr-1.5" />Enviar Teste
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Envio em Massa</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Limite por envio</Label>
                    <Input type="number" min={1} max={100} value={emailLimit} onChange={e => setEmailLimit(Number(e.target.value))} />
                  </div>
                  <Button onClick={() => sendEmailsMutation.mutate({ limit: emailLimit })} disabled={sendEmailsMutation.isPending || stats.pendente === 0} size="sm" className="w-full">
                    <Send className="h-3.5 w-3.5 mr-1.5" />Enviar {Math.min(emailLimit, stats.pendente)} Emails
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Lista de Utilizadores</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : !migratedUsers.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum utilizador importado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {migratedUsers.map(user => {
                        const cfg: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
                          pendente: { label: "Pendente", variant: "secondary" },
                          email_enviado: { label: "Email Enviado", variant: "default" },
                          migrado: { label: "Migrado", variant: "outline" },
                          erro: { label: "Erro", variant: "destructive" },
                        };
                        const s = cfg[user.status] || cfg.pendente;
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium text-sm">{user.nome || "-"}</TableCell>
                            <TableCell className="text-xs">{user.email}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{user.empresa || "-"}</TableCell>
                            <TableCell><Badge variant={s.variant} className="text-xs">{s.label}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{format(new Date(user.created_at), "dd/MM/yy", { locale: pt })}</TableCell>
                            <TableCell>
                              {(user.status === "pendente" || user.status === "email_enviado") && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => resendEmailMutation.mutate({ email: user.email, nome: user.nome })}>
                                  <RotateCcw className="h-3 w-3 mr-1" />{user.status === "pendente" ? "Enviar" : "Reenviar"}
                                </Button>
                              )}
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
        </Tabs>
      </div>
    </AdminLayout>
  );
}
