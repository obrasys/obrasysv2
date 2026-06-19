import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ALLOWED_PLANT_EXTENSIONS, validatePlantFile } from "@/hooks/usePlantLeitura";

interface Props {
  onFile: (file: File) => void;
  uploading?: boolean;
  progress?: string;
}

export function PlantUploadZone({ onFile, uploading, progress }: Props) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = useCallback((f: File | null | undefined) => {
    if (!f) return;
    const err = validatePlantFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onFile(f);
  }, [onFile]);

  return (
    <Card
      className={`relative border-2 border-dashed rounded-2xl p-10 transition-colors ${
        drag ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="flex flex-col items-center justify-center text-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center">
          <Upload className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Carregue uma planta para iniciar a leitura assistida da Axia.</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Arraste o ficheiro ou clique para escolher. Formatos aceites:{" "}
            <strong>{ALLOWED_PLANT_EXTENSIONS.join(", ").toUpperCase()}</strong> · até <strong>20MB</strong>.
          </p>
        </div>
        <label>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.dxf,.png,.jpg,.jpeg"
            disabled={uploading}
            onChange={(e) => handle(e.target.files?.[0])}
          />
          <Button asChild disabled={uploading}>
            <span>{uploading ? "A processar..." : "Escolher ficheiro"}</span>
          </Button>
        </label>
        {progress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" /> {progress}
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive max-w-md">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
