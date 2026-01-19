import { useState } from "react";
import { Search, Check, X, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CadernoMatchBadge } from "./CadernoMatchBadge";
import { cn } from "@/lib/utils";
import type { CadernoItem } from "@/types/cadernos";

interface CadernoItemListProps {
  itens: CadernoItem[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onValidarItem?: (itemId: string) => void;
  onIgnorarItem?: (itemId: string) => void;
  readOnly?: boolean;
}

export function CadernoItemList({
  itens,
  selectedItemId,
  onSelectItem,
  onValidarItem,
  onIgnorarItem,
  readOnly = false,
}: CadernoItemListProps) {
  const [search, setSearch] = useState("");

  const filteredItens = itens.filter(item =>
    item.descricao_original.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "validado":
        return <Check className="w-4 h-4 text-green-500" />;
      case "ignorado":
        return <X className="w-4 h-4 text-muted-foreground" />;
      default:
        return <div className="w-4 h-4 border-2 border-muted-foreground/30 rounded-full" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Pesquisa */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar itens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredItens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum item encontrado</p>
            </div>
          ) : (
            filteredItens.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedItemId === item.id && "border-primary bg-primary/5",
                  selectedItemId !== item.id && "border-transparent hover:bg-muted",
                  item.status === "ignorado" && "opacity-50"
                )}
                onClick={() => onSelectItem(item.id)}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(item.status)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">
                      {item.descricao_original}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {item.unidade_detectada && (
                        <span className="px-1.5 py-0.5 bg-muted rounded">
                          {item.unidade_detectada}
                        </span>
                      )}
                      {item.quantidade_detectada !== null && (
                        <span>
                          Qtd: {item.quantidade_detectada}
                        </span>
                      )}
                      {item.match && (
                        <CadernoMatchBadge
                          confianca={item.match.nivel_confianca}
                          className="ml-auto"
                        />
                      )}
                    </div>
                  </div>

                  {!readOnly && item.status === "pendente" && (
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onValidarItem?.(item.id);
                        }}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onIgnorarItem?.(item.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Rodapé com contagem */}
      <div className="p-3 border-t bg-muted/50 text-center text-sm text-muted-foreground">
        {filteredItens.length} de {itens.length} itens
      </div>
    </div>
  );
}
