import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plug, Zap, Droplets, ArrowDownToLine, Wind, Flame, Wifi, ChevronRight, ChevronLeft, Plus,
} from "lucide-react";
import { SYMBOL_CATALOG, type PlantSymbolType, type CategoryMeta, type SubcategoryMeta } from "@/types/plan-symbols";
import { PlanSymbolPreview } from "./PlanSymbolPreview";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Plug, Zap, Droplets, ArrowDownToLine, Wind, Flame, Wifi,
};

interface PlanSymbolPickerProps {
  disabled?: boolean;
  onSelectSymbol: (symbol: PlantSymbolType) => void;
}

export function PlanSymbolPicker({ disabled, onSelectSymbol }: PlanSymbolPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryMeta | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<SubcategoryMeta | null>(null);

  const handleReset = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  const handleSelectSymbol = (symbol: PlantSymbolType) => {
    onSelectSymbol(symbol);
    setOpen(false);
    handleReset();
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset(); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1.5" disabled={disabled}>
          <Plus className="w-3.5 h-3.5" />
          Elementos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" sideOffset={8}>
        {/* Level 1: Categories */}
        {!selectedCategory && (
          <div className="p-2">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Categoria</p>
            {SYMBOL_CATALOG.map((cat) => {
              const Icon = ICON_MAP[cat.icon] ?? Plug;
              return (
                <button
                  key={cat.id}
                  className="flex items-center justify-between w-full rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: cat.color }} />
                    {cat.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}

        {/* Level 2: Subcategories */}
        {selectedCategory && !selectedSubcategory && (
          <div className="p-2">
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 px-1"
              onClick={handleReset}
            >
              <ChevronLeft className="w-3 h-3" /> Voltar
            </button>
            <p className="text-xs font-medium px-2 py-1" style={{ color: selectedCategory.color }}>
              {selectedCategory.label}
            </p>
            <Separator className="my-1" />
            {selectedCategory.subcategories?.map((sub) => {
              const Icon = ICON_MAP[sub.icon] ?? Plug;
              return (
                <button
                  key={sub.id}
                  className="flex items-center justify-between w-full rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => setSelectedSubcategory(sub)}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {sub.label}
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1">{sub.symbols.length}</Badge>
                </button>
              );
            })}
          </div>
        )}

        {/* Level 3: Symbol types */}
        {selectedCategory && selectedSubcategory && (
          <div className="p-2">
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 px-1"
              onClick={() => setSelectedSubcategory(null)}
            >
              <ChevronLeft className="w-3 h-3" /> {selectedCategory.label}
            </button>
            <p className="text-xs font-medium px-2 py-1">
              {selectedSubcategory.label}
            </p>
            <Separator className="my-1" />
            <ScrollArea className="max-h-64">
              {selectedSubcategory.symbols.map((sym) => (
                <button
                  key={sym.id}
                  className="flex items-center gap-2.5 w-full rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => handleSelectSymbol(sym)}
                >
                  <PlanSymbolPreview shape={sym.shape} size={20} />
                  <div className="text-left">
                    <p className="text-xs font-medium">{sym.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {sym.insertMode === "continuous" ? "Inserção contínua" : "Inserção única"}
                    </p>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
