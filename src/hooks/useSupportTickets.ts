import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SupportTicket {
  id: string;
  user_id: string;
  user_email: string | null;
  user_nome: string | null;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string;
}

export function useSupportTickets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user,
  });

  const createTicket = useMutation({
    mutationFn: async (ticket: { titulo: string; descricao: string; prioridade: string }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, email")
        .eq("user_id", user!.id)
        .single();

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user!.id,
          user_email: profile?.email || user!.email,
          user_nome: profile?.nome || "",
          titulo: ticket.titulo,
          descricao: ticket.descricao,
          prioridade: ticket.prioridade,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
  });

  const updateTicketStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
  });

  return { ticketsQuery, createTicket, updateTicketStatus };
}

export function useTicketMessages(ticketId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!ticketId && !!user,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content, senderRole }: { content: string; senderRole: string }) => {
      const { error } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: ticketId!,
          sender_id: user!.id,
          sender_role: senderRole,
          content,
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticketId] }),
  });

  return { messagesQuery, sendMessage };
}
