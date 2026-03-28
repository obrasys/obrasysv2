import { useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UNIT_OPTIONS, ITEM_TYPE_CONFIG, type ItemType, type RequestPriority } from '@/types/project-resources';

export interface RDOMaterialRequestLine {
  id: string;
  free_text_item_name: string;
  item_type: ItemType;
  quantity: number;
  unit: string;
  priority: RequestPriority;
  notes: string;
}

interface RDOMaterialRequestsProps {
  requests: RDOMaterialRequestLine[];
  onChange: (requests: RDOMaterialRequestLine[]) => void;
}

export function RDOMaterialRequests({ requests, onChange }: RDOMaterialRequestsProps) {
  const addLine = () => {
    onChange([
      ...requests,
      {
        id: crypto.randomUUID(),
        free_text_item_name: '',
        item_type: 'material',
        quantity: 0,
        unit: 'un',
        priority: 'normal',
        notes: '',
      },
    ]);
  };

  const updateLine = (id: string, field: keyof RDOMaterialRequestLine, value: any) => {
    onChange(requests.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeLine = (id: string) => {
    onChange(requests.filter(r => r.id !== id));
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Material / Insumos / Ferramentas necessários para amanhã
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Registe o que será necessário no dia seguinte
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>

        {requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Nome do item (ex: 20 sacos de cimento)"
                      value={req.free_text_item_name}
                      onChange={e => updateLine(req.id, 'free_text_item_name', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(req.id)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Select
                    value={req.item_type}
                    onValueChange={v => updateLine(req.id, 'item_type', v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="material">🧱 Material</SelectItem>
                      <SelectItem value="insumo">🪣 Insumo</SelectItem>
                      <SelectItem value="tool">🔧 Ferramenta</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Qtd"
                    className="h-9 text-xs"
                    value={req.quantity || ''}
                    onChange={e => updateLine(req.id, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                  <Select
                    value={req.unit}
                    onValueChange={v => updateLine(req.id, 'unit', v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {UNIT_OPTIONS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={req.priority}
                    onValueChange={v => updateLine(req.id, 'priority', v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Adicione itens necessários para o dia seguinte
          </p>
        )}
      </CardContent>
    </Card>
  );
}
