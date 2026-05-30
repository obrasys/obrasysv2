import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CadernoSecaoTree, 
  CadernoItemList, 
  CadernoItemMatchCard,
  CadernoStatusBadge,
} from "@/components/cadernos";
import { useCaderno } from "@/hooks/useCadernos";
import { useObra } from "@/hooks/useObras";
import { toast } from "sonner";

export default function ValidarCadernoPage() {
  const { id: obraId, cadernoId } = useParams<{ id: string; cadernoId: string }>();
  const navigate = useNavigate();
  
  const [selectedSecaoId, setSelectedSecaoId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { obra, isLoading: loadingObra } = useObra(obraId);
  const { 
    caderno, 
    secoes, 
    itens, 
    estatisticas,
    isLoading: loadingCaderno,
    validarItem,
    ignorarItem,
    validarSecao,
    updateStatus,
  } = useCaderno(cadernoId);

  // Filtrar itens da seção selecionada
  const itensFiltrados = useMemo(() => {
    if (!itens) return [];
    if (!selectedSecaoId) return itens;
    return itens.filter(item => item.secao_id === selectedSecaoId);
  }, [itens, selectedSecaoId]);

  // Item selecionado para o painel de detalhes
  const itemSelecionado = useMemo(() => {
    if (!selectedItemId || !itens) return null;
    return itens.find(item => item.id === selectedItemId) || null;
  }, [selectedItemId, itens]);

  const handleValidarItem = async (validado: boolean, matchData?: any) => {
    if (!selectedItemId) return;
    await validarItem.mutateAsync({ itemId: selectedItemId, validado, matchData });
  };

  const handleIgnorarItem = async () => {
    if (!selectedItemId) return;
    await ignorarItem.mutateAsync(selectedItemId);
    setSelectedItemId(null);
  };

  const handleValidarSecao = async (secaoId: string) => {
    await validarSecao.mutateAsync(secaoId);
    toast.success("Secção validada com sucesso!");
  };

  const handleConcluir = async () => {
    await updateStatus.mutateAsync("validado");
    navigate(`/obras/${obraId}/cadernos/${cadernoId}/resumo`);
  };

  const isLoading = loadingObra || loadingCaderno;

  if (isLoading) {
    return (
      <AppLayout title="A carregar...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!obra || !caderno) {
    return (
      <AppLayout title="Não encontrado">
        <div className="p-6 text-center">
          <p className="text-muted-foreground">O caderno solicitado não foi encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/obras/${obraId}/cadernos`)}>
            Voltar aos Cadernos
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Validação de Itens"
      subtitle={caderno.nome}
      actions={
        <div className="flex items-center gap-4">
          <CadernoStatusBadge status={caderno.status} />
          <Button variant="outline" onClick={() => navigate(`/obras/${obraId}/cadernos`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button 
            onClick={handleConcluir}
            disabled={!estatisticas || estatisticas.itens_validados === 0}
          >
            Concluir Validação
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Barra de progresso */}
        {estatisticas && (
          <Card className="mb-4 md:mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Progresso de Validação</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{estatisticas.itens_validados} validados</span>
                    <span>•</span>
                    <span>{estatisticas.itens_pendentes} pendentes</span>
                    <span>•</span>
                    <span>{estatisticas.itens_ignorados} ignorados</span>
                  </div>
                </div>
                <span className="text-lg font-bold">{estatisticas.percentagem_validados}%</span>
              </div>
              <Progress value={estatisticas.percentagem_validados} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Layout de 3 colunas */}
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-280px)]">
          {/* Coluna 1: Árvore de seções */}
          <Card className="col-span-3 flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-sm">Secções</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4 pb-4">
                {secoes && itens && (
                  <CadernoSecaoTree
                    secoes={secoes}
                    itens={itens}
                    selectedSecaoId={selectedSecaoId}
                    onSelectSecao={setSelectedSecaoId}
                    onValidarSecao={handleValidarSecao}
                  />
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Coluna 2: Lista de itens */}
          <Card className="col-span-4 flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-sm">
                Itens {selectedSecaoId && `(${itensFiltrados.length})`}
              </CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-hidden">
              <CadernoItemList
                itens={itensFiltrados}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
                onValidarItem={(id) => validarItem.mutateAsync({ itemId: id, validado: true })}
                onIgnorarItem={(id) => ignorarItem.mutateAsync(id)}
              />
            </div>
          </Card>

          {/* Coluna 3: Detalhes do item selecionado */}
          <Card className="col-span-5 flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-sm">Detalhes do Item</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {itemSelecionado ? (
                <CadernoItemMatchCard
                  item={itemSelecionado}
                  onValidar={handleValidarItem}
                  onIgnorar={handleIgnorarItem}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Selecione um item para ver os detalhes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
