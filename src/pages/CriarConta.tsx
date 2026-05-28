import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, CheckCircle2, Play } from "lucide-react";
import logoWhite from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { signUpSchema, SignUpFormData } from "@/lib/validations/auth";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { SEO } from "@/components/SEO";

const CriarConta = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const navigate = useNavigate();
  const { signUp, user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { nome: "", email: "", telefone: "", empresa: "", nif: "", password: "", confirmPassword: "" },
  });

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.nome, {
      telefone: data.telefone,
      empresa: data.empresa || undefined,
      nif: data.nif || undefined,
    });
    setIsLoading(false);

    if (error) {
      const errorMap: Record<string, string> = {
        "User already registered": "Este email já está registado.",
        "Password should be at least 6 characters": "A password deve ter pelo menos 6 caracteres.",
        "Signup requires a valid password": "Introduza uma password válida.",
      };
      toast({
        variant: "destructive",
        title: "Erro ao registar",
        description: errorMap[error.message] || error.message,
      });
      return;
    }

    setSignUpSuccess(true);
    toast({
      title: "Conta criada!",
      description: "A sua conta foi criada com sucesso.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <SEO
        title="Criar conta grátis - ObraSys"
        description="Comece grátis no ObraSys. Crie a sua conta e gira orçamentos, obras e equipas com 30 dias de teste."
        path="/criar-conta"
      />
      {/* Left side - Marketing copy */}
      <div className="hidden lg:flex lg:w-1/2 bg-hero-gradient relative overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <a href="/" className="flex items-center mb-12">
            <img
              src={logoWhite}
              alt="ObraSys Logo"
              className="h-16 w-auto brightness-0 invert"
            />
          </a>

          <h1 className="font-display text-4xl lg:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
            Pare de perder dinheiro na obra.{" "}
            <span className="text-gradient">Controle custos, prazos e orçamentos num só lugar.</span>
          </h1>

          <p className="text-lg text-primary-foreground/70 mb-10 max-w-lg">
            O Obra Sys ajuda construtores, arquitetos e gestores de obra a organizar tudo - do orçamento à execução - sem Excel e sem dor de cabeça.
          </p>

          <div className="space-y-4">
            {[
              "30 dias de trial grátis",
              "Sem cartão de crédito",
              "Configuração em menos de 2 minutos",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-primary-foreground/80">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <a href="/" className="flex lg:hidden items-center justify-center mb-6">
            <img
              src={logoWhite}
              alt="ObraSys Logo"
              className="h-14 w-auto"
            />
          </a>

          {!signUpSuccess ? (
            <div className="space-y-6">
              {/* Mobile headline */}
              <div className="lg:hidden text-center mb-4">
                <h1 className="font-display text-2xl font-bold text-foreground mb-3 leading-tight">
                  Pare de perder dinheiro na obra.{" "}
                  <span className="text-accent">Controle custos, prazos e orçamentos num só lugar.</span>
                </h1>
                <p className="text-base text-muted-foreground">
                  O Obra Sys ajuda construtores, arquitetos e gestores de obra a organizar tudo - sem Excel e sem dor de cabeça.
                </p>
              </div>

              {/* Mobile benefits */}
              <div className="lg:hidden flex flex-wrap justify-center gap-2 mb-4">
                {["30 dias grátis", "Sem cartão", "Setup em 2 min"].map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium bg-accent/10 text-accent px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item}
                  </span>
                ))}
              </div>

              <div className="text-center lg:text-left">
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Testar grátis agora
                </h2>
                <p className="text-muted-foreground">
                  Crie a sua conta e comece o trial de 30 dias
                </p>
              </div>

              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo <span className="text-destructive">*</span></Label>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="João Silva"
                    {...signUpForm.register("nome")}
                  />
                  {signUpForm.formState.errors.nome && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.nome.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    {...signUpForm.register("email")}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone <span className="text-destructive">*</span></Label>
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="+351 912 345 678"
                    {...signUpForm.register("telefone")}
                  />
                  {signUpForm.formState.errors.telefone && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.telefone.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="empresa">Empresa</Label>
                    <Input
                      id="empresa"
                      type="text"
                      placeholder="Nome da empresa"
                      {...signUpForm.register("empresa")}
                    />
                    {signUpForm.formState.errors.empresa && (
                      <p className="text-sm text-destructive">
                        {signUpForm.formState.errors.empresa.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nif">NIF</Label>
                    <Input
                      id="nif"
                      type="text"
                      placeholder="123456789"
                      {...signUpForm.register("nif")}
                    />
                    {signUpForm.formState.errors.nif && (
                      <p className="text-sm text-destructive">
                        {signUpForm.formState.errors.nif.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...signUpForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={signUpForm.watch("password")} />
                  {signUpForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...signUpForm.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" variant="accent" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Testar grátis agora"}
                </Button>
              </form>

              {/* Secondary CTA */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => window.open("/", "_blank")}
                  className="inline-flex items-center gap-2 text-sm text-accent hover:underline font-medium"
                >
                  <Play className="w-4 h-4" />
                  Ver como funciona em 2 minutos
                </button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <button
                  onClick={() => navigate("/auth")}
                  className="text-accent hover:underline font-medium"
                >
                  Entrar
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Conta criada com sucesso!
                </h2>
                <p className="text-muted-foreground">
                  Verifique o seu email para confirmar a conta e depois faça login para começar.
                </p>
              </div>
              <Button
                variant="accent"
                className="w-full"
                size="lg"
                onClick={() => navigate("/auth")}
              >
                Ir para o login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CriarConta;
