import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/components/patterns';
import { InstallationsDashboard } from '@/components/instalacoes';

export default function InstalacoesIndex() {
  return (
    <AppLayout title="Instalações" subtitle="Visão geral de todas as instalações">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <PageHeader
          eyebrow="Operação"
          title="Instalações"
          subtitle="Visão geral de todas as instalações"
        />
        <InstallationsDashboard />
      </div>
    </AppLayout>
  );
}
