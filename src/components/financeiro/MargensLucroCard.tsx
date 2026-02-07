import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TrendingUp, ChevronDown, ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react';

interface ArtigoDb {
  id: string;
  codigo: string | null;
  descricao: string;
  preco_base: number;
  margem_lucro_artigo: number;
  preco_unitario: number;
  quantidade: number;
}

interface ArtigoComMargem extends ArtigoDb {
  valor_lucro: number;
}

interface OrcamentoComMargens {
  id: string;
  titulo: string;
  status: string;
  totalBase: number;
  totalComMargem: number;
  totalLucro: number;
  artigos: ArtigoComMargem[];
}

export function MargensLucroCard() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ['margens-lucro', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar orçamentos com capítulos e artigos
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          id,
          titulo,
          status,
          capitulos:capitulos_orcamento(
            id,
            artigos:artigos_orcamento(
              id,
              codigo,
              descricao,
              preco_base,
              margem_lucro_artigo,
              preco_unitario,
              quantidade
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Processar dados para calcular margens
      return (data || []).map((orc): OrcamentoComMargens => {
        const artigos: ArtigoComMargem[] = [];
        let totalBase = 0;
        let totalComMargem = 0;

        (orc.capitulos || []).forEach((cap: { artigos?: ArtigoDb[] }) => {
          (cap.artigos || []).forEach((art) => {
            const precoBase = art.preco_base || art.preco_unitario;
            const margem = art.margem_lucro_artigo || 0;
            const valorBase = precoBase * art.quantidade;
            const valorComMargem = art.preco_unitario * art.quantidade;
            const valorLucro = valorComMargem - valorBase;

            if (margem > 0) {
              artigos.push({
                ...art,
                preco_base: precoBase,
                valor_lucro: valorLucro,
              });
            }

            totalBase += valorBase;
            totalComMargem += valorComMargem;
          });
        });

        return {
          id: orc.id,
          titulo: orc.titulo,
          status: orc.status,
          totalBase,
          totalComMargem,
          totalLucro: totalComMargem - totalBase,
          artigos,
        };
      }).filter(orc => orc.totalLucro > 0);
    },
    enabled: !!user?.id,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const toggleExpanded = (id: string) => {
    setExpanded(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    );
  };

  // Calcular totais globais
  const totais = orcamentos?.reduce(
    (acc, orc) => ({
      totalBase: acc.totalBase + orc.totalBase,
      totalComMargem: acc.totalComMargem + orc.totalComMargem,
      totalLucro: acc.totalLucro + orc.totalLucro,
    }),
    { totalBase: 0, totalComMargem: 0, totalLucro: 0 }
  ) || { totalBase: 0, totalComMargem: 0, totalLucro: 0 };

  const margemPercentualMedia = totais.totalBase > 0 
    ? ((totais.totalLucro / totais.totalBase) * 100).toFixed(1)
    : '0';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-primary">Margens de Lucro</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Ocultar
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Detalhes
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Resumo das margens de lucro aplicadas nos artigos dos orçamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo Global */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Valor Base Total</p>
            <p className="text-lg font-semibold">{formatCurrency(totais.totalBase)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Valor c/ Margem</p>
            <p className="text-lg font-semibold">{formatCurrency(totais.totalComMargem)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-accent/50">
            <p className="text-xs text-accent-foreground/70">Lucro Total</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(totais.totalLucro)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <p className="text-xs text-primary">Margem Média</p>
            <p className="text-lg font-bold text-primary">{margemPercentualMedia}%</p>
          </div>
        </div>

        {/* Detalhes por Orçamento */}
        {showDetails && orcamentos && orcamentos.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground">Por Orçamento</p>
            {orcamentos.map((orc) => (
              <Collapsible
                key={orc.id}
                open={expanded.includes(orc.id)}
                onOpenChange={() => toggleExpanded(orc.id)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {expanded.includes(orc.id) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">{orc.titulo}</span>
                      <Badge variant="outline" className="text-xs">
                        {orc.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {orc.artigos.length} artigos c/ margem
                      </span>
                      <span className="font-semibold text-primary">
                        +{formatCurrency(orc.totalLucro)}
                      </span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-6 pt-2 space-y-1">
                    {orc.artigos.map((art) => (
                      <div 
                        key={art.id} 
                        className="flex items-center justify-between py-1 px-3 text-xs rounded bg-muted/20"
                      >
                        <div className="flex-1 truncate">
                          <span className="text-muted-foreground">{art.codigo || '-'}</span>
                          <span className="mx-2">|</span>
                          <span>{art.descricao}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {art.margem_lucro_artigo}%
                          </Badge>
                          <span className="text-primary font-medium">
                            +{formatCurrency(art.valor_lucro)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        {showDetails && (!orcamentos || orcamentos.length === 0) && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhuma margem de lucro aplicada nos artigos
          </div>
        )}
      </CardContent>
    </Card>
  );
}
