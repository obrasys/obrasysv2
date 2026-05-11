import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { SpecialtyDetectedElement } from "@/types/especialidades";

interface Props {
  elements: SpecialtyDetectedElement[];
  onConfirm: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SpecialtyDetectedElementsPanel({ elements, onConfirm, onDelete }: Props) {
  const grouped = elements.reduce<Record<string, SpecialtyDetectedElement[]>>((acc, el) => {
    (acc[el.symbol_type] ||= []).push(el);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort();
  const totalReview = elements.filter((e) => e.review_required).length;

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Pontos encontrados</span>
          <Badge variant="outline">{elements.length}</Badge>
        </CardTitle>
        {totalReview > 0 && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {totalReview} por rever
          </p>
        )}
      </CardHeader>
      <CardContent>
        {elements.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Sem símbolos marcados. Escolha um símbolo na barra lateral e clique na planta para o adicionar.
          </p>
        ) : (
          <ScrollArea className="h-[360px] pr-2">
            <div className="space-y-3">
              {groupKeys.map((k) => {
                const items = grouped[k];
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">{k.replace(/_/g, " ")}</p>
                      <Badge variant="secondary" className="text-[10px]">{items.length} {items[0].unit}</Badge>
                    </div>
                    <div className="space-y-1">
                      {items.map((el) => (
                        <div key={el.id} className="flex items-center justify-between rounded border p-2 text-xs">
                          <div className="min-w-0">
                            <p className="truncate">{el.label || el.symbol_type}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Pág. {el.page_number}
                              {el.confidence_score != null ? ` · conf. ${(el.confidence_score * 100).toFixed(0)}%` : ""}
                              {el.review_required ? " · por rever" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {el.review_required && (
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onConfirm(el.id)} title="Confirmar">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete(el.id)} title="Apagar">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
