import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Image, X, Loader2 } from "lucide-react";
import { DISCIPLINA_OPTIONS, type PlanDisciplina } from "@/types/plan-measurements";

interface PlanUploadFormProps {
  obraId: string;
  onUpload: (data: {
    file: File;
    obraId: string;
    disciplina: PlanDisciplina;
    dataPlanta?: string;
    observacoes?: string;
  }) => Promise<void>;
  isUploading: boolean;
  onCancel: () => void;
}

export function PlanUploadForm({ obraId, onUpload, isUploading, onCancel }: PlanUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [disciplina, setDisciplina] = useState<PlanDisciplina>("arquitetura");
  const [dataPlanta, setDataPlanta] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const handleSubmit = async () => {
    if (!file) return;
    await onUpload({ file, obraId, disciplina, dataPlanta: dataPlanta || undefined, observacoes: observacoes || undefined });
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
            <p className="text-xs text-muted-foreground mt-1">PDF, PNG ou JPG até 20MB</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            {isPdf ? <FileText className="w-8 h-8 text-red-500" /> : <Image className="w-8 h-8 text-blue-500" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Disciplina</Label>
            <Select value={disciplina} onValueChange={(v) => setDisciplina(v as PlanDisciplina)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISCIPLINA_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data da Planta</Label>
            <Input type="date" value={dataPlanta} onChange={(e) => setDataPlanta(e.target.value)} />
          </div>
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
          <Button onClick={handleSubmit} disabled={!file || isUploading}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Importar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
