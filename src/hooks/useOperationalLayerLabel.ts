import { useAuth } from "@/contexts/AuthContext";

/**
 * Devolve a nomenclatura da camada operacional (Budget Objetivo / Reorçamento /
 * Ficha de Produção) consoante o perfil do utilizador autenticado.
 *
 * - admin / gestor / financeiro / sales  → "Budget Objetivo"
 * - fiscal                                → "Ficha de Produção"
 * - outros (cliente, supplier, etc.)      → "Reorçamento"
 */
export function useOperationalLayerLabel() {
  const { profile } = useAuth();
  const role = profile?.role;

  let label = "Reorçamento";
  let short = "Reorçamento";
  if (role === "fiscal") {
    label = "Ficha de Produção";
    short = "Ficha Produção";
  } else if (role === "admin" || role === "gestor" || role === "financeiro" || role === "sales") {
    label = "Budget Objetivo";
    short = "Budget";
  }

  return { label, short, role };
}
