import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { PriceInputForm } from "@/components/base-precos";

export default function BasePrecosInserir() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/base-precos");
  };

  return (
    <AppLayout title="Inserir Preço">
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Plus className="h-6 w-6" />
              Inserir Preço
            </h1>
            <p className="text-muted-foreground mt-1">
              Adicione um novo preço à base de dados
            </p>
          </div>
        </div>

        {/* Informação */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> O preço será guardado com status "Pendente"
              e será processado pelo sistema automático de cálculo. Os preços de
              referência são atualizados diariamente.
            </p>
          </CardContent>
        </Card>

        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Preço</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceInputForm onSuccess={handleSuccess} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
