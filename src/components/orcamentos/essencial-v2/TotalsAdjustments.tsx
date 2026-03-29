import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatEUR } from '@/types/orcamento-essencial';
import { calcPrecoVenda, calcLucro, MARGEM_TOOLTIP } from '@/lib/margin';
import { Scale, Info, TrendingUp, HelpCircle } from 'lucide-react';
import {
  TIPO_OBRA_FISCAL_CONFIG,
  TIPO_CLIENTE_FISCAL_CONFIG,
  TIPO_OPERACAO_FISCAL_CONFIG,
  type TipoObraFiscal,
  type TipoClienteFiscal,
  type TipoOperacaoFiscal,
} from '@/types/fiscal';
import { useFiscalEngine } from '@/hooks/useFiscalEngine';
import { useState, useEffect } from 'react';

const IVA_REGIMES = [
  { value: 23, label: 'IVA Normal', description: '23% — Regime geral' },
  { value: 6, label: 'IVA Reduzido', description: '6% — Reabilitação/habitação' },
  { value: 0, label: 'Autoliquidação', description: '0% — Subempreitada (art. 2º)' },
  { value: 13, label: 'IVA Intermédio', description: '13% — Taxa intermédia' },
];

interface Props {
  subtotalBase: number;
  marginPercent: number;
  contingencyPercent: number;
  discountPercent: number;
  vatPercent: number;
  onMarginChange: (v: number) => void;
  onContingencyChange: (v: number) => void;
  onDiscountChange: (v: number) => void;
  onVatChange: (v: number) => void;
}

export function TotalsAdjustments({
  subtotalBase,
  marginPercent,
  contingencyPercent,
  discountPercent,
  vatPercent,
  onMarginChange,
  onContingencyChange,
  onDiscountChange,
  onVatChange,
}: Props) {
  const { determinarRegimeFiscal } = useFiscalEngine();

  const [tipoObra, setTipoObra] = useState<TipoObraFiscal | undefined>(undefined);
  const [tipoCliente, setTipoCliente] = useState<TipoClienteFiscal | undefined>(undefined);
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiscal | undefined>(undefined);

  const fiscalResult = determinarRegimeFiscal({
    tipo_obra: tipoObra || null,
    tipo_cliente: tipoCliente || null,
    tipo_operacao: tipoOperacao || null,
  });

  // Auto-update VAT when fiscal context changes
  useEffect(() => {
    if (fiscalResult && (tipoObra || tipoCliente || tipoOperacao)) {
      onVatChange(fiscalResult.taxa_iva);
    }
  }, [fiscalResult?.taxa_iva, tipoObra, tipoCliente, tipoOperacao]);

  // Calculate with margin (real margin on sale price)
  const subtotalWithMargin = marginPercent > 0 ? calcPrecoVenda(subtotalBase, marginPercent) : subtotalBase;
  const lucro = marginPercent > 0 ? calcLucro(subtotalBase, marginPercent) : 0;

  const contingencyValue = subtotalWithMargin * (contingencyPercent / 100);
  const afterContingency = subtotalWithMargin + contingencyValue;
  const discountValue = afterContingency * (discountPercent / 100);
  const subtotalBeforeVat = afterContingency - discountValue;
  const vatValue = subtotalBeforeVat * (vatPercent / 100);
  const totalFinal = subtotalBeforeVat + vatValue;

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 md:p-8 shadow-sm space-y-8">
      <h2 className="text-lg md:text-xl font-bold text-foreground">Margem, IVA & Totais</h2>

      {/* Margin Section */}
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-base font-semibold text-foreground">Margem de Lucro</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{MARGEM_TOOLTIP}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Slider
                value={[marginPercent]}
                onValueChange={([v]) => onMarginChange(v)}
                min={0}
                max={50}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <Input
                  type="number"
                  min={0}
                  max={99.99}
                  step={0.5}
                  value={marginPercent}
                  onChange={(e) => onMarginChange(Math.min(99.99, parseFloat(e.target.value) || 0))}
                  className="w-20 h-9 text-sm text-center font-semibold"
                />
                <span className="text-sm font-medium text-muted-foreground">%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Custo base: {formatEUR(subtotalBase)} → Preço venda: {formatEUR(subtotalWithMargin)}
            </p>
          </div>

          <div className="text-center md:text-right px-4 py-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 min-w-[160px]">
            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
              Lucro previsto
            </p>
            <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 tabular-nums">
              {formatEUR(lucro)}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500">
              Valor interno — não aparece no orçamento
            </p>
          </div>
        </div>
      </div>

      {/* Fiscal Context - IVA Rules */}
      <div className="rounded-xl bg-primary/5 border border-primary/15 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Regime de IVA</h3>
        </div>

        {/* Quick IVA regime buttons */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Seleção rápida</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {IVA_REGIMES.map((regime) => (
              <button
                key={regime.value}
                type="button"
                onClick={() => {
                  onVatChange(regime.value);
                  setTipoObra(undefined);
                  setTipoCliente(undefined);
                  setTipoOperacao(undefined);
                }}
                className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                  vatPercent === regime.value && !tipoObra && !tipoCliente && !tipoOperacao
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
                }`}
              >
                <span className="block text-sm font-semibold text-foreground">{regime.label}</span>
                <span className="block text-xs text-muted-foreground">{regime.description}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Ou selecione o contexto fiscal para determinação automática:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de Obra</Label>
            <Select
              value={tipoObra || '_none_'}
              onValueChange={(v) => setTipoObra(v === '_none_' ? undefined : v as TipoObraFiscal)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="_none_">Não especificado</SelectItem>
                {Object.entries(TIPO_OBRA_FISCAL_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de Cliente</Label>
            <Select
              value={tipoCliente || '_none_'}
              onValueChange={(v) => setTipoCliente(v === '_none_' ? undefined : v as TipoClienteFiscal)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="_none_">Não especificado</SelectItem>
                {Object.entries(TIPO_CLIENTE_FISCAL_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de Operação</Label>
            <Select
              value={tipoOperacao || '_none_'}
              onValueChange={(v) => setTipoOperacao(v === '_none_' ? undefined : v as TipoOperacaoFiscal)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="_none_">Não especificado</SelectItem>
                {Object.entries(TIPO_OPERACAO_FISCAL_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {fiscalResult && (tipoObra || tipoCliente || tipoOperacao) && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Regime determinado</p>
              <p className="text-sm font-medium text-foreground">{fiscalResult.regime_nome}</p>
            </div>
            <span className="text-2xl font-black text-primary tabular-nums">{fiscalResult.taxa_iva}%</span>
          </div>
        )}

        {fiscalResult?.nota_legal && (tipoObra || tipoCliente || tipoOperacao) && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {fiscalResult.nota_legal}
            </p>
          </div>
        )}
      </div>

      {/* Adjustments + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left - Inputs */}
        <div className="space-y-5">
          <div>
            <Label className="text-sm text-muted-foreground">Imprevistos %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={contingencyPercent}
              onChange={(e) => onContingencyChange(parseFloat(e.target.value) || 0)}
              className="h-11 text-base mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">= {formatEUR(contingencyValue)}</p>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Desconto %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              className="h-11 text-base mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">= -{formatEUR(discountValue)}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">IVA %</Label>
              {fiscalResult && (tipoObra || tipoCliente || tipoOperacao) && (
                <Badge variant="secondary" className="text-[10px]">Auto</Badge>
              )}
            </div>
            <Input
              type="number"
              min={0}
              max={100}
              value={vatPercent}
              onChange={(e) => onVatChange(parseFloat(e.target.value) || 0)}
              className="h-11 text-base mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">IVA € = {formatEUR(vatValue)}</p>
          </div>
        </div>

        {/* Right - Summary lines */}
        <div className="flex flex-col justify-center space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Custo base (M.O. + Mat.)</span>
            <span className="font-medium tabular-nums">{formatEUR(subtotalBase)}</span>
          </div>
          {marginPercent > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+ Margem ({marginPercent}%)</span>
              <span className="font-medium tabular-nums text-emerald-600">{formatEUR(lucro)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal c/ margem</span>
            <span className="font-semibold tabular-nums">{formatEUR(subtotalWithMargin)}</span>
          </div>
          {contingencyPercent > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+ Imprevistos ({contingencyPercent}%)</span>
              <span className="font-medium tabular-nums">{formatEUR(contingencyValue)}</span>
            </div>
          )}
          {discountPercent > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">- Desconto ({discountPercent}%)</span>
              <span className="font-medium tabular-nums">-{formatEUR(discountValue)}</span>
            </div>
          )}
          <div className="border-t border-border pt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal antes de IVA</span>
            <span className="font-semibold tabular-nums">{formatEUR(subtotalBeforeVat)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA ({vatPercent}%)</span>
            <span className="font-medium tabular-nums">{formatEUR(vatValue)}</span>
          </div>
          <div className="border-t-2 border-foreground/20 pt-3 flex justify-between">
            <span className="text-base font-bold text-foreground">Total Final c/ IVA</span>
            <span className="text-xl font-black tabular-nums text-foreground">{formatEUR(totalFinal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
