import { AppLayout } from '@/components/layout';
import { SpecialtyPage } from '@/components/instalacoes';

export default function CanalizacaoPage() {
  return (
    <AppLayout title="Instalações de Canalização" subtitle="Orçamentação paramétrica de canalização">
      <SpecialtyPage specialty="plumbing" />
    </AppLayout>
  );
}
