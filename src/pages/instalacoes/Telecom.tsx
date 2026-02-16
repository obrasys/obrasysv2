import { AppLayout } from '@/components/layout';
import { SpecialtyPage } from '@/components/instalacoes';

export default function TelecomPage() {
  return (
    <AppLayout title="Instalações Telecom" subtitle="Orçamentação paramétrica de telecomunicações">
      <SpecialtyPage specialty="telecom" />
    </AppLayout>
  );
}
