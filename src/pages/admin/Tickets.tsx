import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TicketCheck, Send, Clock, CheckCircle, AlertCircle, Loader2, ArrowLeft, User, ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { useSupportTickets, useTicketMessages } from "@/hooks/useSupportTickets";

export default function AdminTicketsPage() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [replyContent, setReplyContent] = useState("");

  const { ticketsQuery, updateTicketStatus } = useSupportTickets();
  const { messagesQuery, sendMessage } = useTicketMessages(selectedTicketId);

  const tickets = ticketsQuery.data || [];
  const filteredTickets = filterStatus === "todos" ? tickets : tickets.filter(t => t.status === filterStatus);
  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedTicketId) return;
    try {
      await sendMessage.mutateAsync({ content: replyContent, senderRole: "admin" });
      if (selectedTicket?.status === "aberto") {
        await updateTicketStatus.mutateAsync({ id: selectedTicketId, status: "em_progresso" });
      }
      setReplyContent("");
      toast.success("Resposta enviada!");
    } catch { toast.error("Erro ao enviar resposta"); }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedTicketId) return;
    try {
      await updateTicketStatus.mutateAsync({ id: selectedTicketId, status });
      toast.success("Estado atualizado!");
    } catch { toast.error("Erro ao atualizar estado"); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aberto": return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300 text-xs">Aberto</Badge>;
      case "em_progresso": return <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 text-xs">Em Progresso</Badge>;
      case "resolvido": return <Badge className="bg-green-500/15 text-green-700 border-green-300 text-xs">Resolvido</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "baixa": return <Badge variant="outline" className="text-xs">Baixa</Badge>;
      case "media": return <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs">Média</Badge>;
      case "alta": return <Badge variant="outline" className="border-destructive text-destructive text-xs">Alta</Badge>;
      default: return <Badge variant="outline" className="text-xs">{p}</Badge>;
    }
  };

  const openCount = tickets.filter(t => t.status !== "resolvido").length;

  if (selectedTicket) {
    return (
      <AdminLayout title="Detalhe do Ticket" subtitle={selectedTicket.titulo}>
        <div className="p-4 md:p-6 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTicketId(null)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Voltar
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Informações</CardTitle></CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div><span className="text-muted-foreground text-xs">Utilizador:</span> <span className="font-medium text-xs">{selectedTicket.user_nome || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs">Email:</span> <span className="font-medium text-xs">{selectedTicket.user_email || "—"}</span></div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground text-xs">Prioridade:</span> {getPriorityBadge(selectedTicket.prioridade)}</div>
                <div><span className="text-muted-foreground text-xs">Criado:</span> <span className="text-xs">{format(new Date(selectedTicket.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Estado:</span>
                  <Select value={selectedTicket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_progresso">Em Progresso</SelectItem>
                      <SelectItem value="resolvido">Resolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-xs">Descrição:</span>
                  <p className="mt-1 text-xs">{selectedTicket.descricao}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Conversa</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[350px] p-4">
                  {messagesQuery.isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : !(messagesQuery.data || []).length ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Sem mensagens. Envie a primeira resposta.</p>
                  ) : (
                    <div className="space-y-3">
                      {(messagesQuery.data || []).map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                          <div className="flex items-start gap-2 max-w-[80%]">
                            {msg.sender_role !== "admin" && (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <User className="h-3 w-3" />
                              </div>
                            )}
                            <div className={`rounded-lg p-3 text-xs ${msg.sender_role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${msg.sender_role === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: pt })}
                              </p>
                            </div>
                            {msg.sender_role === "admin" && (
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-3 w-3 text-primary" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="p-4 border-t space-y-2">
                  <Textarea placeholder="Escreva a sua resposta..." value={replyContent} onChange={e => setReplyContent(e.target.value)} rows={3} className="text-sm" />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleReply} disabled={!replyContent.trim() || sendMessage.isPending}>
                      {sendMessage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                      Enviar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Tickets de Suporte" subtitle={`${openCount} ticket(s) em aberto`}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_progresso">Em Progresso</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {ticketsQuery.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : !filteredTickets.length ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <TicketCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum ticket encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredTickets.map(ticket => (
              <Card key={ticket.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedTicketId(ticket.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.prioridade)}
                        <span className="text-[11px] text-muted-foreground">{ticket.user_nome || ticket.user_email}</span>
                      </div>
                      <h4 className="font-medium text-sm">{ticket.titulo}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.descricao}</p>
                      <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                      </div>
                    </div>
                    {ticket.status === "resolvido" ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
