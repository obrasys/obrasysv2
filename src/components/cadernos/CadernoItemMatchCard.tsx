import { useState } from "react";
import { Check, X, Edit2, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CadernoMatchBadge } from "./CadernoMatchBadge";
import { cn } from "@/lib/utils";
import type { CadernoItem, CadernoItemMatch } from "@/types/cadernos";

interface CadernoItemMatchCardProps {
  item: CadernoItem;
  onValidar: (validado: boolean, matchData?: Partial<CadernoItemMatch>) => void;
  onIgnorar: () => void;
  onTrocarArtigo?: (novoArtigoId: string) => void;
  artigos?: Array<{ id: string; codigo: string; descricao: string; unidade: string; preco_unitario: number }>;
  readOnly?: boolean;
}

export function CadernoItemMatchCard({
  item,
  onValidar,
  onIgnorar,
  onTrocarArtigo,
  artigos = [],
  readOnly = false,
}: CadernoItemMatchCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMatch, setEditedMatch] = useState<Partial<CadernoItemMatch>>({});
  const [searchArtigo, setSearchArtigo] = useState("");
  const [showArtigoSearch, setShowArtigoSearch] = useState(false);

  const match = item.match;

  const handleAccept = () => {
    onValidar(true, editedMatch);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedMatch({
      unidade_sugerida: match?.unidade_sugerida || item.unidade_detectada,
      preco_estimado: match?.preco_estimado || 0,
      observacoes: match?.observacoes || "",
    });
  };

  const handleSaveEdit = () => {
    onValidar(true, editedMatch);
    setIsEditing(false);
  };

  const handleSelectArtigo = (artigo: typeof artigos[0]) => {
    if (onTrocarArtigo) {
      onTrocarArtigo(artigo.id);
    }
    setEditedMatch(prev => ({
      ...prev,
      artigo_base_id: artigo.id,
      unidade_sugerida: artigo.unidade,
      preco_estimado: artigo.preco_unitario,
    }));
    setShowArtigoSearch(false);
  };

  const filteredArtigos = artigos.filter(a =>
    a.descricao.toLowerCase().includes(searchArtigo.toLowerCase()) ||
    a.codigo.toLowerCase().includes(searchArtigo.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Card className={cn(
      "transition-all",
      item.status === "validado" && "border-green-500/50 bg-green-50/50",
      item.status === "ignorado" && "opacity-50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base font-medium leading-snug">
            {item.descricao_original}
          </CardTitle>
          {match && <CadernoMatchBadge confianca={match.nivel_confianca} />}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Texto original expandível */}
        {item.texto_original && item.texto_original !== item.descricao_original && (
          <details className="group">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              Ver texto original completo
            </summary>
            <p className="mt-2 text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">
              {item.texto_original}
            </p>
          </details>
        )}

        {/* Dados detectados */}
        <div className="flex flex-wrap gap-4 text-sm">
          {item.unidade_detectada && (
            <div>
              <span className="text-muted-foreground">Unidade: </span>
              <span className="font-medium">{item.unidade_detectada}</span>
            </div>
          )}
          {item.quantidade_detectada !== null && (
            <div>
              <span className="text-muted-foreground">Quantidade: </span>
              <span className="font-medium">{item.quantidade_detectada}</span>
            </div>
          )}
          {item.classificacao?.tipo_trabalho && (
            <div>
              <span className="text-muted-foreground">Tipo: </span>
              <span className="font-medium">{item.classificacao.tipo_trabalho}</span>
            </div>
          )}
        </div>

        {/* Sugestão automática */}
        {match && !isEditing && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Sugestão do Sistema
            </h4>

            {match.artigo_base && (
              <div className="text-sm">
                <span className="text-muted-foreground">Artigo: </span>
                <span className="font-medium">
                  [{match.artigo_base.codigo}] {match.artigo_base.descricao}
                </span>
              </div>
            )}

            {match.material && (
              <div className="text-sm">
                <span className="text-muted-foreground">Material: </span>
                <span className="font-medium">
                  [{match.material.codigo}] {match.material.nome}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              {match.unidade_sugerida && (
                <div>
                  <span className="text-muted-foreground">Unidade: </span>
                  <span className="font-medium">{match.unidade_sugerida}</span>
                </div>
              )}
              {match.metodo_construtivo && (
                <div>
                  <span className="text-muted-foreground">Método: </span>
                  <span className="font-medium">{match.metodo_construtivo}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Preço estimado: </span>
                <span className="font-medium">{formatCurrency(match.preco_estimado)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Modo de edição */}
        {isEditing && (
          <div className="p-4 border rounded-lg space-y-4">
            <h4 className="font-medium text-sm">Ajustar valores</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={editedMatch.unidade_sugerida || ""}
                  onChange={(e) => setEditedMatch(prev => ({ ...prev, unidade_sugerida: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço estimado (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editedMatch.preco_estimado || ""}
                  onChange={(e) => setEditedMatch(prev => ({ ...prev, preco_estimado: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={editedMatch.observacoes || ""}
                onChange={(e) => setEditedMatch(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                Guardar e Validar
              </Button>
            </div>
          </div>
        )}

        {/* Ações */}
        {!readOnly && item.status === "pendente" && !isEditing && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={handleAccept}
            >
              <Check className="w-4 h-4 mr-2" />
              Aceitar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Ajustar
            </Button>

            <Dialog open={showArtigoSearch} onOpenChange={setShowArtigoSearch}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-2" />
                  Trocar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Selecionar Artigo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Pesquisar artigos..."
                    value={searchArtigo}
                    onChange={(e) => setSearchArtigo(e.target.value)}
                  />
                  <ScrollArea className="h-80">
                    <div className="space-y-2">
                      {filteredArtigos.map(artigo => (
                        <div
                          key={artigo.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-muted"
                          onClick={() => handleSelectArtigo(artigo)}
                        >
                          <p className="font-medium text-sm">[{artigo.codigo}] {artigo.descricao}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {artigo.unidade} • {formatCurrency(artigo.preco_unitario)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onIgnorar}
            >
              <X className="w-4 h-4 mr-2" />
              Ignorar
            </Button>
          </div>
        )}

        {/* Status validado */}
        {item.status === "validado" && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="w-4 h-4" />
            <span>Validado</span>
          </div>
        )}

        {/* Status ignorado */}
        {item.status === "ignorado" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <X className="w-4 h-4" />
              <span>Ignorado</span>
            </div>
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onValidar(false)}
              >
                Restaurar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
