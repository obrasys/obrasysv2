import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface GripPreferences {
  show: boolean;
  toleranceImagePx: number; // tolerância em coordenadas da imagem (3-20)
  sizeScreenPx: number;     // tamanho visual em pixels de ecrã (4-16)
}

export const DEFAULT_GRIP_PREFERENCES: GripPreferences = {
  show: true,
  toleranceImagePx: 6,
  sizeScreenPx: 8,
};

const KEY_PREFIX = "obra-sys-grip-prefs:";

function readFromStorage(userId: string | null | undefined): GripPreferences {
  if (typeof window === "undefined") return DEFAULT_GRIP_PREFERENCES;
  try {
    const key = userId ? `${KEY_PREFIX}${userId}` : `${KEY_PREFIX}anon`;
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_GRIP_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      show: typeof parsed.show === "boolean" ? parsed.show : DEFAULT_GRIP_PREFERENCES.show,
      toleranceImagePx: clamp(Number(parsed.toleranceImagePx) || DEFAULT_GRIP_PREFERENCES.toleranceImagePx, 3, 20),
      sizeScreenPx: clamp(Number(parsed.sizeScreenPx) || DEFAULT_GRIP_PREFERENCES.sizeScreenPx, 4, 16),
    };
  } catch {
    return DEFAULT_GRIP_PREFERENCES;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Preferências do utilizador para os "Grips" das interseções de paredes
 * no módulo de Plantas. Persistidas em localStorage por user.id para sobreviverem
 * entre sessões no mesmo dispositivo/browser.
 */
export function useGripPreferences() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [prefs, setPrefs] = useState<GripPreferences>(() => readFromStorage(userId));

  // Re-hidratar quando o utilizador muda (login/logout)
  useEffect(() => {
    setPrefs(readFromStorage(userId));
  }, [userId]);

  // Sincronizar entre abas/janelas E entre instâncias na mesma aba.
  // - "storage" cobre alterações vindas de outra aba/janela.
  // - "grip-prefs:changed" (custom) cobre alterações na MESMA aba: assim, ao
  //   importar/abrir um novo plano (que monta novo PlanViewer) ou ao mudar as
  //   prefs no popover, todas as instâncias do hook refletem imediatamente,
  //   sem precisar recarregar a página.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const expectedKey = userId ? `${KEY_PREFIX}${userId}` : `${KEY_PREFIX}anon`;
    const onStorage = (e: StorageEvent) => {
      if (e.key === expectedKey) setPrefs(readFromStorage(userId));
    };
    const onCustom = () => setPrefs(readFromStorage(userId));
    const onVisibility = () => {
      if (document.visibilityState === "visible") setPrefs(readFromStorage(userId));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("grip-prefs:changed", onCustom as EventListener);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("grip-prefs:changed", onCustom as EventListener);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId]);

  const update = useCallback(
    (patch: Partial<GripPreferences>) => {
      setPrefs((prev) => {
        const next: GripPreferences = {
          show: patch.show ?? prev.show,
          toleranceImagePx: clamp(patch.toleranceImagePx ?? prev.toleranceImagePx, 3, 20),
          sizeScreenPx: clamp(patch.sizeScreenPx ?? prev.sizeScreenPx, 4, 16),
        };
        try {
          const key = userId ? `${KEY_PREFIX}${userId}` : `${KEY_PREFIX}anon`;
          localStorage.setItem(key, JSON.stringify(next));
          // Notifica outras instâncias do hook na mesma aba.
          window.dispatchEvent(
            new CustomEvent("grip-prefs:changed", { detail: { userId, prefs: next } })
          );
        } catch {
          /* ignore quota errors */
        }
        return next;
      });
    },
    [userId]
  );

  const reset = useCallback(() => update(DEFAULT_GRIP_PREFERENCES), [update]);

  return { prefs, update, reset };
}
