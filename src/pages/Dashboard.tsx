import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  LogOut, 
  User, 
  Clock, 
  AlertTriangle,
  Home,
  FileText,
  ClipboardList,
  Calendar,
  Wallet,
  Users,
  BarChart3,
  Settings,
  HelpCircle
} from "lucide-react";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user, profile, loading, signOut, trialDaysRemaining } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { icon: Home, label: "Dashboard", active: true },
    { icon: Building2, label: "Obras", active: false },
    { icon: FileText, label: "Orçamentos", active: false },
    { icon: ClipboardList, label: "RDOs", active: false },
    { icon: Calendar, label: "Tarefas", active: false },
    { icon: Wallet, label: "Financeiro", active: false },
    { icon: Users, label: "Clientes", active: false },
    { icon: BarChart3, label: "Relatórios", active: false },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-sidebar-foreground">
              Obra<span className="text-sidebar-primary">Sys</span>
            </span>
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                item.active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-sidebar-border space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Definições</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
            <HelpCircle className="w-5 h-5" />
            <span className="font-medium">Suporte</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Trial badge */}
            {trialDaysRemaining > 0 && trialDaysRemaining <= 7 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span>{trialDaysRemaining} dias de trial restantes</span>
              </div>
            )}

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-foreground">{profile?.nome}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-accent" />
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Trial warning banner */}
        {profile?.trial_expired && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">O seu período de trial expirou. Atualize para continuar a usar o ObraSys.</span>
            </div>
            <Button variant="accent" size="sm">
              Ver planos
            </Button>
          </div>
        )}

        {/* Dashboard content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Welcome message */}
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Olá, {profile?.nome?.split(" ")[0]}! 👋
            </h2>
            <p className="text-muted-foreground">
              Bem-vindo ao ObraSys. Aqui está um resumo das suas obras.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Obras Ativas", value: "0", change: "Comece criando uma obra", icon: Building2 },
              { label: "Orçamentos Pendentes", value: "0", change: "Nenhum orçamento pendente", icon: FileText },
              { label: "Tarefas Hoje", value: "0", change: "Nenhuma tarefa agendada", icon: ClipboardList },
              { label: "Valor Total", value: "€0", change: "Sem obras ativas", icon: Wallet },
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
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
