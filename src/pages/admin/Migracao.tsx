import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, 
  Send, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Mail,
  FileJson,
  RefreshCw,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface MigratedUser {
  id: string;
  email: string;
  nome: string | null;
  empresa: string | null;
  nif: string | null;
  telefone: string | null;
  v1_user_id: string | null;
  status: string;
  email_sent_at: string | null;
  migrated_at: string | null;
  error_message: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pendente: { label: "Pendente", variant: "secondary", icon: Clock },
  email_enviado: { label: "Email Enviado", variant: "default", icon: Mail },
  migrado: { label: "Migrado", variant: "outline", icon: CheckCircle2 },
  erro: { label: "Erro", variant: "destructive", icon: AlertCircle },
};

export default function MigracaoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jsonInput, setJsonInput] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [emailLimit, setEmailLimit] = useState(50);

  // Fetch migrated users
  const { data: migratedUsers = [], isLoading, refetch } = useQuery({
    queryKey: ["migrated-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("migrated_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MigratedUser[];
    },
  });

  // Calculate stats
  const stats = {
    total: migratedUsers.length,
    pendente: migratedUsers.filter(u => u.status === "pendente").length,
    email_enviado: migratedUsers.filter(u => u.status === "email_enviado").length,
    migrado: migratedUsers.filter(u => u.status === "migrado").length,
    erro: migratedUsers.filter(u => u.status === "erro").length,
  };

  const conversionRate = stats.total > 0 
    ? Math.round((stats.migrado / stats.total) * 100) 
    : 0;

  // Import users mutation
  const importMutation = useMutation({
    mutationFn: async (users: any[]) => {
      const { data, error } = await supabase.functions.invoke("import-v1-users", {
        body: { users },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Importação concluída",
        description: `${data.imported} utilizadores importados, ${data.skipped} ignorados`,
      });
      queryClient.invalidateQueries({ queryKey: ["migrated-users"] });
      setJsonInput("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send emails mutation
  const sendEmailsMutation = useMutation({
    mutationFn: async ({ limit, testMode, testEmail }: { limit: number; testMode?: boolean; testEmail?: string }) => {
      const { data, error } = await supabase.functions.invoke("send-migration-emails", {
        body: { limit, testMode, testEmail },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Emails enviados",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["migrated-users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar emails",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    try {
      const users = JSON.parse(jsonInput);
      if (!Array.isArray(users)) {
        toast({
          title: "Formato inválido",
          description: "O JSON deve ser um array de utilizadores",
          variant: "destructive",
        });
        return;
      }
      importMutation.mutate(users);
    } catch (e) {
      toast({
        title: "JSON inválido",
        description: "Verifique o formato do JSON",
        variant: "destructive",
      });
    }
  };

  const handleSendTestEmail = () => {
    if (!testEmail) {
      toast({
        title: "Email obrigatório",
        description: "Introduza um email de teste",
        variant: "destructive",
      });
      return;
    }
    sendEmailsMutation.mutate({ limit: 1, testMode: true, testEmail });
  };

  const handleSendEmails = () => {
    sendEmailsMutation.mutate({ limit: emailLimit });
  };

  // Resend single email mutation
  const resendEmailMutation = useMutation({
    mutationFn: async ({ email, nome }: { email: string; nome: string | null }) => {
      const { data, error } = await supabase.functions.invoke("send-migration-emails", {
        body: { testMode: true, testEmail: email, userName: nome },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Email reenviado",
        description: `Email de migração reenviado para ${variables.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ["migrated-users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reenviar email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResendEmail = (user: MigratedUser) => {
    resendEmailMutation.mutate({ email: user.email, nome: user.nome });
  };

  return (
    <AppLayout 
      title="Migração V1 → V2" 
      subtitle="Importar utilizadores do ObraSys V1 e enviar comunicação"
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendente}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Email Enviado</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.email_enviado}</p>
                </div>
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Migrados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.migrado}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{stats.erro}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Rate */}
        {stats.total > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de Conversão</span>
                <span className="text-sm text-muted-foreground">{conversionRate}%</span>
              </div>
              <Progress value={conversionRate} className="h-2" />
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </TabsTrigger>
            <TabsTrigger value="send">
              <Send className="h-4 w-4 mr-2" />
              Enviar Emails
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Utilizadores ({stats.total})
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Importar Utilizadores V1
                </CardTitle>
                <CardDescription>
                  Cole o JSON exportado do Supabase V1 (tabela profiles ou auth.users)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Formato esperado:</Label>
                  <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto">
{`[
  {
    "email": "utilizador@exemplo.com",
    "nome": "Nome do Utilizador",
    "empresa": "Empresa Lda",
    "nif": "123456789",
    "telefone": "912345678",
    "v1_user_id": "uuid-do-v1" 
  }
]`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="json">JSON dos Utilizadores</Label>
                  <Textarea
                    id="json"
                    placeholder="Cole aqui o JSON..."
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                <Button 
                  onClick={handleImport}
                  disabled={!jsonInput || importMutation.isPending}
                  className="w-full"
                >
                  {importMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      A importar...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Utilizadores
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Send Emails Tab */}
          <TabsContent value="send" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Teste de Email</CardTitle>
                  <CardDescription>
                    Envie um email de teste para verificar o template
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testEmail">Email de teste</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleSendTestEmail}
                    disabled={sendEmailsMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {sendEmailsMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Enviar Email de Teste
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Envio em Massa</CardTitle>
                  <CardDescription>
                    Envie emails para utilizadores pendentes ({stats.pendente} disponíveis)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="limit">Limite por envio</Label>
                    <Input
                      id="limit"
                      type="number"
                      min={1}
                      max={100}
                      value={emailLimit}
                      onChange={(e) => setEmailLimit(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recomendado: 50 por vez para evitar limites de rate
                    </p>
                  </div>
                  <Button 
                    onClick={handleSendEmails}
                    disabled={sendEmailsMutation.isPending || stats.pendente === 0}
                    className="w-full"
                  >
                    {sendEmailsMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        A enviar...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar {Math.min(emailLimit, stats.pendente)} Emails
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Atenção: Modo de Teste do Resend</p>
                    <p className="text-sm text-amber-700 mt-1">
                      O Resend está em modo de teste. Apenas emails para endereços verificados serão entregues.
                      Para enviar para todos os utilizadores, verifique um domínio em{" "}
                      <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline">
                        resend.com/domains
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Lista de Utilizadores</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : migratedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum utilizador importado ainda</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {migratedUsers.map((user) => {
                          const config = statusConfig[user.status] || statusConfig.pendente;
                          const StatusIcon = config.icon;

                          return (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.email}</TableCell>
                              <TableCell>{user.nome || "-"}</TableCell>
                              <TableCell>{user.empresa || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={config.variant} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {config.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {user.email_sent_at 
                                  ? format(new Date(user.email_sent_at), "dd/MM/yyyy HH:mm", { locale: pt })
                                  : format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: pt })
                                }
                              </TableCell>
                              <TableCell className="text-right">
                                {user.status !== "migrado" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResendEmail(user)}
                                    disabled={resendEmailMutation.isPending}
                                    title="Reenviar email de migração"
                                  >
                                    {resendEmailMutation.isPending ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
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
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
