import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

// Types
interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface Ticket {
  id: string;
  titulo: string;
  descricao: string;
  status: "aberto" | "em_progresso" | "resolvido";
  prioridade: "baixa" | "media" | "alta";
  created_at: Date;
  updated_at: Date;
}

interface FAQItem {
  id: string;
  pergunta: string;
  resposta: string;
  categoria: string;
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

const mockTickets: Ticket[] = [
  {
    id: "TK-001",
    titulo: "Erro ao exportar orçamento",
    descricao: "Quando tento exportar o orçamento para PDF, aparece erro.",
    status: "em_progresso",
    prioridade: "alta",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "TK-002",
    titulo: "Dúvida sobre licenciamento",
    descricao: "Gostaria de saber como funciona o plano empresarial.",
    status: "resolvido",
    prioridade: "baixa",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

export default function SuportePage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Olá! Sou o Assistente Oficial do ObraSys. Como posso ajudar hoje?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ titulo: "", descricao: "", prioridade: "media" as const });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Entendo a sua questão. Pode dar-me mais detalhes para eu poder ajudá-lo melhor?",
        "Claro! Para resolver isso, siga estes passos: 1) Aceda ao menu principal, 2) Selecione a opção desejada, 3) Confirme a ação.",
        "Essa funcionalidade está disponível no menu lateral. Posso guiá-lo passo a passo se preferir.",
        "Vou verificar essa informação. Enquanto isso, pode consultar a nossa secção de FAQ para dúvidas frequentes.",
      ];
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const handleCreateTicket = () => {
    if (!newTicket.titulo.trim() || !newTicket.descricao.trim()) return;
    // In real app, this would save to database
    setIsCreatingTicket(false);
    setNewTicket({ titulo: "", descricao: "", prioridade: "media" });
  };

  const getStatusBadge = (status: Ticket["status"]) => {
    switch (status) {
      case "aberto":
        return <Badge className="bg-blue-100 text-blue-800">Aberto</Badge>;
      case "em_progresso":
        return <Badge className="bg-yellow-100 text-yellow-800">Em Progresso</Badge>;
      case "resolvido":
        return <Badge className="bg-green-100 text-green-800">Resolvido</Badge>;
    }
  };

  const getPriorityBadge = (prioridade: Ticket["prioridade"]) => {
    switch (prioridade) {
      case "baixa":
        return <Badge variant="outline">Baixa</Badge>;
      case "media":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Média</Badge>;
      case "alta":
        return <Badge variant="outline" className="border-red-500 text-red-700">Alta</Badge>;
    }
  };

  return (
    <AppLayout title="Centro de Suporte">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Centro de Suporte</h1>
            <p className="text-muted-foreground">
              Ajuda, documentação e contacto direto
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href="mailto:suporte@obrasys.pt" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              suporte@obrasys.pt
            </a>
          </Button>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <p className="text-xs text-muted-foreground">IA Powered • Disponível 24/7</p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="h-[400px] p-4">
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
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {format(message.timestamp, "HH:mm", { locale: pt })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t flex gap-2">
                  <Input
                    placeholder="Escreva a sua mensagem..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets">
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
                      <div className="flex gap-2">
                        <Button onClick={handleCreateTicket}>Criar Ticket</Button>
                        <Button variant="outline" onClick={() => setIsCreatingTicket(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  {mockTickets.map((ticket) => (
                    <Card key={ticket.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-mono text-muted-foreground">{ticket.id}</span>
                              {getStatusBadge(ticket.status)}
                              {getPriorityBadge(ticket.prioridade)}
                            </div>
                            <h4 className="font-medium">{ticket.titulo}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{ticket.descricao}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Criado: {format(ticket.created_at, "dd/MM/yyyy", { locale: pt })}
                              </span>
                              <span className="flex items-center gap-1">
                                Atualizado: {format(ticket.updated_at, "dd/MM/yyyy", { locale: pt })}
                              </span>
                            </div>
                          </div>
                          {ticket.status === "resolvido" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
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
