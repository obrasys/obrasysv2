// ─── Plant element types & symbol catalog ───

export type PlantElementCategory =
  | "paredes"
  | "pavimentos"
  | "tetos"
  | "cobertura"
  | "fachada"
  | "instalacoes"
  | "estrutura"
  | "vaos"
  | "outra";

export type PlantElementSubcategory =
  | "eletrica"
  | "hidraulica"
  | "esgoto"
  | "avac"
  | "gas"
  | "telecom";

export interface PlantSymbolType {
  id: string;
  category: PlantElementCategory;
  subcategory?: PlantElementSubcategory;
  name: string;
  label: string;
  /** Konva shape descriptor used to render the symbol */
  shape: SymbolShape;
  insertMode: "single" | "continuous";
  defaultRotation?: number;
  defaultScale?: number;
}

export type SymbolShape =
  | { type: "circle"; radius: number; fill: string; stroke: string }
  | { type: "rect"; width: number; height: number; fill: string; stroke: string }
  | { type: "cross"; size: number; stroke: string }
  | { type: "triangle"; size: number; fill: string; stroke: string }
  | { type: "diamond"; size: number; fill: string; stroke: string }
  | { type: "star"; size: number; fill: string; stroke: string };

export interface PlacedPlantElement {
  id: string;
  symbolTypeId: string;
  category: PlantElementCategory;
  subcategory?: PlantElementSubcategory;
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
  quantity?: number;
  note?: string;
  environment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveInsertTool {
  symbolTypeId: string | null;
  mode: "idle" | "inserting";
  continuous: boolean;
  insertedCount: number;
}

// ─── Category metadata ───

export interface CategoryMeta {
  id: PlantElementCategory;
  label: string;
  icon: string; // lucide icon name
  color: string;
  subcategories?: SubcategoryMeta[];
}

export interface SubcategoryMeta {
  id: PlantElementSubcategory;
  label: string;
  icon: string;
  symbols: PlantSymbolType[];
}

// ─── Symbol catalog ───

const ELETRICA_SYMBOLS: PlantSymbolType[] = [
  { id: "luz_teto", category: "instalacoes", subcategory: "eletrica", name: "Ponto de luz teto", label: "Luz teto", shape: { type: "circle", radius: 8, fill: "#fbbf24", stroke: "#b45309" }, insertMode: "continuous" },
  { id: "luz_parede", category: "instalacoes", subcategory: "eletrica", name: "Ponto de luz parede", label: "Luz parede", shape: { type: "circle", radius: 7, fill: "#fde68a", stroke: "#b45309" }, insertMode: "continuous" },
  { id: "interruptor_simples", category: "instalacoes", subcategory: "eletrica", name: "Interruptor simples", label: "Int. simples", shape: { type: "rect", width: 10, height: 14, fill: "#60a5fa", stroke: "#1d4ed8" }, insertMode: "continuous" },
  { id: "interruptor_duplo", category: "instalacoes", subcategory: "eletrica", name: "Interruptor duplo", label: "Int. duplo", shape: { type: "rect", width: 14, height: 14, fill: "#3b82f6", stroke: "#1d4ed8" }, insertMode: "continuous" },
  { id: "tomada_simples", category: "instalacoes", subcategory: "eletrica", name: "Tomada simples", label: "Tomada", shape: { type: "circle", radius: 7, fill: "#34d399", stroke: "#059669" }, insertMode: "continuous" },
  { id: "tomada_dupla", category: "instalacoes", subcategory: "eletrica", name: "Tomada dupla", label: "Tom. dupla", shape: { type: "diamond", size: 12, fill: "#34d399", stroke: "#059669" }, insertMode: "continuous" },
  { id: "quadro_eletrico", category: "instalacoes", subcategory: "eletrica", name: "Quadro elétrico", label: "Quadro", shape: { type: "rect", width: 16, height: 20, fill: "#f87171", stroke: "#b91c1c" }, insertMode: "single" },
];

const HIDRAULICA_SYMBOLS: PlantSymbolType[] = [
  { id: "agua_fria", category: "instalacoes", subcategory: "hidraulica", name: "Ponto de água fria", label: "Água fria", shape: { type: "triangle", size: 12, fill: "#38bdf8", stroke: "#0284c7" }, insertMode: "continuous" },
  { id: "agua_quente", category: "instalacoes", subcategory: "hidraulica", name: "Ponto de água quente", label: "Água quente", shape: { type: "triangle", size: 12, fill: "#fb923c", stroke: "#c2410c" }, insertMode: "continuous" },
  { id: "lavatorio", category: "instalacoes", subcategory: "hidraulica", name: "Lavatório", label: "Lavatório", shape: { type: "rect", width: 14, height: 10, fill: "#7dd3fc", stroke: "#0284c7" }, insertMode: "continuous" },
  { id: "duche", category: "instalacoes", subcategory: "hidraulica", name: "Duche", label: "Duche", shape: { type: "rect", width: 16, height: 16, fill: "#bae6fd", stroke: "#0284c7" }, insertMode: "single" },
  { id: "sanita", category: "instalacoes", subcategory: "hidraulica", name: "Sanita", label: "Sanita", shape: { type: "circle", radius: 8, fill: "#e0f2fe", stroke: "#0369a1" }, insertMode: "single" },
  { id: "maq_lavar", category: "instalacoes", subcategory: "hidraulica", name: "Máquina de lavar", label: "Máq. lavar", shape: { type: "rect", width: 14, height: 14, fill: "#a5f3fc", stroke: "#0891b2" }, insertMode: "single" },
];

const ESGOTO_SYMBOLS: PlantSymbolType[] = [
  { id: "esgoto_lavatorio", category: "instalacoes", subcategory: "esgoto", name: "Esgoto lavatório", label: "Esg. lav.", shape: { type: "cross", size: 10, stroke: "#78716c" }, insertMode: "continuous" },
  { id: "esgoto_sanita", category: "instalacoes", subcategory: "esgoto", name: "Esgoto sanita", label: "Esg. sanita", shape: { type: "cross", size: 12, stroke: "#57534e" }, insertMode: "continuous" },
  { id: "esgoto_duche", category: "instalacoes", subcategory: "esgoto", name: "Esgoto duche", label: "Esg. duche", shape: { type: "cross", size: 10, stroke: "#a8a29e" }, insertMode: "continuous" },
  { id: "ralo", category: "instalacoes", subcategory: "esgoto", name: "Ralo", label: "Ralo", shape: { type: "circle", radius: 6, fill: "#d6d3d1", stroke: "#78716c" }, insertMode: "continuous" },
];

const AVAC_SYMBOLS: PlantSymbolType[] = [
  { id: "unidade_interior", category: "instalacoes", subcategory: "avac", name: "Unidade interior", label: "UI", shape: { type: "rect", width: 20, height: 8, fill: "#a78bfa", stroke: "#7c3aed" }, insertMode: "single" },
  { id: "unidade_exterior", category: "instalacoes", subcategory: "avac", name: "Unidade exterior", label: "UE", shape: { type: "rect", width: 20, height: 12, fill: "#c4b5fd", stroke: "#7c3aed" }, insertMode: "single" },
  { id: "grelha_insuflacao", category: "instalacoes", subcategory: "avac", name: "Grelha insuflação", label: "Insufl.", shape: { type: "rect", width: 14, height: 6, fill: "#ddd6fe", stroke: "#8b5cf6" }, insertMode: "continuous" },
  { id: "grelha_retorno", category: "instalacoes", subcategory: "avac", name: "Grelha retorno", label: "Retorno", shape: { type: "rect", width: 14, height: 6, fill: "#ede9fe", stroke: "#8b5cf6" }, insertMode: "continuous" },
];

const GAS_SYMBOLS: PlantSymbolType[] = [
  { id: "ponto_gas", category: "instalacoes", subcategory: "gas", name: "Ponto de gás", label: "Gás", shape: { type: "diamond", size: 12, fill: "#fca5a5", stroke: "#dc2626" }, insertMode: "continuous" },
];

const TELECOM_SYMBOLS: PlantSymbolType[] = [
  { id: "tomada_dados", category: "instalacoes", subcategory: "telecom", name: "Tomada dados", label: "Dados", shape: { type: "star", size: 10, fill: "#6ee7b7", stroke: "#059669" }, insertMode: "continuous" },
  { id: "tomada_tv", category: "instalacoes", subcategory: "telecom", name: "Tomada TV", label: "TV", shape: { type: "star", size: 10, fill: "#a7f3d0", stroke: "#059669" }, insertMode: "continuous" },
  { id: "router_ponto", category: "instalacoes", subcategory: "telecom", name: "Router / ponto técnico", label: "Router", shape: { type: "rect", width: 12, height: 12, fill: "#d1fae5", stroke: "#059669" }, insertMode: "single" },
];

export const SYMBOL_CATALOG: CategoryMeta[] = [
  {
    id: "instalacoes",
    label: "Instalações",
    icon: "Plug",
    color: "#f59e0b",
    subcategories: [
      { id: "eletrica", label: "Elétrica", icon: "Zap", symbols: ELETRICA_SYMBOLS },
      { id: "hidraulica", label: "Hidráulica", icon: "Droplets", symbols: HIDRAULICA_SYMBOLS },
      { id: "esgoto", label: "Esgoto", icon: "ArrowDownToLine", symbols: ESGOTO_SYMBOLS },
      { id: "avac", label: "AVAC", icon: "Wind", symbols: AVAC_SYMBOLS },
      { id: "gas", label: "Gás", icon: "Flame", symbols: GAS_SYMBOLS },
      { id: "telecom", label: "Telecomunicações", icon: "Wifi", symbols: TELECOM_SYMBOLS },
    ],
  },
];

/** Flat lookup of all symbols */
export function getSymbolById(id: string): PlantSymbolType | undefined {
  for (const cat of SYMBOL_CATALOG) {
    for (const sub of cat.subcategories ?? []) {
      const found = sub.symbols.find((s) => s.id === id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Get all symbols flat */
export function getAllSymbols(): PlantSymbolType[] {
  const result: PlantSymbolType[] = [];
  for (const cat of SYMBOL_CATALOG) {
    for (const sub of cat.subcategories ?? []) {
      result.push(...sub.symbols);
    }
  }
  return result;
}
