import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoForm } from '@/components/orcamentos/OrcamentoForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrcamentoFormData } from '@/types/orcamentos';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export default function CriarOrcamentoPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createOrcamento } = useOrcamentos();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const handleSubmit = async (data: OrcamentoFormData) => {
    const result = await createOrcamento.mutateAsync(data);
    navigate(`/orcamentos/${result.id}/editar`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/orcamentos')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Criar Orçamento</h1>
              <p className="text-sm text-muted-foreground">
                Preencha as informações do novo orçamento
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Orçamento</CardTitle>
              <CardDescription>
                Configure o título, obra associada e parâmetros de cálculo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrcamentoForm
                onSubmit={handleSubmit}
                isLoading={createOrcamento.isPending}
                submitLabel="Criar e Continuar"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
