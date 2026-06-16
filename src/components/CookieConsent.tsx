import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "obrasys_cookie_consent_v1";

interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const persist = (state: ConsentState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
    setVisible(false);
    setPreferencesOpen(false);
  };

  const acceptAll = () =>
    persist({
      necessary: true,
      analytics: true,
      marketing: true,
      decidedAt: new Date().toISOString(),
    });

  const rejectAll = () =>
    persist({
      necessary: true,
      analytics: false,
      marketing: false,
      decidedAt: new Date().toISOString(),
    });

  const savePreferences = () =>
    persist({
      necessary: true,
      analytics,
      marketing,
      decidedAt: new Date().toISOString(),
    });

  if (!visible) return null;

  return (
    <>
      <div
        role="dialog"
        aria-live="polite"
        aria-label="Aviso de cookies"
        className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 pointer-events-none"
      >
        <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="flex-1 text-sm text-foreground">
              <p className="font-semibold mb-1">Nós valorizamos a sua privacidade</p>
              <p className="text-muted-foreground leading-relaxed">
                Utilizamos cookies essenciais para o funcionamento da plataforma e, com o seu
                consentimento, cookies de análise para melhorar a experiência. Pode aceitar,
                rejeitar ou personalizar as suas preferências a qualquer momento.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch sm:w-44">
              <Button size="sm" onClick={acceptAll} className="flex-1 sm:flex-none">
                Aceitar todos
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={rejectAll}
                className="flex-1 sm:flex-none"
              >
                Rejeitar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreferencesOpen(true)}
                className="flex-1 sm:flex-none"
              >
                Personalizar
              </Button>
            </div>
            <button
              aria-label="Fechar"
              onClick={rejectAll}
              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted sm:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preferências de cookies</DialogTitle>
            <DialogDescription>
              Escolha que tipos de cookies pretende autorizar. Pode alterar a sua escolha mais
              tarde nas Definições.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label className="font-semibold">Essenciais</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Necessários para autenticação, segurança e funcionamento da aplicação. Não
                  podem ser desativados.
                </p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="analytics" className="font-semibold">
                  Análise e desempenho
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Ajudam-nos a entender como a plataforma é utilizada para melhorarmos a
                  experiência.
                </p>
              </div>
              <Switch id="analytics" checked={analytics} onCheckedChange={setAnalytics} />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="marketing" className="font-semibold">
                  Marketing
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Utilizados para mostrar comunicações relevantes sobre novidades e ofertas.
                </p>
              </div>
              <Switch id="marketing" checked={marketing} onCheckedChange={setMarketing} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={rejectAll}>
              Rejeitar todos
            </Button>
            <Button onClick={savePreferences}>Guardar preferências</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
