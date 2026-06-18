import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { SectionCard } from "@/components/patterns";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferences } from "@/contexts/PreferencesContext";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Automático", icon: Monitor },
];

export default function DefinicoesAparencia() {
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreferences } = usePreferences();

  return (
    <div className="space-y-6">
      <SectionCard title="Tema" description="Escolhe a aparência da interface.">
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border-subtle hover:border-primary/30 hover:bg-surface-sunken",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-text-muted",
                  )}
                >
                  <t.icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    active ? "text-primary" : "text-text-strong",
                  )}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Idioma e região" description="Idioma da interface, formato e fuso horário.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Idioma</Label>
            <Select
              value={preferences.language}
              onValueChange={(v) => updatePreferences({ language: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-PT">Português (PT)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="es-ES">Español (ES)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Moeda</Label>
            <Select
              value={preferences.currency}
              onValueChange={(v) => updatePreferences({ currency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="USD">USD — Dólar</SelectItem>
                <SelectItem value="GBP">GBP — Libra</SelectItem>
                <SelectItem value="BRL">BRL — Real</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fuso horário</Label>
            <Select
              value={preferences.timezone}
              onValueChange={(v) => updatePreferences({ timezone: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Lisbon">Europa/Lisboa</SelectItem>
                <SelectItem value="Europe/Madrid">Europa/Madrid</SelectItem>
                <SelectItem value="Atlantic/Azores">Atlântico/Açores</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Densidade da interface</Label>
            <Select defaultValue="comfortable" disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="comfortable">Confortável</SelectItem>
                <SelectItem value="spacious">Espaçoso</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-text-muted">Em breve.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
