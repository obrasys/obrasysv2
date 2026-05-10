import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  ceilingHeightM: number;
  doorHeightM: number;
  onChange: (next: { ceilingHeightM: number; doorHeightM: number }) => void;
}

const CEILING_DEFAULT = 2.6;
const DOOR_DEFAULT = 2.0;

/**
 * Card de parâmetros usados pela Axia para calcular paredes e vãos.
 * Persistência via localStorage; o utilizador pode confirmar/ajustar.
 */
export function PlanAnalysisParametersCard({ ceilingHeightM, doorHeightM, onChange }: Props) {
  const [ceiling, setCeiling] = useState(String(ceilingHeightM));
  const [door, setDoor] = useState(String(doorHeightM));

  useEffect(() => { setCeiling(String(ceilingHeightM)); }, [ceilingHeightM]);
  useEffect(() => { setDoor(String(doorHeightM)); }, [doorHeightM]);

  const commit = () => {
    const c = Number(ceiling.replace(",", "."));
    const d = Number(door.replace(",", "."));
    onChange({
      ceilingHeightM: Number.isFinite(c) && c > 0 ? c : CEILING_DEFAULT,
      doorHeightM: Number.isFinite(d) && d > 0 ? d : DOOR_DEFAULT,
    });
  };

  const reset = () => {
    setCeiling(String(CEILING_DEFAULT));
    setDoor(String(DOOR_DEFAULT));
    onChange({ ceilingHeightM: CEILING_DEFAULT, doorHeightM: DOOR_DEFAULT });
  };

  return (
    <Card className="rounded-xl border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          Parâmetros de cálculo
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">
            usados em paredes, rodapé e vãos
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Pé direito (m)</Label>
            <Input
              type="number"
              step="0.05"
              min="1.5"
              max="6"
              value={ceiling}
              onChange={(e) => setCeiling(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Altura padrão das portas (m)</Label>
            <Input
              type="number"
              step="0.05"
              min="1.5"
              max="3"
              value={door}
              onChange={(e) => setDoor(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="default" className="h-9 flex-1" onClick={commit}>
              Recalcular
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={reset} title="Repor defaults (2.60 / 2.00)">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Defaults: pé direito <strong>2.60 m</strong> · porta <strong>2.00 m</strong>. Estes valores
          alimentam o quadro discriminativo e o quadro geral abaixo.
        </p>
      </CardContent>
    </Card>
  );
}
