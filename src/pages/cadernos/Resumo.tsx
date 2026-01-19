import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CadernoResumoCard, CadernoStatusBadge } from "@/components/cadernos";
import { useCaderno } from "@/hooks/useCadernos";
import { useObra } from "@/hooks/useObras";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PerfilPreco } from "@/types/cadernos";

export default function ResumoCadernoPage() {
  const { id: obraId, cadernoId } = useParams<{ id: string; cadernoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isCreating, setIsCreating] = useState(false);

  const { obra, isLoading: loadingObra } = useObra(obraId);
  const { 
    caderno, 
    secoes,
    itens,
    estatisticas,
    isLoading: loadingCaderno,
    updatePerfilPreco,
    updateStatus,
  } = useCaderno(cadernoId);

  const handlePerfilChange = async (perfil: PerfilPreco) => {
    await updatePerfilPreco.mutateAsync(perfil);
  };

  const handleCriarOrcamento = async () => {
    if (!obraId || !cadernoId || !caderno || !secoes || !itens || !user) return;

    setIsCreating(true);

    try {
      // 1. Criar orçamento
      const { data: orcamento, error: orcError } = await supabase
        .from("orcamentos")
        .insert({
          user_id: user.id,
          obra_id: obraId,
          titulo: `Orçamento - ${caderno.nome}`,
          status: "rascunho",
          valor_total: estatisticas?.valor_estimado || 0,
          margem_lucro: 15,
          custos_indiretos: { estaleiro: 0, seguros: 0, licenciamento: 0 },
        })
        .select()
        .single();

      if (orcError) throw orcError;

      // 2. Criar capítulos a partir das secções
      for (const secao of secoes.filter(s => s.nivel === 1)) {
        const itensSecao = itens.filter(i => 
          i.secao_id === secao.id && i.status === "validado"
        );

        if (itensSecao.length === 0) continue;

        const valorCapitulo = itensSecao.reduce((sum, item) => 
          sum + (item.match?.preco_estimado || 0) * (item.quantidade_detectada || 1), 0
        );

        const { data: capitulo, error: capError } = await supabase
          .from("capitulos_orcamento")
          .insert({
            orcamento_id: orcamento.id,
            numero: parseInt(secao.codigo) || secao.ordem + 1,
            titulo: secao.nome,
            descricao: null,
            valor_total: valorCapitulo,
            ordem: secao.ordem,
          })
          .select()
          .single();

        if (capError) {
          console.error("Erro ao criar capítulo:", capError);
          continue;
        }

        // 3. Criar artigos a partir dos itens validados
        for (let i = 0; i < itensSecao.length; i++) {
          const item = itensSecao[i];
          const quantidade = item.quantidade_detectada || 1;
          const precoUnitario = item.match?.preco_estimado || 0;

          await supabase
            .from("artigos_orcamento")
            .insert({
              capitulo_id: capitulo.id,
              codigo: item.match?.artigo_base?.codigo || item.match?.material?.codigo || null,
              descricao: item.descricao_original,
              unidade: item.match?.unidade_sugerida || item.unidade_detectada || "un",
              quantidade,
              preco_unitario: precoUnitario,
              valor_total: quantidade * precoUnitario,
              ordem: i,
            });
        }
      }

      // 4. Atualizar caderno com referência ao orçamento
      await supabase
        .from("cadernos_encargos")
        .update({
          status: "orcamentado",
          orcamento_id: orcamento.id,
        })
        .eq("id", cadernoId);

      toast.success("Orçamento criado com sucesso!");
      navigate(`/orcamentos/${orcamento.id}/editar`);

    } catch (error) {
      console.error("Erro ao criar orçamento:", error);
      toast.error("Erro ao criar orçamento. Tente novamente.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleGuardarRascunho = async () => {
    await updateStatus.mutateAsync("validado");
    toast.success("Caderno guardado como validado!");
    navigate(`/obras/${obraId}/cadernos`);
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

  if (!obra || !caderno || !estatisticas) {
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
      title="Resumo do Caderno"
      subtitle={caderno.nome}
      actions={
        <div className="flex items-center gap-4">
          <CadernoStatusBadge status={caderno.status} />
          <Button variant="outline" onClick={() => navigate(`/obras/${obraId}/cadernos/${cadernoId}/validar`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar à Validação
          </Button>
        </div>
      }
    >
      <div className="p-6 max-w-3xl mx-auto">
        {/* Info do caderno */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {caderno.nome}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Obra:</span>
                <span className="ml-2 font-medium">{obra.nome}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ficheiro:</span>
                <span className="ml-2">{caderno.ficheiro_nome || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo e ações */}
        <CadernoResumoCard
          estatisticas={estatisticas}
          perfilPreco={caderno.perfil_preco}
          onPerfilChange={handlePerfilChange}
          onCriarOrcamento={handleCriarOrcamento}
          onGuardarRascunho={handleGuardarRascunho}
          isLoading={isCreating}
        />
      </div>
    </AppLayout>
  );
}
