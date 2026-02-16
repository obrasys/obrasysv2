import { AppLayout } from '@/components/layout';
import { InstallationsDashboard } from '@/components/instalacoes';

export default function InstalacoesIndex() {
  return (
    <AppLayout title="Instalações" subtitle="Visão geral de todas as instalações">
      <InstallationsDashboard />
    </AppLayout>
  );
}
