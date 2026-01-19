import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnaliseProgresso } from "@/types/cadernos";

interface CadernoProgressStepsProps {
  progresso: AnaliseProgresso;
}

const etapas = [
  { id: "leitura", label: "Leitura do ficheiro" },
  { id: "extracao", label: "Extração de texto" },
  { id: "analise", label: "Análise técnica" },
  { id: "classificacao", label: "Classificação construtiva" },
  { id: "matching", label: "Associação a artigos" },
  { id: "concluido", label: "Concluído" },
];

export function CadernoProgressSteps({ progresso }: CadernoProgressStepsProps) {
  const currentIndex = etapas.findIndex(e => e.id === progresso.etapa);

  return (
    <div className="space-y-6">
      {/* Steps */}
      <div className="space-y-4">
        {etapas.slice(0, -1).map((etapa, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={etapa.id} className="flex items-center gap-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  isComplete && "bg-green-500 text-white",
                  isCurrent && "bg-primary text-primary-foreground",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              
              <div className="flex-1">
                <p className={cn(
                  "font-medium",
                  isPending && "text-muted-foreground"
                )}>
                  {etapa.label}
                </p>
                {isCurrent && progresso.mensagem && (
                  <p className="text-sm text-muted-foreground">
                    {progresso.mensagem}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso geral</span>
          <span className="font-medium">{progresso.percentagem}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progresso.percentagem}%` }}
          />
        </div>
      </div>

      {/* Mensagem dinâmica */}
      {progresso.mensagem && (
        <div className="p-4 bg-muted rounded-lg text-center">
          <p className="text-sm font-medium">{progresso.mensagem}</p>
        </div>
      )}
    </div>
  );
}
