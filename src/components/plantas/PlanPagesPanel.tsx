import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, Layers, Loader2, Sparkles } from "lucide-react";

interface Props {
  totalPages: number;
  currentPage: number;
  analyzedPages: number[]; // page numbers (1-indexed) already analyzed
  isAnalyzing: boolean;
  onSelectPage: (page: number) => void;
  onAnalyzeCurrentPage: () => void;
  onAnalyzeAllPending: () => void;
}

export function PlanPagesPanel({
  totalPages,
  currentPage,
  analyzedPages,
  isAnalyzing,
  onSelectPage,
  onAnalyzeCurrentPage,
  onAnalyzeAllPending,
}: Props) {
  if (totalPages <= 1) return null;

  const analyzedSet = new Set(analyzedPages);
  const pendingCount = totalPages - analyzedSet.size;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Folhas neste ficheiro
          <Badge variant="secondary" className="ml-auto">{analyzedSet.size}/{totalPages} analisadas</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="max-h-48 pr-2">
          <div className="space-y-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              const isCurrent = page === currentPage;
              const isAnalyzed = analyzedSet.has(page);
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => onSelectPage(page)}
                  className={`w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    isCurrent ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isAnalyzed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="font-medium">Folha {page}</span>
                    {isCurrent && <Badge variant="outline" className="text-[9px] px-1">atual</Badge>}
                  </span>
                  {isAnalyzed ? (
                    <span className="text-[10px] text-emerald-700">analisada</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">pendente</span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onAnalyzeCurrentPage}
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            Analisar folha atual ({currentPage})
          </Button>
          {pendingCount > 1 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onAnalyzeAllPending}
              disabled={isAnalyzing}
              className="w-full text-xs"
            >
              Analisar {pendingCount} folhas em falta
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
