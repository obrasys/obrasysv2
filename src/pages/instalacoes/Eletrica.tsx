import { AppLayout } from '@/components/layout';
import { SpecialtyPage } from '@/components/instalacoes';

export default function EletricaPage() {
  return (
    <AppLayout title="Instalações Elétricas" subtitle="Orçamentação paramétrica de instalações elétricas">
      <SpecialtyPage specialty="electrical" />
    </AppLayout>
  );
}
