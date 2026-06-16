import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle, Store, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useIsSupplier } from '@/hooks/useSuppliers';
import { useAcceptSupplierInvite, useInviteLookup } from '@/hooks/useTenantSupplierInvites';
import logo from '@/assets/logo.png';
import { SEO } from '@/components/SEO';

export default function AceitarConvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { user, loading } = useAuth();
  const { data: isSupplier, isLoading: supplierLoading } = useIsSupplier();
  const { data: invite, isLoading, error } = useInviteLookup(token);
  const accept = useAcceptSupplierInvite();

  useEffect(() => {
    if (accept.isSuccess) {
      const t = setTimeout(() => navigate('/fornecedor/dashboard', { replace: true }), 1500);
      return () => clearTimeout(t);
    }
  }, [accept.isSuccess, navigate]);

  if (!token) {
    return <Centered title="Link inválido" description="O link não contém um token de convite." />;
  }

  if (loading || isLoading || supplierLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <Centered
        title="Convite não encontrado"
        description="O link pode ter expirado ou já ter sido utilizado."
        icon={<XCircle className="h-12 w-12 text-destructive" />}
      />
    );
  }

  const expired =
    invite.expires_at && new Date(invite.expires_at) < new Date();
  const blocked =
    invite.status !== 'pending' || expired;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SEO
        title="Aceitar convite de fornecedor - ObraSys"
        description="Aceite o convite para se juntar à rede de fornecedores de uma empresa no ObraSys."
        path="/fornecedor/aceitar"
      />
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <img src={logo} alt="ObraSys" className="h-10 w-auto mx-auto mb-3" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Store className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium text-accent">Portal Fornecedor</span>
          </div>
          <CardTitle className="text-xl">
            {accept.isSuccess
              ? 'Convite aceite!'
              : blocked
              ? 'Convite indisponível'
              : 'Convite para fornecedor'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {accept.isSuccess ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
              <p className="text-muted-foreground">
                A redirecionar para o seu painel de fornecedor...
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {invite.organization_name || 'Empresa cliente'}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Convidou-o(a) ({invite.email}) para se juntar à rede de fornecedores
                  desta empresa.
                </p>
                {invite.categoria && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Categoria: </span>
                    <span className="font-medium">{invite.categoria}</span>
                  </p>
                )}
                {invite.mensagem && (
                  <p className="text-sm border-l-2 border-accent pl-3 italic text-foreground/80">
                    "{invite.mensagem}"
                  </p>
                )}
              </div>

              {blocked ? (
                <p className="text-sm text-destructive text-center">
                  Este convite está {expired ? 'expirado' : invite.status} e não pode ser
                  aceite.
                </p>
              ) : !user ? (
                <div className="space-y-3">
                  <p className="text-sm text-center text-muted-foreground">
                    Inicie sessão ou crie uma conta de fornecedor para aceitar este
                    convite.
                  </p>
                  <Button asChild className="w-full" size="lg" variant="accent">
                    <Link
                      to={`/fornecedor/auth?invite=${token}`}
                    >
                      Entrar / Criar conta
                    </Link>
                  </Button>
                </div>
              ) : !isSupplier ? (
                <div className="space-y-3">
                  <p className="text-sm text-center text-destructive">
                    A sua conta não tem perfil de fornecedor. Complete o registo
                    primeiro.
                  </p>
                  <Button asChild className="w-full" variant="accent">
                    <Link to="/fornecedor/auth">Completar perfil de fornecedor</Link>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => accept.mutate(token)}
                  disabled={accept.isPending}
                  size="lg"
                  variant="accent"
                  className="w-full"
                >
                  {accept.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Aceitar convite
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Centered({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {icon ?? <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />}
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
