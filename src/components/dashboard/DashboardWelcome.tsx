import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, FileText, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardWelcomeProps {
  obrasEmRisco: number;
  acoesPrioritarias: number;
  medicoesPendentes: number;
}

export function DashboardWelcome({ obrasEmRisco, acoesPrioritarias, medicoesPendentes }: DashboardWelcomeProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(' ')[0] || 'Utilizador';

  const summaryParts: string[] = [];
  if (obrasEmRisco > 0) summaryParts.push(`${obrasEmRisco} obra${obrasEmRisco > 1 ? 's' : ''} em risco`);
  if (acoesPrioritarias > 0) summaryParts.push(`${acoesPrioritarias} ações prioritárias`);
  if (medicoesPendentes > 0) summaryParts.push(`${medicoesPendentes} auto${medicoesPendentes > 1 ? 's' : ''} de medição pendente${medicoesPendentes > 1 ? 's' : ''}`);

  const summaryText = summaryParts.length > 0
    ? `Hoje tens ${summaryParts.join(', ')}.`
    : 'Tudo em dia. Sem alertas pendentes.';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          Bem-vindo de volta, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{summaryText}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate('/obras/criar')}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Obra
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/orcamentos/essencial/novo')}>
          <FileText className="w-4 h-4 mr-1.5" />
          Novo Orçamento
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/rdos/criar')}>
          <ClipboardList className="w-4 h-4 mr-1.5" />
          Nova RDO
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/tarefas')}>
          <Calendar className="w-4 h-4 mr-1.5" />
          Ver Agenda
        </Button>
      </div>
    </div>
  );
}
