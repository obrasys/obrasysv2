import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Ruler, CheckCircle, RotateCcw, Crosshair } from "lucide-react";

interface PlanCalibrationToolProps {
  points: Array<{ x: number; y: number }>;
  isCalibrating: boolean;
  onStartCalibration: () => void;
  onSaveCalibration: (realDistance: number, unidade: string) => void;
  onReset: () => void;
  currentCalibration: {
    pixels_per_meter: number;
    real_distance: number;
    unidade: string;
    status: string;
  } | null;
  isSaving: boolean;
}

export function PlanCalibrationTool({
  points,
  isCalibrating,
  onStartCalibration,
  onSaveCalibration,
  onReset,
  currentCalibration,
  isSaving,
}: PlanCalibrationToolProps) {
  const [realDistance, setRealDistance] = useState("");
  const [unidade, setUnidade] = useState("m");

  const handleSave = () => {
    const dist = parseFloat(realDistance);
    if (isNaN(dist) || dist <= 0) return;
    onSaveCalibration(dist, unidade);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Ruler className="w-4 h-4 text-primary" />
          Calibração de Escala
          {currentCalibration?.status === "valida" && (
            <Badge variant="default" className="text-[10px]">
              <CheckCircle className="w-3 h-3 mr-1" /> Calibrada
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentCalibration?.status === "valida" && !isCalibrating ? (
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Escala atual</p>
              <p className="text-sm font-semibold">
                {currentCalibration.real_distance} {currentCalibration.unidade} = referência definida
              </p>
              <p className="text-xs text-muted-foreground">
                {currentCalibration.pixels_per_meter.toFixed(1)} px/m
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={onStartCalibration}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Recalibrar
            </Button>
          </div>
        ) : !isCalibrating ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Defina a escala clicando em dois pontos de uma medida conhecida na planta (ex: uma cota).
            </p>
            <Button className="w-full" onClick={onStartCalibration}>
              <Crosshair className="w-4 h-4 mr-2" /> Iniciar Calibração
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={points.length >= 1 ? "default" : "secondary"} className="text-[10px]">
                  P1 {points.length >= 1 ? "✓" : "…"}
                </Badge>
                <Badge variant={points.length >= 2 ? "default" : "secondary"} className="text-[10px]">
                  P2 {points.length >= 2 ? "✓" : "…"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {points.length === 0 && "Clique no primeiro ponto da referência na planta"}
                {points.length === 1 && "Agora clique no segundo ponto"}
                {points.length === 2 && "Indique a distância real entre os dois pontos"}
              </p>
            </div>

            {points.length === 2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Distância real</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Ex: 3.50"
                      value={realDistance}
                      onChange={(e) => setRealDistance(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unidade</Label>
                    <Select value={unidade} onValueChange={setUnidade}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="cm">cm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={onReset}>
                    Anular
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleSave}
                    disabled={!realDistance || parseFloat(realDistance) <= 0 || isSaving}
                  >
                    {isSaving ? "A guardar..." : "Confirmar Escala"}
                  </Button>
                </div>
              </div>
            )}

            {points.length < 2 && (
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onReset}>
                Cancelar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
