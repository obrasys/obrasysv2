import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ObraForm } from '@/components/obras/ObraForm';
import { useObras } from '@/hooks/useObras';
import type { ObraFormData } from '@/types/obras';

export default function CriarObraPage() {
  const navigate = useNavigate();
  const { createObra } = useObras();

  const handleSubmit = async (data: ObraFormData) => {
    await createObra.mutateAsync(data);
    navigate('/obras');
  };

  return (
    <AppLayout
      title="Nova Obra"
      subtitle="Crie um novo projeto de construção"
      actions={
        <Button variant="outline" onClick={() => navigate('/obras')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      }
    >
      <div className="p-4 md:p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Obra</CardTitle>
            <CardDescription>
              Preencha as informações básicas do projeto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ObraForm
              onSubmit={handleSubmit}
              onCancel={() => navigate('/obras')}
              isLoading={createObra.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
