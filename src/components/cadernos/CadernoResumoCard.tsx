import { FileText, CheckCircle2, AlertCircle, Euro, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERFIL_PRECO_CONFIG, type CadernoEstatisticas, type PerfilPreco } from "@/types/cadernos";

interface CadernoResumoCardProps {
  estatisticas: CadernoEstatisticas;
  perfilPreco: PerfilPreco;
  onPerfilChange: (perfil: PerfilPreco) => void;
  onCriarOrcamento: () => void;
  onGuardarRascunho?: () => void;
  onGuardarTemplate?: () => void;
  isLoading?: boolean;
}

export function CadernoResumoCard({
  estatisticas,
  perfilPreco,
  onPerfilChange,
  onCriarOrcamento,
  onGuardarRascunho,
  onGuardarTemplate,
  isLoading = false,
}: CadernoResumoCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{estatisticas.total_itens}</p>
                <p className="text-sm text-muted-foreground">Total de itens</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{estatisticas.percentagem_validados}%</p>
                <p className="text-sm text-muted-foreground">Validados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{estatisticas.confianca_media}%</p>
                <p className="text-sm text-muted-foreground">Confiança média</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Euro className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(estatisticas.valor_estimado)}</p>
                <p className="text-sm text-muted-foreground">Valor estimado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progresso de validação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progresso de Validação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={estatisticas.percentagem_validados} className="h-3" />
          
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Validados: {estatisticas.itens_validados}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span>Pendentes: {estatisticas.itens_pendentes}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted rounded-full" />
              <span>Ignorados: {estatisticas.itens_ignorados}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribuição de confiança */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Confiança</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{estatisticas.match_alto}</p>
              <p className="text-sm text-green-600">Match Alto</p>
              <p className="text-xs text-muted-foreground">≥80%</p>
            </div>
            <div className="flex-1 text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{estatisticas.match_medio}</p>
              <p className="text-sm text-yellow-600">Match Médio</p>
              <p className="text-xs text-muted-foreground">50-79%</p>
            </div>
            <div className="flex-1 text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{estatisticas.match_baixo}</p>
              <p className="text-sm text-red-600">Match Baixo</p>
              <p className="text-xs text-muted-foreground">&lt;50%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Perfil de preço */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perfil de Preço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={perfilPreco} onValueChange={(v) => onPerfilChange(v as PerfilPreco)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERFIL_PRECO_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{config.label}</span>
                    <span className="text-muted-foreground">({config.percentil})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {PERFIL_PRECO_CONFIG[perfilPreco].descricao}
          </p>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          onClick={onCriarOrcamento}
          disabled={isLoading || estatisticas.itens_validados === 0}
          className="w-full"
        >
          {isLoading ? "A criar orçamento..." : "Criar Orçamento"}
        </Button>

        <div className="flex gap-3">
          {onGuardarRascunho && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onGuardarRascunho}
              disabled={isLoading}
            >
              Guardar Rascunho
            </Button>
          )}
          {onGuardarTemplate && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onGuardarTemplate}
              disabled={isLoading}
            >
              Guardar como Template
            </Button>
          )}
        </div>
      </div>

      {/* Aviso se poucos validados */}
      {estatisticas.percentagem_validados < 50 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Validação incompleta</p>
            <p className="text-sm text-yellow-700">
              Menos de 50% dos itens foram validados. Recomendamos validar mais itens antes de criar o orçamento.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
