import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, X } from "lucide-react";
import { SPECIALTY_LABELS, SPECIALTY_ORDER, type SpecialtyType } from "@/types/especialidades";

interface SpecialtyPlanUploadFormProps {
  obraId: string;
  defaultSpecialty?: SpecialtyType;
  isUploading: boolean;
  onUpload: (data: {
    file: File;
    obraId: string;
    specialty_type: SpecialtyType;
    floor_level?: string;
    declared_scale?: string;
    observacoes?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function SpecialtyPlanUploadForm({
  obraId,
  defaultSpecialty,
  isUploading,
  onUpload,
  onCancel,
}: SpecialtyPlanUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [specialty, setSpecialty] = useState<SpecialtyType>(defaultSpecialty ?? "eletrica");
  const [floor, setFloor] = useState("");
  const [scale, setScale] = useState("");
  const [obs, setObs] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    await onUpload({
      file,
      obraId,
      specialty_type: specialty,
      floor_level: floor || undefined,
      declared_scale: scale || undefined,
      observacoes: obs || undefined,
    });
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Carregar planta de especialidade</CardTitle>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Especialidade *</Label>
              <Select value={specialty} onValueChange={(v) => setSpecialty(v as SpecialtyType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIALTY_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{SPECIALTY_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Piso / zona</Label>
              <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Ex: Piso 0, Cave, Cobertura" />
            </div>
            <div className="space-y-2">
              <Label>Escala declarada (opcional)</Label>
              <Input value={scale} onChange={(e) => setScale(e.target.value)} placeholder="Ex: 1:50, 1:100" />
            </div>
            <div className="space-y-2">
              <Label>Ficheiro *</Label>
              <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Notas opcionais sobre esta planta" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Carregar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
