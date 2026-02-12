import { useEffect } from 'react';
import { ClientPortalLayout } from '@/components/portal/ClientPortalLayout';
import { PortalObraCard } from '@/components/portal/PortalObraCard';
import { useClientPortal } from '@/hooks/useClientPortal';
import { Loader2, Building2 } from 'lucide-react';

const PortalIndex = () => {
  const { obras, obrasLoading } = useClientPortal();

  return (
    <ClientPortalLayout title="As Minhas Obras" subtitle="Acompanhe o progresso das suas obras">
      {obrasLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !obras || obras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Sem obras atribuídas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Quando a sua obra for adjudicada, aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {obras.map((obra) => (
            <PortalObraCard key={obra.id} obra={obra} />
          ))}
        </div>
      )}
    </ClientPortalLayout>
  );
};

export default PortalIndex;
