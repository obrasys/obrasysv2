import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ACTION_MESSAGES: Record<string, { title: string; kind: "success" | "error" | "info" }> = {
  accepted: { title: "Rascunho aceite", kind: "success" },
  rejected: { title: "Rascunho rejeitado", kind: "error" },
  converted: { title: "Rascunho convertido", kind: "success" },
  marked_needs_info: { title: "Pediu mais informação", kind: "info" },
};

/**
 * Subscribes to axia_intake_item_history inserts and shows toast notifications
 * for accept/reject/convert actions performed by anyone in the organization.
 * Skips toasts for the current user's own actions to avoid duplicates with the
 * mutation feedback.
 */
export function useAxiaIntakeRealtimeNotifications() {
  const { user, organization } = useAuth();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!organization?.id) return;
    const channel = supabase
      .channel(`org:${organization.id}:axia-intake-history-notifications`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "axia_intake_item_history" },
        async (payload) => {
          const row = payload.new as {
            id: string;
            action: string;
            user_id: string;
            intake_item_id: string;
          };
          if (!row?.id || seen.current.has(row.id)) return;
          seen.current.add(row.id);

          const meta = ACTION_MESSAGES[row.action];
          if (!meta) return;
          if (user?.id && row.user_id === user.id) return;

          // Try to fetch actor + item title for richer message
          const [{ data: profile }, { data: item }] = await Promise.all([
            supabase.from("profiles").select("nome, email").eq("user_id", row.user_id).maybeSingle(),
            (supabase.from as any)("axia_intake_items").select("title").eq("id", row.intake_item_id).maybeSingle(),
          ]);
          const who = profile?.nome || profile?.email || "Outro utilizador";
          const what = item?.title ? `“${item.title}”` : "um rascunho";
          const description = `${who} ${meta.title.toLowerCase()} ${what}.`;

          if (meta.kind === "success") toast.success(meta.title, { description });
          else if (meta.kind === "error") toast.error(meta.title, { description });
          else toast(meta.title, { description });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, organization?.id]);
}
