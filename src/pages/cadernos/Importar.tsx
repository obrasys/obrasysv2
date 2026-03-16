import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CadernoUploadZone, CadernoProgressSteps } from "@/components/cadernos";
import { useCaderno, useCadernoUpload } from "@/hooks/useCadernos";
import { useObra } from "@/hooks/useObras";
import type { CadernoOrigem, AnaliseProgresso } from "@/types/cadernos";
import { toast } from "sonner";
import { parseExcelFile } from "@/lib/excel-budget-parser";

export default function ImportarCadernoPage() {
  const { id: obraId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progresso, setProgresso] = useState<AnaliseProgresso | null>(null);
  const [cadernoId, setCadernoId] = useState<string | null>(null);

  const { obra, isLoading: loadingObra } = useObra(obraId);
  const { createCaderno, analisarCaderno, matchPrecos } = useCaderno();
  const { uploadFicheiro } = useCadernoUpload();

  const handleSubmit = async (data: { nome: string; origem: CadernoOrigem; ficheiro: File }) => {
    if (!obraId) return;
    
    setIsProcessing(true);
    setProgresso({ etapa: "leitura", percentagem: 10, mensagem: "A ler o ficheiro..." });

    try {
      // 1. Upload do ficheiro
      setProgresso({ etapa: "leitura", percentagem: 20, mensagem: "A fazer upload do ficheiro..." });
      const { url, path } = await uploadFicheiro(data.ficheiro);

      // 2. Criar caderno na base de dados
      setProgresso({ etapa: "leitura", percentagem: 30, mensagem: "A criar registo do caderno..." });
      const caderno = await createCaderno.mutateAsync({
        obra_id: obraId,
        nome: data.nome,
        origem: data.origem,
        ficheiro_url: url,
        ficheiro_nome: data.ficheiro.name,
        ficheiro_tipo: data.ficheiro.type,
      });

      setCadernoId(caderno.id);

      // 3. Ler conteúdo do ficheiro
      setProgresso({ etapa: "extracao", percentagem: 40, mensagem: "A extrair texto do documento..." });
      const textoConteudo = await lerConteudoFicheiro(data.ficheiro);

      // 4. Analisar com IA
      setProgresso({ etapa: "analise", percentagem: 60, mensagem: "A analisar estrutura técnica..." });
      await analisarCaderno.mutateAsync({
        cadernoId: caderno.id,
        conteudoTexto: textoConteudo,
      });

      // 5. Fazer matching com base de preços
      setProgresso({ etapa: "matching", percentagem: 80, mensagem: "A associar artigos da base de preços..." });
      const matchResult = await matchPrecos.mutateAsync({
        cadernoId: caderno.id,
      });

      // 6. Concluído
      setProgresso({ 
        etapa: "concluido", 
        percentagem: 100, 
        mensagem: `Análise concluída! Foram identificados ${matchResult?.matched || 0} itens.` 
      });

      toast.success("Caderno analisado com sucesso!");

      // Redirecionar para validação após 2 segundos
      setTimeout(() => {
        navigate(`/obras/${obraId}/cadernos/${caderno.id}/validar`);
      }, 2000);

    } catch (error) {
      console.error("Erro no processamento:", error);
      toast.error("Erro ao processar o caderno. Tente novamente.");
      setProgresso(null);
      setIsProcessing(false);
    }
  };

  // Função para ler o conteúdo do ficheiro
  const lerConteudoFicheiro = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === "string") {
          resolve(content);
        } else if (content instanceof ArrayBuffer) {
          // Para ficheiros binários, converter para base64
          const decoder = new TextDecoder("utf-8");
          resolve(decoder.decode(content));
        } else {
          resolve("");
        }
      };
      
      reader.onerror = () => reject(new Error("Erro ao ler ficheiro"));
      
      // Para XML, ler como texto
      if (file.type.includes("xml")) {
        reader.readAsText(file);
      } else {
        // Para outros formatos, ler como texto (simplificado - em produção usaria um parser adequado)
        reader.readAsText(file);
      }
    });
  };

  if (loadingObra) {
    return (
      <AppLayout title="A carregar...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!obra) {
    return (
      <AppLayout title="Obra não encontrada">
        <div className="p-6 text-center">
          <p className="text-muted-foreground">A obra solicitada não foi encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/obras")}>
            Voltar às Obras
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Importar Caderno de Encargos"
      subtitle={obra.nome}
      actions={
        <Button 
          variant="outline" 
          onClick={() => navigate(`/obras/${obraId}/cadernos`)}
          disabled={isProcessing}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      }
    >
      <div className="p-6 max-w-2xl mx-auto">
        {!isProcessing ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload de Documento</CardTitle>
            </CardHeader>
            <CardContent>
              <CadernoUploadZone onSubmit={handleSubmit} isLoading={isProcessing} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>A Analisar Documento</CardTitle>
            </CardHeader>
            <CardContent>
              {progresso && <CadernoProgressSteps progresso={progresso} />}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
