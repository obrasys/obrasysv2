import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bot,
  TicketCheck,
  MessageCircle,
  Mail,
  Send,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { useSupportTickets, useTicketMessages } from "@/hooks/useSupportTickets";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Types
interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface FAQItem {
  id: string;
  pergunta: string;
  resposta: string;
  categoria: string;
}

// Streaming chat function
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

type Msg = { role: "user" | "assistant"; content: string };

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      onError("Sessão expirada. Faça login novamente.");
      return;
    }
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        onError("Limite de pedidos excedido. Tente novamente mais tarde.");
        return;
      }
      if (resp.status === 402) {
        onError("Créditos esgotados. Contacte o suporte.");
        return;
      }
      onError(errorData.error || "Erro ao comunicar com a IA.");
      return;
    }

    if (!resp.body) {
      onError("Resposta vazia do servidor.");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream error:", error);
    onError("Erro de conexão. Verifique a sua internet.");
  }
}

// Mock data
const mockFAQs: FAQItem[] = [
  {
    id: "1",
    pergunta: "Como criar um novo orçamento?",
    resposta: "Para criar um novo orçamento, aceda ao menu Orçamentos e clique em 'Criar Orçamento'. Preencha os dados da obra, adicione capítulos e artigos conforme necessário.",
    categoria: "Orçamentos",
  },
  {
    id: "2",
    pergunta: "Como exportar um RDO para PDF?",
    resposta: "No detalhe do RDO, clique no botão 'Exportar PDF' no canto superior direito. O documento será gerado com todos os dados do relatório diário.",
    categoria: "RDOs",
  },
  {
    id: "3",
    pergunta: "Como adicionar um novo cliente?",
    resposta: "Aceda ao menu Clientes e clique em 'Novo Cliente'. Preencha os dados de contacto e informações fiscais. Pode também importar clientes via CSV.",
    categoria: "Clientes",
  },
  {
    id: "4",
    pergunta: "Como funciona a base de preços?",
    resposta: "A base de preços centraliza todos os preços de materiais. Pode consultar preços de referência, inserir novos preços e o sistema calcula automaticamente médias ponderadas.",
    categoria: "Base de Preços",
  },
  {
    id: "5",
    pergunta: "Como gerir tarefas de uma obra?",
    resposta: "No módulo Tarefas, pode criar cronogramas, definir dependências entre tarefas e acompanhar o progresso. Use a vista de Gantt para visualização temporal.",
    categoria: "Tarefas",
  },
];


export default function SuportePage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Olá! Sou o Assistente Oficial do ObraSys. Como posso ajudar hoje?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ titulo: "", descricao: "", prioridade: "media" });
  const [replyContent, setReplyContent] = useState("");
  
  const { ticketsQuery, createTicket } = useSupportTickets();
  const { messagesQuery, sendMessage } = useTicketMessages(selectedTicketId);
  const tickets = ticketsQuery.data || [];
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Convert to API format
    const apiMessages: Msg[] = messages
      .filter((m) => m.id !== "1") // Skip initial greeting
      .map((m) => ({
        role: m.sender as "user" | "assistant",
        content: m.content,
      }));
    apiMessages.push({ role: "user", content: inputMessage });

    let assistantContent = "";

    await streamChat({
      messages: apiMessages,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.sender === "assistant" && last.id.startsWith("streaming-")) {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [
            ...prev,
            {
              id: `streaming-${Date.now()}`,
              content: assistantContent,
              sender: "assistant",
              timestamp: new Date(),
            },
          ];
        });
      },
      onDone: () => {
        setIsLoading(false);
        // Finalize the message ID
        setMessages((prev) =>
          prev.map((m) =>
            m.id.startsWith("streaming-")
              ? { ...m, id: `msg-${Date.now()}` }
              : m
          )
        );
      },
      onError: (error) => {
        setIsLoading(false);
        toast.error(error);
        // Remove the user message if there was an error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      },
    });
  };

  const handleCreateTicket = async () => {
    if (!newTicket.titulo.trim() || !newTicket.descricao.trim()) return;
    try {
      await createTicket.mutateAsync(newTicket);
      toast.success("Ticket criado com sucesso!");
      setIsCreatingTicket(false);
      setNewTicket({ titulo: "", descricao: "", prioridade: "media" });
    } catch {
      toast.error("Erro ao criar ticket");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aberto":
        return <Badge className="bg-blue-100 text-blue-800">Aberto</Badge>;
      case "em_progresso":
        return <Badge className="bg-yellow-100 text-yellow-800">Em Progresso</Badge>;
      case "resolvido":
        return <Badge className="bg-green-100 text-green-800">Resolvido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (prioridade: string) => {
    switch (prioridade) {
      case "baixa":
        return <Badge variant="outline">Baixa</Badge>;
      case "media":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Média</Badge>;
      case "alta":
        return <Badge variant="outline" className="border-red-500 text-red-700">Alta</Badge>;
      default:
        return <Badge variant="outline">{prioridade}</Badge>;
    }
  };

  return (
    <AppLayout 
      title="Centro de Suporte"
      subtitle="Ajuda, documentação e contacto direto"
      actions={
        <Button variant="outline" asChild>
          <a href="mailto:suporte@obrasys.pt" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            suporte@obrasys.pt
          </a>
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Quick Access Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab("chat")}>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Assistente IA</h3>
              <p className="text-sm text-muted-foreground mb-4">Assistência inteligente 24/7</p>
              <Button className="w-full" onClick={() => setActiveTab("chat")}>
                Ver Chat IA
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab("tickets")}>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <TicketCheck className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Tickets de Suporte</h3>
              <p className="text-sm text-muted-foreground mb-4">Sistema organizado de suporte</p>
              <Button variant="outline" className="w-full" onClick={() => setActiveTab("tickets")}>
                Gerir Tickets
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">WhatsApp</h3>
              <p className="text-sm text-muted-foreground mb-4">Contacto direto via WhatsApp</p>
              <Button variant="outline" className="w-full" asChild>
                <a href="https://wa.me/351912345678" target="_blank" rel="noopener noreferrer">
                  Abrir WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Email</h3>
              <p className="text-sm text-muted-foreground mb-4">Resposta em até 24 horas</p>
              <Button variant="outline" className="w-full" asChild>
                <a href="mailto:suporte@obrasys.pt">
                  suporte@obrasys.pt
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Chat IA
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <TicketCheck className="h-4 w-4" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              FAQ
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          {/* Chat IA Tab */}
          <TabsContent value="chat">
            <Card>
              <CardContent className="p-0">
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Assistente ObraSys</h3>
                    <p className="text-xs text-muted-foreground">
                      IA Powered • Disponível 24/7
                      {isLoading && <span className="ml-2 text-primary">• A escrever...</span>}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="h-[400px] p-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className="flex items-start gap-2 max-w-[80%]">
                          {message.sender === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`rounded-lg p-3 ${
                              message.sender === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className={`text-xs mt-1 ${message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {format(message.timestamp, "HH:mm", { locale: pt })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.sender === "user" && (
                      <div className="flex justify-start">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="rounded-lg p-3 bg-muted">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t flex gap-2">
                  <Input
                    placeholder="Escreva a sua mensagem..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets">
            {selectedTicket ? (
              <Card>
                <CardContent className="p-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTicketId(null)} className="mb-3">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                  </Button>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.prioridade)}
                  </div>
                  <h3 className="font-semibold text-lg">{selectedTicket.titulo}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">{selectedTicket.descricao}</p>

                  <ScrollArea className="h-[300px] border rounded-lg p-4 mb-4">
                    {messagesQuery.isLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : (messagesQuery.data || []).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">Sem mensagens. Aguarde uma resposta da equipa.</p>
                    ) : (
                      <div className="space-y-3">
                        {(messagesQuery.data || []).map((msg) => (
                          <div key={msg.id} className={`flex ${msg.sender_role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className="flex items-start gap-2 max-w-[80%]">
                              {msg.sender_role !== "user" && (
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                </div>
                              )}
                              <div className={`rounded-lg p-3 text-sm ${msg.sender_role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                <p className={`text-xs mt-1 ${msg.sender_role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                  {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: pt })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Escreva uma mensagem..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button
                      onClick={async () => {
                        if (!replyContent.trim()) return;
                        try {
                          await sendMessage.mutateAsync({ content: replyContent, senderRole: "user" });
                          setReplyContent("");
                        } catch { toast.error("Erro ao enviar"); }
                      }}
                      disabled={!replyContent.trim() || sendMessage.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Os Meus Tickets</h3>
                    <Button onClick={() => setIsCreatingTicket(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Ticket
                    </Button>
                  </div>

                  {isCreatingTicket && (
                    <Card className="mb-4 border-primary">
                      <CardContent className="p-4 space-y-4">
                        <Input
                          placeholder="Título do ticket"
                          value={newTicket.titulo}
                          onChange={(e) => setNewTicket({ ...newTicket, titulo: e.target.value })}
                        />
                        <Textarea
                          placeholder="Descreva o seu problema ou dúvida..."
                          value={newTicket.descricao}
                          onChange={(e) => setNewTicket({ ...newTicket, descricao: e.target.value })}
                        />
                        <Select value={newTicket.prioridade} onValueChange={(v) => setNewTicket({ ...newTicket, prioridade: v })}>
                          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button onClick={handleCreateTicket} disabled={createTicket.isPending}>
                            {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Criar Ticket
                          </Button>
                          <Button variant="outline" onClick={() => setIsCreatingTicket(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {ticketsQuery.isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : tickets.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Ainda não criou nenhum ticket.</p>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((ticket) => (
                        <Card key={ticket.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedTicketId(ticket.id)}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusBadge(ticket.status)}
                                  {getPriorityBadge(ticket.prioridade)}
                                </div>
                                <h4 className="font-medium">{ticket.titulo}</h4>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{ticket.descricao}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: pt })}
                                  </span>
                                </div>
                              </div>
                              {ticket.status === "resolvido" ? (
                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Perguntas Frequentes</h3>
                <div className="space-y-2">
                  {mockFAQs.map((faq) => (
                    <Card key={faq.id} className="overflow-hidden">
                      <button
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="shrink-0">{faq.categoria}</Badge>
                          <span className="font-medium">{faq.pergunta}</span>
                        </div>
                        {expandedFAQ === faq.id ? (
                          <ChevronUp className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                      {expandedFAQ === faq.id && (
                        <div className="px-4 pb-4 pt-0">
                          <p className="text-muted-foreground pl-[68px]">{faq.resposta}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Suporte via WhatsApp</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Fale diretamente com a nossa equipa de suporte através do WhatsApp. 
                  Disponível em dias úteis das 9h às 18h.
                </p>
                <Button size="lg" className="bg-green-600 hover:bg-green-700" asChild>
                  <a
                    href="https://wa.me/351912345678?text=Olá! Preciso de ajuda com o ObraSys."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Iniciar Conversa no WhatsApp
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  +351 912 345 678
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
