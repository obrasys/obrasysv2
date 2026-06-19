import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ObraForm } from '@/components/obras/ObraForm';
import { useObras } from '@/hooks/useObras';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradePromptModal } from '@/components/subscription/UpgradePromptModal';
import type { ObraFormData } from '@/types/obras';

export default function CriarObraPage() {
  const navigate = useNavigate();
  const { createObra } = useObras();
  const { canCreateObra, limits, tier, obrasAtivas } = useFeatureGate();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleSubmit = async (data: ObraFormData) => {
    if (!canCreateObra) {
      setShowUpgrade(true);
      return;
    }
    await createObra.mutateAsync(data);
    navigate('/obras');
  };

  const upgradeDescription = tier === 'starter'
    ? `O plano Starter permite até ${limits.maxObrasAtivas} obras ativas. Faça upgrade para o plano Professional para obras ilimitadas.`
    : `O seu plano atual permite até ${limits.maxObrasAtivas} obra(s) ativa(s). Faça upgrade para desbloquear mais.`;

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
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Obra</CardTitle>
            <CardDescription>
              Preencha as informações básicas do projeto
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canCreateObra ? (
              <ObraForm
                onSubmit={handleSubmit}
                onCancel={() => navigate('/obras')}
                isLoading={createObra.isPending}
              />
            ) : (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  Atingiu o limite de obras ativas do seu plano ({limits.maxObrasAtivas}).
                </p>
                <Button onClick={() => setShowUpgrade(true)}>
                  Fazer Upgrade
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UpgradePromptModal
        open={showUpgrade}
        onClose={() => {
          setShowUpgrade(false);
          if (!canCreateObra) navigate('/obras');
        }}
        title="Limite de obras atingido"
        description={upgradeDescription}
        requiredPlan="Professional"
        currentTier={tier}
        usage={{
          label: 'Obras ativas',
          current: obrasAtivas,
          limit: limits.maxObrasAtivas || '∞',
        }}
      />
    </AppLayout>
  );
}
