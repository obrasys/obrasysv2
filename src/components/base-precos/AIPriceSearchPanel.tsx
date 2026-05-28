import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Search, Loader2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useAIPriceSearch, type AISearchResult } from "@/hooks/useAIPriceSearch";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_SEARCHES = [
  "Cimento Portland", "Aço A500", "Tijolo térmico", "Tinta plástica",
  "Isolamento XPS", "Tubo PVC", "Betão pronto C25/30", "Cerâmica pavimento",
];

export function AIPriceSearchPanel() {
  const [query, setQuery] = useState("");
  const { search, isSearching, results, clear } = useAIPriceSearch();
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const handleSearch = () => {
    if (query.trim()) search(query);
  };

  const handleQuickSearch = (term: string) => {
    setQuery(term);
    search(term);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--primary))]" />
          <Input
            placeholder="Pesquisar preços com Axia™ - ex: cimento, aço, betão..."
            className="pl-10 h-11 bg-background border-border"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="h-11 px-6"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Pesquisar
            </>
          )}
        </Button>
      </div>

      {/* Quick Search Tags */}
      {!results && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Sugestões:</span>
          {QUICK_SEARCHES.map((term) => (
            <button
              key={term}
              onClick={() => handleQuickSearch(term)}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-8"
          >
            <div className="relative">
              <Sparkles className="h-8 w-8 text-[hsl(var(--primary))] animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">
              A Axia™ está a pesquisar preços de mercado...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {results && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Summary */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-sm">
                <p className="text-foreground">{results.resumo}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Referência: {results.data_referencia} · {results.materials.length} materiais encontrados
                </p>
              </div>
            </div>

            {/* Materials Grid */}
            <div className="grid gap-2">
              {results.materials.map((item, idx) => (
                <AIResultCard
                  key={idx}
                  item={item}
                  isExpanded={expandedItem === idx}
                  onToggle={() => setExpandedItem(expandedItem === idx ? null : idx)}
                />
              ))}
            </div>

            {/* Clear */}
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
                Limpar resultados
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AIResultCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: AISearchResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const getConfidenceColor = (c: number) => {
    if (c >= 75) return "text-green-600 bg-green-50 border-green-200";
    if (c >= 50) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const spread = item.preco_maximo - item.preco_minimo;
  const spreadPercent = item.preco_medio > 0 ? (spread / item.preco_medio) * 100 : 0;

  return (
    <Card
      className={cn(
        "transition-all cursor-pointer hover:shadow-sm border-border",
        isExpanded && "ring-1 ring-primary/20"
      )}
      onClick={onToggle}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left - Name & Category */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{item.nome}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                {item.categoria}
              </Badge>
            </div>
            {item.descricao && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.descricao}</p>
            )}
          </div>

          {/* Center - Price */}
          <div className="text-right shrink-0">
            <div className="font-semibold text-sm">
              €{item.preco_medio.toFixed(2)}<span className="text-xs text-muted-foreground font-normal">/{item.unidade}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              €{item.preco_minimo.toFixed(2)} – €{item.preco_maximo.toFixed(2)}
            </div>
          </div>

          {/* Right - Confidence & Expand */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", getConfidenceColor(item.confianca))}>
              {item.confianca}%
            </span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Mínimo</span>
                  <p className="font-medium">€{item.preco_minimo.toFixed(2)}/{item.unidade}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Máximo</span>
                  <p className="font-medium">€{item.preco_maximo.toFixed(2)}/{item.unidade}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Variação</span>
                  <p className="font-medium flex items-center gap-1">
                    {spreadPercent > 30 ? (
                      <TrendingUp className="h-3 w-3 text-yellow-500" />
                    ) : spreadPercent < 10 ? (
                      <Minus className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-muted-foreground" />
                    )}
                    {spreadPercent.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fonte</span>
                  <p className="font-medium">{item.fonte}</p>
                </div>
                {item.notas && (
                  <div className="col-span-full">
                    <span className="text-muted-foreground">Notas</span>
                    <p className="text-foreground">{item.notas}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
