import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
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
  const companyName = profile?.empresa_nome || 'Empresa';

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const summaryParts: string[] = [];
  if (obrasEmRisco > 0) summaryParts.push(`${obrasEmRisco} obra${obrasEmRisco > 1 ? 's' : ''} em risco`);
  if (acoesPrioritarias > 0) summaryParts.push(`${acoesPrioritarias} ações prioritárias`);
  if (medicoesPendentes > 0) summaryParts.push(`${medicoesPendentes} auto${medicoesPendentes > 1 ? 's' : ''} de medição pendente${medicoesPendentes > 1 ? 's' : ''}`);

  const summaryText = summaryParts.length > 0
    ? `${summaryParts.join('. ')}. Aguardam validação humana.`
    : 'Tudo em dia. Sem alertas pendentes.';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        <span>Painel Operacional</span>
        <span>·</span>
        <span>{companyName}</span>
        <span>·</span>
        <span>{dateStr}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Bom dia, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">{summaryText}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/plantas')}>
            <Upload className="w-4 h-4 mr-1.5" />
            Importar CAD/PDF
          </Button>
          <Button size="sm" onClick={() => navigate('/obras/criar')}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nova obra
          </Button>
        </div>
      </div>
    </div>
  );
}
