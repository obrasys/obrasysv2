import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useSpecialtySymbols } from "@/hooks/useSpecialtySymbols";
import type { SpecialtySymbol, SpecialtyType } from "@/types/especialidades";

interface Props {
  specialtyType: SpecialtyType;
  selectedKey?: string | null;
  onSelect: (symbol: SpecialtySymbol) => void;
}

export function SpecialtySymbolPicker({ specialtyType, selectedKey, onSelect }: Props) {
  const { data: symbols = [], isLoading } = useSpecialtySymbols(specialtyType);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return symbols;
    return symbols.filter(
      (s) => s.symbol_name.toLowerCase().includes(t) || s.symbol_key.toLowerCase().includes(t),
    );
  }, [symbols, q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar símbolo…"
          className="pl-7 h-8 text-xs"
        />
      </div>
      <ScrollArea className="h-[280px] pr-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground p-2">A carregar símbolos…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">Nenhum símbolo.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {filtered.map((s) => {
              const active = s.symbol_key === selectedKey;
              return (
                <Button
                  key={s.id}
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className="justify-between h-auto py-2"
                  onClick={() => onSelect(s)}
                >
                  <span className="text-left">
                    <span className="block text-xs font-medium">{s.symbol_name}</span>
                    <span className="block text-[10px] text-muted-foreground">{s.symbol_key}</span>
                  </span>
                  <Badge variant="outline" className="text-[9px] ml-2">{s.unit}</Badge>
                </Button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
