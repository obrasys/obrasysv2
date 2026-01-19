import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, FileSpreadsheet, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FICHEIRO_TIPOS_ACEITES, CADERNO_ORIGEM_CONFIG, type CadernoOrigem } from "@/types/cadernos";
import { cn } from "@/lib/utils";

interface CadernoUploadZoneProps {
  onSubmit: (data: { nome: string; origem: CadernoOrigem; ficheiro: File }) => void;
  isLoading?: boolean;
}

const getFileIcon = (type: string) => {
  if (type.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
  if (type.includes("spreadsheet") || type.includes("excel")) return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
  if (type.includes("xml")) return <File className="w-8 h-8 text-blue-500" />;
  return <FileText className="w-8 h-8 text-muted-foreground" />;
};

export function CadernoUploadZone({ onSubmit, isLoading }: CadernoUploadZoneProps) {
  const [nome, setNome] = useState("");
  const [origem, setOrigem] = useState<CadernoOrigem>("cliente");
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      // Auto-preencher nome com nome do ficheiro (sem extensão)
      if (!nome) {
        const fileName = f.name.replace(/\.[^/.]+$/, "");
        setNome(fileName);
      }
    }
  }, [nome]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/xml": [".xml"],
      "text/xml": [".xml"],
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  const handleSubmit = () => {
    if (!file || !nome || !origem) return;
    onSubmit({ nome, origem, ficheiro: file });
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Zona de Upload */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          !isDragActive && "border-muted-foreground/25 hover:border-primary/50",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        {file ? (
          <div className="flex items-center justify-center gap-4">
            {getFileIcon(file.type)}
            <div className="text-left">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? "Solte o ficheiro aqui" : "Arraste um ficheiro ou clique para selecionar"}
            </p>
            <p className="text-sm text-muted-foreground">
              Formatos aceites: PDF, DOCX, XLSX, XML (BC3)
            </p>
          </>
        )}
      </div>

      {/* Formulário */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Caderno</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Caderno de Encargos - Obra X"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem">Origem</Label>
            <Select
              value={origem}
              onValueChange={(v) => setOrigem(v as CadernoOrigem)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CADERNO_ORIGEM_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!file || !nome || isLoading}
            className="w-full"
          >
            {isLoading ? "A processar..." : "Analisar Documento"}
          </Button>
        </CardContent>
      </Card>

      {/* Legenda de formatos */}
      <div className="flex flex-wrap gap-3 justify-center text-sm text-muted-foreground">
        {Object.entries(FICHEIRO_TIPOS_ACEITES).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1">
            {getFileIcon(type)}
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
