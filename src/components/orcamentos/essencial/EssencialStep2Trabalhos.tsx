import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

export interface TrabalhoItem {
  id: string;
  descricao: string;
  valor: number;
}

interface EssencialStep2TrabalhosProps {
  items: TrabalhoItem[];
  onChange: (items: TrabalhoItem[]) => void;
  margemLucro: number;
  templates: Array<{ id: string; nome: string; itens_json: Array<{ descricao: string; valor: number }> }>;
  isLoadingTemplates?: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function EssencialStep2Trabalhos({
  items,
  onChange,
  margemLucro,
  templates,
  isLoadingTemplates,
  onNext,
  onBack,
}: EssencialStep2TrabalhosProps) {
  const [useTemplate, setUseTemplate] = useState(false);

  const subtotal = items.reduce((s, i) => s + (i.valor || 0), 0);
  const lucroValor = subtotal * (margemLucro / 100);
  const totalEstimado = subtotal + lucroValor;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

  const addItem = () => {
    onChange([...items, { id: crypto.randomUUID(), descricao: '', valor: 0 }]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof TrabalhoItem, value: string | number) => {
    onChange(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const loadTemplate = (template: typeof templates[0]) => {
    const newItems = template.itens_json.map((it) => ({
      id: crypto.randomUUID(),
      descricao: it.descricao,
      valor: it.valor,
    }));
    onChange(newItems);
  };

  const isValid = items.length > 0 && items.every((i) => i.descricao.trim() && i.valor > 0);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Toggle */}
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
          <Switch checked={useTemplate} onCheckedChange={setUseTemplate} id="use-template" />
          <Label htmlFor="use-template" className="cursor-pointer">
            {useTemplate ? 'Usar Modelo' : 'Criar do Zero'}
          </Label>
        </div>

        {/* Template selector */}
        {useTemplate && (
          <div className="space-y-2">
            {isLoadingTemplates ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length > 0 ? (
              <div className="grid gap-2">
                {templates.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => loadTemplate(t)}
                  >
                    <span className="font-medium">{t.nome}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {t.itens_json.length} itens
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum modelo disponível para este tipo de obra.
              </p>
            )}
          </div>
        )}

        {/* Items table */}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} className="flex gap-2 items-start">
              <span className="text-xs text-muted-foreground pt-3 w-6 shrink-0">{idx + 1}.</span>
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Descrição do trabalho"
                  value={item.descricao}
                  onChange={(e) => updateItem(item.id, 'descricao', e.target.value)}
                />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  placeholder="Valor €"
                  min={0}
                  value={item.valor || ''}
                  onChange={(e) => updateItem(item.id, 'valor', parseFloat(e.target.value) || 0)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" className="w-full" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Trabalho
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button className="flex-1" disabled={!isValid} onClick={onNext}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sidebar - Resumo */}
      <Card className="h-fit lg:sticky lg:top-6">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-lg">Resumo</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lucro ({margemLucro}%)</span>
              <span className="font-medium text-green-600">{formatCurrency(lucroValor)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-base">
              <span className="font-semibold">Total Estimado</span>
              <span className="font-bold">{formatCurrency(totalEstimado)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {items.length} trabalho{items.length !== 1 ? 's' : ''} adicionado{items.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
