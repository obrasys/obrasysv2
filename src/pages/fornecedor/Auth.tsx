import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useIsSupplier } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Store, CheckCircle2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useToast } from '@/hooks/use-toast';
import { RegisterForm } from './components/RegisterForm';
import { SEO } from '@/components/SEO';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type LoginData = z.infer<typeof loginSchema>;

export default function FornecedorAuth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user, loading, profile } = useAuth();
  const { data: isSupplier, isLoading: supplierLoading } = useIsSupplier();
  const { toast } = useToast();

  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    if (inviteToken) {
      setMode('register');
    }
  }, [inviteToken]);

  useEffect(() => {
    if (!loading && !supplierLoading && user) {
      if (isSupplier) {
        navigate('/fornecedor/dashboard', { replace: true });
      } else if (profile?.role === 'cliente') {
        navigate('/portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, loading, supplierLoading, isSupplier, profile, navigate]);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = async (data: LoginData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials'
          ? 'Email ou password incorretos.'
          : error.message,
      });
    }
  };

  if (loading || supplierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <SEO
        title={mode === 'register' ? 'Registar como fornecedor - ObraSys' : 'Portal Fornecedor - Entrar - ObraSys'}
        description={mode === 'register'
          ? 'Junte-se à rede de fornecedores ObraSys e receba pedidos de cotação de empresas de construção.'
          : 'Aceda ao Portal de Fornecedores ObraSys para responder a pedidos de cotação e gerir tabelas de preços.'}
        path="/fornecedor/auth"
      />
      {/* Left branding */}
      <div className={`hidden lg:flex ${mode === 'register' ? 'lg:w-1/3' : 'lg:w-1/2'} bg-hero-gradient relative overflow-hidden transition-all duration-500`}>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <div className="flex items-center gap-3 mb-12">
            <img src={logo} alt="ObraSys" className="h-16 w-auto brightness-0 invert" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-8 w-8 text-accent" />
            <h1 className="font-display text-3xl font-bold text-primary-foreground">
              Portal do Fornecedor
            </h1>
          </div>
          <p className="text-lg text-primary-foreground/70 mb-8 max-w-md">
            Gerencie pedidos de cotação, publique a sua lista de preços e responda a construtores certificados.
          </p>
          <div className="space-y-4">
            {[
              'Receba pedidos de cotação de construtores',
              'Publique a sua tabela de preços',
              'Seja certificado na rede ObraSys',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-primary-foreground/80">
                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className={`w-full ${mode === 'register' ? 'lg:w-2/3' : 'lg:w-1/2'} flex items-center justify-center p-8 transition-all duration-500 overflow-y-auto`}>
        <div className={`w-full ${mode === 'register' ? 'max-w-3xl' : 'max-w-md'}`}>
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <Store className="h-6 w-6 text-accent" />
            <img src={logo} alt="ObraSys" className="h-10 w-auto" />
          </div>

          {mode === 'login' ? (
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <div className="flex items-center gap-2 mb-2 justify-center lg:justify-start">
                  <Store className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium text-accent">Portal Fornecedor</span>
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Acesso de Fornecedor
                </h2>
                <p className="text-muted-foreground">
                  Entre com as credenciais da sua conta de fornecedor
                </p>
              </div>

              {inviteToken && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg text-sm text-accent">
                  Tem um convite? Crie a sua conta abaixo para completar o registo.
                </div>
              )}

              <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="fornecedor@empresa.pt"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" variant="accent" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar como Fornecedor'}
                </Button>
              </form>

              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Ainda não tem conta?{' '}
                  <button onClick={() => setMode('register')} className="text-accent hover:underline font-medium">
                    Registe-se aqui
                  </button>
                </p>
                <div className="h-px bg-border" />
                <p className="text-sm text-muted-foreground">
                  É construtor?{' '}
                  <a href="/auth" className="text-accent hover:underline font-medium">
                    Aceder ao ObraSys
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <RegisterForm onCancel={() => setMode('login')} onSuccess={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  );
}