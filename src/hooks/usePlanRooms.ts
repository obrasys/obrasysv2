import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanRoom, TipoCompartimento, ValidationState, OrigemDado } from "@/types/plan-measurements";

export function usePlanRooms(planImportId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const roomsQuery = useQuery({
    queryKey: ["plan-rooms", planImportId],
    queryFn: async () => {
      if (!planImportId) return [];
      const { data, error } = await supabase
        .from("plan_rooms")
        .select("*")
        .eq("plan_import_id", planImportId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PlanRoom[];
    },
    enabled: !!planImportId && !!user,
  });

  const addRoom = useMutation({
    mutationFn: async (input: {
      nome: string;
      tipo_compartimento?: TipoCompartimento;
      boundary_coords: Array<{ x: number; y: number }>;
      pe_direito_m?: number;
      observacao?: string;
      origem?: OrigemDado;
    }) => {
      if (!user || !planImportId) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("plan_rooms")
        .insert({
          plan_import_id: planImportId,
          user_id: user.id,
          nome: input.nome,
          tipo_compartimento: input.tipo_compartimento || "habitacao",
          boundary_coords: input.boundary_coords as any,
          pe_direito_m: input.pe_direito_m ?? 2.70,
          observacao: input.observacao || null,
          origem: input.origem || "manual",
        })
        .select()
        .single();
      if (error) throw error;
      return data as PlanRoom;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-rooms", planImportId] });
      toast.success("Compartimento criado");
    },
    onError: (err: Error) => toast.error("Erro ao criar compartimento: " + err.message),
  });

  const updateRoom = useMutation({
    mutationFn: async (input: {
      id: string;
      nome?: string;
      tipo_compartimento?: TipoCompartimento;
      boundary_coords?: Array<{ x: number; y: number }>;
      pe_direito_m?: number;
      observacao?: string;
      estado_validacao?: ValidationState;
    }) => {
      const updates: Record<string, any> = {};
      if (input.nome !== undefined) updates.nome = input.nome;
      if (input.tipo_compartimento !== undefined) updates.tipo_compartimento = input.tipo_compartimento;
      if (input.boundary_coords !== undefined) updates.boundary_coords = input.boundary_coords;
      if (input.pe_direito_m !== undefined) updates.pe_direito_m = input.pe_direito_m;
      if (input.observacao !== undefined) updates.observacao = input.observacao;
      if (input.estado_validacao !== undefined) updates.estado_validacao = input.estado_validacao;

      const { data, error } = await supabase
        .from("plan_rooms")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as PlanRoom;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-rooms", planImportId] });
    },
    onError: (err: Error) => toast.error("Erro ao atualizar compartimento: " + err.message),
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-rooms", planImportId] });
      toast.success("Compartimento eliminado");
    },
    onError: (err: Error) => toast.error("Erro ao eliminar: " + err.message),
  });

  // Room-measurement link
  const linkMeasurement = useMutation({
    mutationFn: async ({ roomId, measurementId }: { roomId: string; measurementId: string }) => {
      const { error } = await supabase
        .from("plan_room_measurements")
        .insert({ room_id: roomId, measurement_id: measurementId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-room-measurements", planImportId] });
    },
    onError: (err: Error) => toast.error("Erro ao associar medição: " + err.message),
  });

  const unlinkMeasurement = useMutation({
    mutationFn: async ({ roomId, measurementId }: { roomId: string; measurementId: string }) => {
      const { error } = await supabase
        .from("plan_room_measurements")
        .delete()
        .eq("room_id", roomId)
        .eq("measurement_id", measurementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-room-measurements", planImportId] });
    },
  });

  // Fetch room-measurement links
  const roomMeasurementsQuery = useQuery({
    queryKey: ["plan-room-measurements", planImportId],
    queryFn: async () => {
      if (!planImportId) return [];
      // Get all room IDs for this plan, then fetch links
      const { data: rooms } = await supabase
        .from("plan_rooms")
        .select("id")
        .eq("plan_import_id", planImportId);
      if (!rooms || rooms.length === 0) return [];
      const roomIds = rooms.map((r) => r.id);
      const { data, error } = await supabase
        .from("plan_room_measurements")
        .select("*")
        .in("room_id", roomIds);
      if (error) throw error;
      return data as Array<{ id: string; room_id: string; measurement_id: string; created_at: string }>;
    },
    enabled: !!planImportId && !!user,
  });

  return {
    rooms: roomsQuery.data ?? [],
    roomMeasurements: roomMeasurementsQuery.data ?? [],
    isLoading: roomsQuery.isLoading,
    addRoom,
    updateRoom,
    deleteRoom,
    linkMeasurement,
    unlinkMeasurement,
  };
}
