import { Card } from "@/components/ui/card";
import type { PlantElement, PlantSheet } from "@/types/planta-leitura";

interface Props {
  sheets: PlantSheet[];
  elements: PlantElement[];
}

export function PlantSummaryCards({ sheets, elements }: Props) {
  const totalSheets = sheets.length;
  const sheetsDone = sheets.filter((s) => ["ready", "approved", "low_confidence"].includes(s.status)).length;
  const extracted = elements.length;
  const review = elements.filter((e) => e.status === "review" || e.status === "proposed").length;
  const approved = elements.filter((e) => e.status === "approved").length;
  const confidences = elements.map((e) => e.confidence).filter((c): c is number => c !== null);
  const avgConf = confidences.length
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
    : null;

  const cards = [
    { label: "Confiança média", value: avgConf !== null ? `${avgConf}%` : "—", tone: "primary" },
    { label: "Extraídos", value: extracted, tone: "default" },
    { label: "Para rever", value: review, tone: "warning" },
    { label: "Aprovados", value: approved, tone: "success" },
    { label: "Folhas", value: `${sheetsDone}/${totalSheets}`, tone: "default" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-4 rounded-2xl">
          <div className="text-xs text-muted-foreground">{c.label}</div>
          <div
            className={`text-2xl font-semibold mt-1 ${
              c.tone === "primary" ? "text-primary" :
              c.tone === "warning" ? "text-amber-600" :
              c.tone === "success" ? "text-emerald-600" : ""
            }`}
          >
            {c.value}
          </div>
        </Card>
      ))}
    </div>
  );
}
