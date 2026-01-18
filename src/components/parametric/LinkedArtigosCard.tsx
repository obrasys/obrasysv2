import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link2, Unlink, Lock } from 'lucide-react';

interface LinkedArtigo {
  id: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  unidade: string;
  parametric_rules?: {
    rule_name: string;
    unit: string;
  } | null;
}

interface LinkedArtigosCardProps {
  artigos: LinkedArtigo[];
  isLoading?: boolean;
  onUnlink?: (artigoId: string) => void;
  disabled?: boolean;
}

export function LinkedArtigosCard({
  artigos,
  isLoading,
  onUnlink,
  disabled,
}: LinkedArtigosCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  if (disabled) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Artigos Linkados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Selecione um elemento para ver os artigos linkados
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Artigos Linkados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Artigos Linkados
          <Badge variant="secondary" className="ml-auto">
            {artigos.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {artigos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum artigo linkado a este elemento
          </p>
        ) : (
          <div className="space-y-3">
            {artigos.map((artigo) => (
              <div
                key={artigo.id}
                className="p-3 rounded-lg border bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{artigo.descricao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        {artigo.quantidade.toFixed(2)} {artigo.unidade}
                      </Badge>
                      {artigo.parametric_rules && (
                        <span className="text-xs text-muted-foreground">
                          via {artigo.parametric_rules.rule_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(artigo.valor_total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(artigo.preco_unitario)}/{artigo.unidade}
                    </p>
                  </div>
                </div>
                {onUnlink && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-muted-foreground hover:text-destructive"
                    onClick={() => onUnlink(artigo.id)}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Desvincular
                  </Button>
                )}
              </div>
            ))}

            {artigos.length > 0 && (
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total:</span>
                  <span>
                    {formatCurrency(artigos.reduce((sum, a) => sum + a.valor_total, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
