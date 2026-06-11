import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, FileText, Pencil, AlertTriangle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import {
  DISCIPLINE_LABEL,
  FLOOR_LABEL,
  SHEET_TYPE_LABEL,
  type SheetDiscipline,
  type SheetType,
  type DetectedFloor,
} from "@/lib/plan-sheet-classification";
import { useSheetClassification, type ClassifiedPage } from "@/hooks/useSheetClassification";

interface Props {
  planImportId: string;
  onClassifyRequest: () => Promise<void> | void; // parent fornece as pages com imagens
  isClassifying?: boolean;
}

const DISCIPLINE_TONE: Record<SheetDiscipline, string> = {
  arquitetura: "bg-blue-100 text-blue-700 border-blue-200",
  estrutura: "bg-amber-100 text-amber-800 border-amber-200",
  mep: "bg-violet-100 text-violet-700 border-violet-200",
  outro: "bg-slate-100 text-slate-700 border-slate-200",
};

export function SheetsIdentifiedPanel({ planImportId, onClassifyRequest, isClassifying }: Props) {
  const { pages, isLoading, updatePage } = useSheetClassification(planImportId);
  const [editing, setEditing] = useState<ClassifiedPage | null>(null);

  if (isLoading) return null;

  const hasAnyClassified = pages.some((p) => p.classified_at);

  return (
    <Card className="rounded-xl border-primary/20">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Folhas identificadas
          {pages.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{pages.length}</Badge>
          )}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => onClassifyRequest()} disabled={isClassifying}>
          <Sparkles className="w-3 h-3 mr-1" />
          {hasAnyClassified ? "Reclassificar" : "Classificar com Axia"}
        </Button>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Ainda não há páginas carregadas para este projeto.
          </p>
        ) : (
          <div className="grid gap-2">
            {pages.map((p) => {
              const conf = p.classification_confidence ?? 0;
              return (
                <div
                  key={p.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/40 transition"
                >
                  <div className="w-10 h-12 rounded bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                    p{p.page_number}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold truncate">
                        {p.sheet_title || `Página ${p.page_number}`}
                      </p>
                      {p.drawing_code && (
                        <span className="text-[10px] text-muted-foreground">[{p.drawing_code}]</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.discipline && (
                        <Badge variant="outline" className={`text-[10px] ${DISCIPLINE_TONE[p.discipline]}`}>
                          {DISCIPLINE_LABEL[p.discipline]}
                        </Badge>
                      )}
                      {p.sheet_type && (
                        <Badge variant="outline" className="text-[10px]">
                          {SHEET_TYPE_LABEL[p.sheet_type]}
                        </Badge>
                      )}
                      {p.detected_floor && (
                        <Badge variant="secondary" className="text-[10px]">
                          {FLOOR_LABEL[p.detected_floor]}
                        </Badge>
                      )}
                      {p.use_for_validation_only ? (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <Eye className="w-2.5 h-2.5" /> Validação
                        </Badge>
                      ) : p.should_extract_quantities ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Quantitativos
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-0.5 text-muted-foreground">
                          <EyeOff className="w-2.5 h-2.5" /> Ignorar
                        </Badge>
                      )}
                      {p.classified_at && (
                        <span className="text-[10px] text-muted-foreground">
                          conf. {Math.round(conf * 100)}%
                        </span>
                      )}
                    </div>
                    {p.classification_warnings?.length > 0 && (
                      <div className="flex items-start gap-1 text-[10px] text-amber-700">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{p.classification_warnings.join(" · ")}</span>
                      </div>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(p)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar classificação · Página {editing?.page_number}</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditForm
              page={editing}
              onSave={async (updates) => {
                await updatePage.mutateAsync({ id: editing.id, updates });
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EditForm({
  page,
  onSave,
}: {
  page: ClassifiedPage;
  onSave: (updates: Partial<ClassifiedPage>) => Promise<void>;
}) {
  const [discipline, setDiscipline] = useState<SheetDiscipline>(page.discipline ?? "arquitetura");
  const [sheetType, setSheetType] = useState<SheetType>(page.sheet_type ?? "planta_arquitetura");
  const [floor, setFloor] = useState<DetectedFloor>(page.detected_floor ?? "generico");
  const [extract, setExtract] = useState(page.should_extract_quantities);
  const [validation, setValidation] = useState(page.use_for_validation_only);

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label className="text-xs">Disciplina</Label>
        <Select value={discipline} onValueChange={(v) => setDiscipline(v as SheetDiscipline)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(DISCIPLINE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label className="text-xs">Tipo de folha</Label>
        <Select value={sheetType} onValueChange={(v) => setSheetType(v as SheetType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(SHEET_TYPE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label className="text-xs">Piso</Label>
        <Select value={floor} onValueChange={(v) => setFloor(v as DetectedFloor)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(FLOOR_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between border rounded-md p-2.5">
        <Label className="text-xs">Usar para quantitativos</Label>
        <Switch checked={extract} onCheckedChange={setExtract} />
      </div>
      <div className="flex items-center justify-between border rounded-md p-2.5">
        <Label className="text-xs">Usar só para validação (alçados / cortes / pormenores)</Label>
        <Switch checked={validation} onCheckedChange={setValidation} />
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onSave({
              discipline,
              sheet_type: sheetType,
              detected_floor: floor,
              should_extract_quantities: extract,
              use_for_validation_only: validation,
            })
          }
        >
          Guardar
        </Button>
      </DialogFooter>
    </div>
  );
}
