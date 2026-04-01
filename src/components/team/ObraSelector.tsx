import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

interface Obra {
  id: string;
  nome: string;
  estado: string;
}

interface Props {
  obras: Obra[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function ObraSelector({ obras, selected, onChange }: Props) {
  const [search, setSearch] = useState('');

  const filtered = obras.filter(o =>
    o.nome.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar obras..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma obra encontrada</p>
        ) : (
          filtered.map(obra => (
            <label
              key={obra.id}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={selected.includes(obra.id)}
                onCheckedChange={() => toggle(obra.id)}
              />
              <span className="text-sm flex-1 truncate">{obra.nome}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {obra.estado}
              </Badge>
            </label>
          ))
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">{selected.length} obra(s) selecionada(s)</p>
      )}
    </div>
  );
}
