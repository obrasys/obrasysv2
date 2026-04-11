import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, FileText, ClipboardList, Sparkles, ChevronDown, Camera } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface DashboardWelcomeProps {
  obrasEmRisco: number;
  acoesPrioritarias: number;
  medicoesPendentes: number;
}

export function DashboardWelcome({ obrasEmRisco, acoesPrioritarias, medicoesPendentes }: DashboardWelcomeProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(' ')[0] || 'Utilizador';
  const [open, setOpen] = useState(false);

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  // Check profile completion
  const completionFields = [
    profile?.nome,
    profile?.telefone,
    profile?.nif,
    profile?.avatar_url,
    profile?.empresa_nome,
    profile?.empresa_morada,
    profile?.empresa_nif,
    profile?.empresa_email,
  ];
  const filledFields = completionFields.filter(Boolean).length;
  const isComplete = filledFields === completionFields.length;

  const summaryParts: string[] = [];
  if (obrasEmRisco > 0) summaryParts.push(`${obrasEmRisco} obra${obrasEmRisco > 1 ? 's' : ''} em risco`);
  if (acoesPrioritarias > 0) summaryParts.push(`${acoesPrioritarias} ações prioritárias`);
  if (medicoesPendentes > 0) summaryParts.push(`${medicoesPendentes} auto${medicoesPendentes > 1 ? 's' : ''} de medição pendente${medicoesPendentes > 1 ? 's' : ''}`);

  const summaryText = summaryParts.length > 0
    ? `Hoje tens ${summaryParts.join(', ')}.`
    : 'Tudo em dia. Sem alertas pendentes.';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {/* Avatar with green ring and hover camera icon */}
        <div
          className="relative group cursor-pointer shrink-0"
          onClick={() => navigate('/perfil')}
        >
          <div
            className="rounded-full p-[3px] transition-all"
            style={{ background: isComplete ? '#7de578' : 'hsl(var(--muted))' }}
          >
            <Avatar className="w-14 h-14 border-2 border-background shadow-lg">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.nome} />
              <AvatarFallback className="text-lg bg-primary text-primary-foreground font-bold">
                {getInitials(profile?.nome || '')}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Bem-vindo de volta, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{summaryText}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate('/obras/criar')}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Obra
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <FileText className="w-4 h-4 mr-1.5" />
              Novo Orçamento
              <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1.5">
            <button
              onClick={() => { setOpen(false); navigate('/orcamentos/essencial/novo'); }}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
            >
              <Sparkles className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <span className="text-sm font-medium text-foreground">Essencial</span>
                <p className="text-xs text-muted-foreground">~5 minutos</p>
              </div>
            </button>
            <button
              onClick={() => { setOpen(false); navigate('/orcamentos/criar'); }}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
            >
              <FileText className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <span className="text-sm font-medium text-foreground">Avançado</span>
                <p className="text-xs text-muted-foreground">~15 minutos</p>
              </div>
            </button>
          </PopoverContent>
        </Popover>

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
