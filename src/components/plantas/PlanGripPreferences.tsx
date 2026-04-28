import { Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useGripPreferences } from "@/hooks/useGripPreferences";

/**
 * Popover de preferências dos "Grips" das interseções de paredes.
 * Persiste mostrar/ocultar, tolerância de snap e tamanho visual no perfil
 * (localStorage por user.id), mantendo a configuração entre sessões.
 */
export function PlanGripPreferences() {
  const { prefs, update, reset } = useGripPreferences();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          <span className="hidden sm:inline">Grips</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold">Preferências de Grips</h4>
            <p className="text-xs text-muted-foreground">
              Marcadores nas interseções das paredes (cantos, junções e cruzamentos).
              Guardadas no seu perfil.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="grip-show" className="text-sm">Mostrar grips</Label>
              <p className="text-xs text-muted-foreground">Ocultar não afeta o snap.</p>
            </div>
            <Switch
              id="grip-show"
              checked={prefs.show}
              onCheckedChange={(v) => update({ show: v })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tolerância de snap</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {prefs.toleranceImagePx} px
              </span>
            </div>
            <Slider
              min={3}
              max={20}
              step={1}
              value={[prefs.toleranceImagePx]}
              onValueChange={([v]) => update({ toleranceImagePx: v })}
            />
            <p className="text-xs text-muted-foreground">
              Distância na imagem para detetar e encaixar interseções.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tamanho visual</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {prefs.sizeScreenPx} px
              </span>
            </div>
            <Slider
              min={4}
              max={16}
              step={1}
              value={[prefs.sizeScreenPx]}
              onValueChange={([v]) => update({ sizeScreenPx: v })}
            />
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset} className="gap-2">
              <RotateCcw className="w-3.5 h-3.5" />
              Repor predefinições
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
