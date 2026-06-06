import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Image, FileCode, X, Loader2 } from "lucide-react";
import { type PlanDisciplina } from "@/types/plan-measurements";
import { DISCIPLINE_LIST, DISCIPLINE_META } from "@/lib/plan-discipline";
import { cn } from "@/lib/utils";

interface PlanUploadFormProps {
  obraId?: string;
  budgetId?: string;
  onUpload: (data: {
    file: File;
    obraId?: string;
    budgetId?: string;
    disciplina: PlanDisciplina;
    dataPlanta?: string;
    observacoes?: string;
  }) => Promise<void>;
  isUploading: boolean;
  onCancel: () => void;
}

export function PlanUploadForm({ obraId, budgetId, onUpload, isUploading, onCancel }: PlanUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [disciplina, setDisciplina] = useState<PlanDisciplina | null>(null);
  const [dataPlanta, setDataPlanta] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const activeMeta = disciplina ? DISCIPLINE_META[disciplina] : null;

  // Lote 2.1: alinhar com o limite das edge functions (12 MB) para evitar 413 após upload.
  const MAX_FILE_BYTES = 12 * 1024 * 1024;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const f = acceptedFiles[0];
    const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!ALLOWED.includes(f.type)) {
      import("sonner").then(({ toast }) => toast.error("Este ficheiro não é suportado. Use PDF, PNG ou JPG."));
      return;
    }
    if (f.size === 0) {
      import("sonner").then(({ toast }) => toast.error("Não foi possível carregar o ficheiro. Verifique se o documento não está corrompido."));
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      import("sonner").then(({ toast }) => toast.error("O ficheiro excede o limite de 12 MB. Divida a planta por piso ou reduza a resolução."));
      return;
    }
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_BYTES,
  });

  const handleSubmit = async () => {
    if (!file || !disciplina) return;
    await onUpload({ file, obraId, budgetId, disciplina, dataPlanta: dataPlanta || undefined, observacoes: observacoes || undefined });
  };

  const isPdf = file?.type.includes("pdf");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Importar Planta</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              {isDragActive ? "Solte o ficheiro aqui" : "Arraste ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, PNG ou JPG até 12 MB</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            {isPdf ? <FileText className="w-8 h-8 text-destructive" /> : <Image className="w-8 h-8 text-primary" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Disciplina - escolha destacada */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Tipo de planta</Label>
          <p className="text-xs text-muted-foreground -mt-1">
            Escolha a disciplina para a Axia analisar apenas o que importa.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {DISCIPLINE_LIST.map((d) => {
              const Icon = d.icon;
              const active = disciplina === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDisciplina(d.value)}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 border rounded-xl text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", active ? "text-primary" : "text-foreground")}>
                    {d.label}
                  </span>
                </button>
              );
            })}
          </div>
          {activeMeta && (
            <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-md px-2 py-1.5 mt-1">
              <strong className="text-foreground">{activeMeta.label}:</strong> {activeMeta.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Data da Planta (opcional)</Label>
          <Input type="date" value={dataPlanta} onChange={(e) => setDataPlanta(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Notas sobre esta planta..."
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!file || !disciplina || isUploading}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Importar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
