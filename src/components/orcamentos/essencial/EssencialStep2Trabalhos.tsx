import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ArrowRight, ArrowLeft, Loader2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="grid lg:grid-cols-3 gap-6"
    >
      {/* Main area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Toggle */}
        <Card className="border-0 shadow-sm">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Switch checked={useTemplate} onCheckedChange={setUseTemplate} id="use-template" />
            <Label htmlFor="use-template" className="cursor-pointer text-sm font-medium">
              {useTemplate ? 'A usar Modelo' : 'Criar do Zero'}
            </Label>
          </CardContent>
        </Card>

        {/* Template selector */}
        <AnimatePresence>
          {useTemplate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pb-2">
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-5 pb-4 px-4 md:px-6 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-foreground">Itens de Trabalho</h3>
              <span className="text-xs text-muted-foreground">
                {items.length} item{items.length !== 1 ? 'ns' : ''}
              </span>
            </div>

            <AnimatePresence mode="popLayout">
              {items.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2 items-center group p-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden sm:block" />
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 text-center">
                    {idx + 1}
                  </span>
                  <Input
                    placeholder="Descrição do trabalho"
                    value={item.descricao}
                    onChange={(e) => updateItem(item.id, 'descricao', e.target.value)}
                    className="flex-1 h-10"
                  />
                  <div className="relative w-28 shrink-0">
                    <Input
                      type="number"
                      placeholder="0,00"
                      min={0}
                      value={item.valor || ''}
                      onChange={(e) => updateItem(item.id, 'valor', parseFloat(e.target.value) || 0)}
                      className="h-10 pr-7"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      €
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>

            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhum trabalho adicionado.</p>
                <p className="text-xs mt-1">Clique no botão abaixo para começar.</p>
              </div>
            )}

            <Button variant="outline" className="w-full border-dashed h-11" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Trabalho
            </Button>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="h-11">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button className="flex-1 h-11 font-semibold" disabled={!isValid} onClick={onNext}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sidebar - Resumo */}
      <div className="lg:col-span-1">
        <Card className="h-fit lg:sticky lg:top-6 border-0 shadow-lg overflow-hidden">
          <div className="h-1.5 bg-primary" />
          <CardContent className="pt-5 pb-5 space-y-4">
            <h3 className="font-bold text-base">Resumo</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-accent dark:text-accent">
                <span>Lucro ({margemLucro}%)</span>
                <span className="font-semibold tabular-nums">+{formatCurrency(lucroValor)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-lg">
                <span className="font-bold">Total</span>
                <motion.span
                  key={totalEstimado}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="font-black tabular-nums"
                >
                  {formatCurrency(totalEstimado)}
                </motion.span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-t pt-3">
              {items.length} trabalho{items.length !== 1 ? 's' : ''} · Margem {margemLucro}%
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
