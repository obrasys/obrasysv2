import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Orcamento } from '@/types/orcamentos';
import { Euro, TrendingUp, Package, Calculator } from 'lucide-react';
 import { useFiscalEngine } from '@/hooks/useFiscalEngine';

interface ResumoTotalProps {
  orcamento: Orcamento;
}

export function ResumoTotal({ orcamento }: ResumoTotalProps) {
   const { useOrcamentoContextoFiscal } = useFiscalEngine();
   const { data: contextoFiscal } = useOrcamentoContextoFiscal(orcamento.id);
 
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const custosIndiretosTotal =
    (orcamento.custos_indiretos?.estaleiro || 0) +
    (orcamento.custos_indiretos?.seguros || 0) +
    (orcamento.custos_indiretos?.licenciamento || 0);

  const subtotal = orcamento.valor_total + custosIndiretosTotal;
  const margemPct = orcamento.margem_lucro;
  const valorFinal = margemPct > 0 && margemPct < 100
    ? subtotal / (1 - margemPct / 100)
    : subtotal;
  const margemValor = valorFinal - subtotal;
 
   // Calculate IVA using fiscal engine
   const taxaIVA = contextoFiscal?.taxa_iva ?? 23;
   const valorIVA = valorFinal * (taxaIVA / 100);
   const valorComIVA = valorFinal + valorIVA;

  // Contar artigos
  const totalArtigos = (orcamento.capitulos || []).reduce(
    (acc, cap) => acc + (cap.artigos?.length || 0),
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Resumo do Orçamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            Total de Artigos
          </span>
          <span className="font-medium">{totalArtigos}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Euro className="h-4 w-4" />
            Valor Base
          </span>
          <span className="font-medium">{formatCurrency(orcamento.valor_total)}</span>
        </div>

        {custosIndiretosTotal > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Custos Indiretos</p>
            {orcamento.custos_indiretos?.estaleiro > 0 && (
              <div className="flex justify-between text-sm pl-4">
                <span className="text-muted-foreground">Estaleiro</span>
                <span>{formatCurrency(orcamento.custos_indiretos.estaleiro)}</span>
              </div>
            )}
            {orcamento.custos_indiretos?.seguros > 0 && (
              <div className="flex justify-between text-sm pl-4">
                <span className="text-muted-foreground">Seguros</span>
                <span>{formatCurrency(orcamento.custos_indiretos.seguros)}</span>
              </div>
            )}
            {orcamento.custos_indiretos?.licenciamento > 0 && (
              <div className="flex justify-between text-sm pl-4">
                <span className="text-muted-foreground">Licenciamento</span>
                <span>{formatCurrency(orcamento.custos_indiretos.licenciamento)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Margem ({orcamento.margem_lucro}%)
          </span>
          <span className="font-medium text-green-600">{formatCurrency(margemValor)}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t-2 border-primary/20">
          <span className="font-semibold text-lg">Total Final</span>
          <span className="font-bold text-xl text-primary">{formatCurrency(valorFinal)}</span>
        </div>
         
         {/* IVA Information */}
         <div className="flex items-center justify-between text-sm pt-2">
           <span className="text-muted-foreground">IVA ({taxaIVA}%)</span>
           <span className="font-medium">{formatCurrency(valorIVA)}</span>
         </div>
         
         <div className="flex items-center justify-between pt-2 border-t">
           <span className="font-semibold">Total c/ IVA</span>
           <span className="font-bold text-primary">{formatCurrency(valorComIVA)}</span>
         </div>
      </CardContent>
    </Card>
  );
}
