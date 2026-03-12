import { useState } from 'react';
import { cn } from '@/lib/utils';
import { type AreaConfig } from '@/types/orcamento-essencial';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Pencil, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  areas: AreaConfig[];
  customAreas: AreaConfig[];
  onAddCustomArea: (area: AreaConfig) => void;
  onRemoveCustomArea: (key: string) => void;
  onEditCustomArea: (key: string, newLabel: string) => void;
  onAreaClick: (area: AreaConfig) => void;
  itemCounts: Record<string, number>;
}

export function AreasGrid({
  areas,
  customAreas,
  onAddCustomArea,
  onRemoveCustomArea,
  onEditCustomArea,
  onAreaClick,
  itemCounts,
}: Props) {
  const [showNewAreaDialog, setShowNewAreaDialog] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const allAreas = [...areas, ...customAreas];

  const handleAddArea = () => {
    if (!newAreaName.trim()) return;
    const key = `custom_${Date.now()}`;
    onAddCustomArea({ key, label: newAreaName.trim(), isCustom: true });
    setNewAreaName('');
    setShowNewAreaDialog(false);
  };

  const startEdit = (area: AreaConfig) => {
    setEditingKey(area.key);
    setEditLabel(area.label);
  };

  const confirmEdit = () => {
    if (editingKey && editLabel.trim()) {
      onEditCustomArea(editingKey, editLabel.trim());
    }
    setEditingKey(null);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg md:text-xl font-bold text-foreground">Áreas</h2>
        <Button size="sm" onClick={() => setShowNewAreaDialog(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova área
        </Button>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {allAreas.map((area) => {
          const count = itemCounts[area.key] || 0;
          const isEditing = editingKey === area.key;

          if (isEditing) {
            return (
              <div key={area.key} className="flex items-center gap-1">
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-9 w-40 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={confirmEdit}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          }

          return (
            <div key={area.key} className="group relative">
              <button
                onClick={() => onAreaClick(area)}
                className={cn(
                  'h-10 px-4 rounded-xl text-sm font-medium border transition-all',
                  'hover:border-primary/40 hover:bg-primary/5 cursor-pointer',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  count > 0
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-border bg-card text-foreground'
                )}
              >
                <span className="truncate max-w-[140px] inline-block align-middle">{area.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                    {count}
                  </Badge>
                )}
              </button>
              {area.isCustom && (
                <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(area); }}
                    className="h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveCustomArea(area.key); }}
                    className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={showNewAreaDialog} onOpenChange={setShowNewAreaDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Área</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome da nova área"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewAreaDialog(false)}>Cancelar</Button>
              <Button onClick={handleAddArea} disabled={!newAreaName.trim()}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
