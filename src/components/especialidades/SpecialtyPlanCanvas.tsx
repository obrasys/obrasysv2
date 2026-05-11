import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { SpecialtyDetectedElement, SpecialtyPlan } from "@/types/especialidades";

interface Props {
  plan: SpecialtyPlan;
  elements: SpecialtyDetectedElement[];
  /** Quando definido, cliques na imagem registam um novo elemento nestas coords (0..1). */
  onCanvasClick?: (xRel: number, yRel: number) => void;
}

/**
 * Visualizador minimal específico para Especialidades (Fase 1).
 * Renderiza imagem ou primeira página do PDF e desenha markers dos símbolos
 * em coordenadas relativas (0..1). PDFs são renderizados via PDF.js (já existente
 * no projeto via usePdfRenderer); aqui usamos imagem direta para JPG/PNG e iframe
 * apenas como fallback para PDF.
 */
export function SpecialtyPlanCanvas({ plan, elements, onCanvasClick }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.storage.from("plan-files").createSignedUrl(plan.file_path, 60 * 60);
      if (!cancelled) {
        setSrc(data?.signedUrl ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [plan.file_path]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onCanvasClick || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onCanvasClick(x, y);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] border rounded-xl bg-muted/20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!src) {
    return <div className="p-6 text-center text-muted-foreground border rounded-xl">Não foi possível carregar a planta.</div>;
  }

  const isPdf = plan.file_type === "pdf";

  return (
    <div
      ref={wrapRef}
      onClick={handleClick}
      className="relative w-full border rounded-xl overflow-hidden bg-muted/10 cursor-crosshair select-none"
      style={{ minHeight: "60vh" }}
    >
      {isPdf ? (
        <iframe src={src} className="w-full h-[80vh] pointer-events-none" title={plan.nome_ficheiro} />
      ) : (
        <img src={src} alt={plan.nome_ficheiro} className="w-full h-auto block pointer-events-none" />
      )}
      {/* Markers */}
      {elements.map((el) => {
        if (el.x_position == null || el.y_position == null) return null;
        const x = el.x_position * 100;
        const y = el.y_position * 100;
        return (
          <div
            key={el.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              title={el.label || el.symbol_type}
              className={`w-4 h-4 rounded-full border-2 ${
                el.review_required ? "bg-amber-400 border-amber-700" : "bg-primary border-primary-foreground"
              } shadow`}
            />
          </div>
        );
      })}
    </div>
  );
}
