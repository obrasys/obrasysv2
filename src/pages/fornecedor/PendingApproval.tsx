import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Clock, Mail, ShieldCheck } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function FornecedorPendingApproval() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={logo} alt="ObraSys" className="h-10 w-auto mx-auto" />

        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-yellow-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Conta em Validação</h1>
          <p className="text-muted-foreground">
            A sua conta de fornecedor está a ser validada pela equipa ObraSys.
            Receberá um email de confirmação assim que for aprovada.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Processo de certificação</p>
              <p className="text-xs text-muted-foreground">
                Verificamos documentação, NIF e dados da empresa antes de ativar a conta.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Notificação por email</p>
              <p className="text-xs text-muted-foreground">
                Será notificado por email quando a conta for ativada.
              </p>
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={signOut} className="w-full">
          Sair
        </Button>
      </div>
    </div>
  );
}
