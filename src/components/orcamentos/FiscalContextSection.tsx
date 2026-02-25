import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFiscalEngine } from '@/hooks/useFiscalEngine';
import {
  TIPO_OBRA_FISCAL_CONFIG,
  TIPO_CLIENTE_FISCAL_CONFIG,
  TIPO_OPERACAO_FISCAL_CONFIG,
  type TipoObraFiscal,
  type TipoClienteFiscal,
  type TipoOperacaoFiscal,
} from '@/types/fiscal';
import type { OrcamentoFormData } from '@/types/orcamentos';
import { Scale, Info } from 'lucide-react';

interface FiscalContextSectionProps {
  form: UseFormReturn<OrcamentoFormData>;
}

export function FiscalContextSection({ form }: FiscalContextSectionProps) {
  const { determinarRegimeFiscal, isLoading } = useFiscalEngine();

  const tipoObra = form.watch('tipo_obra') as TipoObraFiscal | undefined;
  const tipoCliente = form.watch('tipo_cliente') as TipoClienteFiscal | undefined;
  const tipoOperacao = form.watch('tipo_operacao') as TipoOperacaoFiscal | undefined;

  const resultado = determinarRegimeFiscal({
    tipo_obra: tipoObra || null,
    tipo_cliente: tipoCliente || null,
    tipo_operacao: tipoOperacao || null,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">Contexto Fiscal</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="tipo_obra"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Obra</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover">
                  {Object.entries(TIPO_OBRA_FISCAL_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo_cliente"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Cliente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover">
                  {Object.entries(TIPO_CLIENTE_FISCAL_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo_operacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Operação</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover">
                  {Object.entries(TIPO_OPERACAO_FISCAL_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {resultado && !isLoading && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Regime determinado:</span>
              <Badge variant="outline" className="font-medium">
                {resultado.regime_nome} — {resultado.taxa_iva}%
              </Badge>
            </div>
            {resultado.nota_legal && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {resultado.nota_legal}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
