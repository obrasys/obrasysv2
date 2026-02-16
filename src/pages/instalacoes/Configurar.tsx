import { AppLayout } from '@/components/layout';
import { CoefficientsEditor } from '@/components/instalacoes';

export default function ConfigurarPage() {
  return (
    <AppLayout title="Configuração de Instalações" subtitle="Ajuste os coeficientes paramétricos da sua empresa">
      <CoefficientsEditor />
    </AppLayout>
  );
}
