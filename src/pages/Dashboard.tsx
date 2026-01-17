import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Building2, FileText, ClipboardList, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { profile } = useAuth();

  return (
    <AppLayout title="Dashboard">
      <div className="p-6">
        {/* Welcome message */}
        <div className="mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Olá, {profile?.nome?.split(' ')[0]}! 👋
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao ObraSys. Aqui está um resumo das suas obras.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Obras Ativas', value: '0', change: 'Comece criando uma obra', icon: Building2 },
            { label: 'Orçamentos Pendentes', value: '0', change: 'Nenhum orçamento pendente', icon: FileText },
            { label: 'Tarefas Hoje', value: '0', change: 'Nenhuma tarefa agendada', icon: ClipboardList },
            { label: 'Valor Total', value: '€0', change: 'Sem obras ativas', icon: Wallet },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 shadow-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-accent" />
                </div>
              </div>
              <p className="text-3xl font-display font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="bg-card rounded-2xl p-12 shadow-card border border-border text-center">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-accent" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground mb-2">
            Comece a sua primeira obra
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Crie a sua primeira obra para começar a gerir orçamentos, tarefas e equipas num único lugar.
          </p>
          <Button variant="accent" size="lg">
            Criar Obra
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
