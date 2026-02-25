import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';

interface EssencialStep3LucroEnvioProps {
  subtotal: number;
  margemLucro: number;
  onMargemChange: (v: number) => void;
  incluirIva: boolean;
  onIncluirIvaChange: (v: boolean) => void;
  enviarEmail: boolean;
  onEnviarEmailChange: (v: boolean) => void;
  onBack: () => void;
  onFinalize: () => void;
  isLoading?: boolean;
}

export function EssencialStep3LucroEnvio({
  subtotal,
  margemLucro,
  onMargemChange,
  incluirIva,
  onIncluirIvaChange,
  enviarEmail,
  onEnviarEmailChange,
  onBack,
  onFinalize,
  isLoading,
}: EssencialStep3LucroEnvioProps) {
  const lucroValor = subtotal * (margemLucro / 100);
  const totalSemIva = subtotal + lucroValor;
  const iva = incluirIva ? totalSemIva * 0.23 : 0;
  const totalFinal = totalSemIva + iva;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Slider de margem */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Margem de Lucro</Label>
            <span className="text-2xl font-bold text-primary">{margemLucro}%</span>
          </div>
          <Slider
            value={[margemLucro]}
            onValueChange={([v]) => onMargemChange(v)}
            min={0}
            max={40}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>20%</span>
            <span>40%</span>
          </div>
        </CardContent>
      </Card>

      {/* Resumo financeiro */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h3 className="font-semibold">Resumo Financeiro</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal dos trabalhos</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Lucro ({margemLucro}%)</span>
              <span>+{formatCurrency(lucroValor)}</span>
            </div>
            {incluirIva && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (23%)</span>
                <span>{formatCurrency(iva)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-lg">
              <span className="font-semibold">Total Final</span>
              <span className="font-bold">{formatCurrency(totalFinal)}</span>
            </div>
          </div>

          {/* Microcopy motivacional */}
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg p-3 text-sm">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Este orçamento pode gerar aproximadamente <strong>{formatCurrency(lucroValor)}</strong> de lucro.</span>
          </div>
        </CardContent>
      </Card>

      {/* Opções */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id="incluir-iva"
            checked={incluirIva}
            onCheckedChange={(v) => onIncluirIvaChange(!!v)}
          />
          <Label htmlFor="incluir-iva" className="cursor-pointer">
            Incluir IVA automaticamente (23%)
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="enviar-email"
            checked={enviarEmail}
            onCheckedChange={(v) => onEnviarEmailChange(!!v)}
          />
          <Label htmlFor="enviar-email" className="cursor-pointer">
            Enviar por email ao cliente
          </Label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button className="flex-1" size="lg" onClick={onFinalize} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A gerar...
            </>
          ) : (
            'Gerar Orçamento'
          )}
        </Button>
      </div>
    </div>
  );
}
