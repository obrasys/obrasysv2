import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import logoWhite from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import {
  loginSchema,
  signUpSchema,
  resetPasswordSchema,
  LoginFormData,
  SignUpFormData,
  ResetPasswordFormData,
} from "@/lib/validations/auth";

type AuthMode = "login" | "signup" | "forgot-password";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, user, loading } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const redirectTo = searchParams.get("redirect") || "/dashboard";
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, searchParams]);

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Signup form
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { nome: "", email: "", password: "", confirmPassword: "" },
  });

  // Reset password form
  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: getErrorMessage(error.message),
      });
      return;
    }

    toast({
      title: "Bem-vindo!",
      description: "Login efetuado com sucesso.",
    });
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.nome);
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao registar",
        description: getErrorMessage(error.message),
      });
      return;
    }

    setSignUpSuccess(true);
    toast({
      title: "Conta criada!",
      description: "A sua conta foi criada com sucesso. Pode agora fazer login.",
    });
  };

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    const { error } = await resetPassword(data.email);
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: getErrorMessage(error.message),
      });
      return;
    }

    setResetEmailSent(true);
    toast({
      title: "Email enviado",
      description: "Verifique a sua caixa de correio para redefinir a password.",
    });
  };

  const getErrorMessage = (message: string): string => {
    const errorMap: Record<string, string> = {
      "Invalid login credentials": "Email ou password incorretos.",
      "User already registered": "Este email já está registado.",
      "Email not confirmed": "Por favor confirme o seu email primeiro.",
      "Password should be at least 6 characters": "A password deve ter pelo menos 6 caracteres.",
      "Signup requires a valid password": "Introduza uma password válida.",
    };

    return errorMap[message] || message;
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
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-hero-gradient relative overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-2xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <a href="/" className="flex items-center mb-12">
            <img 
              src={logoWhite} 
              alt="ObraSys Logo" 
              className="h-12 w-auto brightness-0 invert"
            />
          </a>
          
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Gestão de Obras
            <br />
            <span className="text-gradient">Simplificada</span>
          </h1>
          
          <p className="text-lg text-primary-foreground/70 mb-8 max-w-md">
            Controle orçamentos, equipas, prazos e documentação numa única plataforma.
          </p>
          
          <div className="space-y-4">
            {["30 dias de trial grátis", "Sem cartão de crédito", "Suporte em português"].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-primary-foreground/80">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <a href="/" className="flex lg:hidden items-center justify-center mb-8">
            <img 
              src={logoWhite} 
              alt="ObraSys Logo" 
              className="h-10 w-auto"
            />
          </a>

          {/* Login Form */}
          {mode === "login" && (
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Bem-vindo de volta
                </h2>
                <p className="text-muted-foreground">
                  Entre na sua conta para continuar
                </p>
              </div>

              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot-password")}
                      className="text-sm text-accent hover:underline"
                    >
                      Esqueceu a password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...loginForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" variant="accent" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Não tem conta?{" "}
                <button
                  onClick={() => {
                    setMode("signup");
                    setSignUpSuccess(false);
                  }}
                  className="text-accent hover:underline font-medium"
                >
                  Criar conta grátis
                </button>
              </p>
            </div>
          )}

          {/* Sign Up Form */}
          {mode === "signup" && !signUpSuccess && (
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Criar conta
                </h2>
                <p className="text-muted-foreground">
                  Comece o seu trial grátis de 30 dias
                </p>
              </div>

              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
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
                  <Label htmlFor="signup-email">Email</Label>
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
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar conta grátis"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-accent hover:underline font-medium"
                >
                  Entrar
                </button>
              </p>
            </div>
          )}

          {/* Sign Up Success */}
          {mode === "signup" && signUpSuccess && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Conta criada!
                </h2>
                <p className="text-muted-foreground">
                  A sua conta foi criada com sucesso. Pode agora fazer login para aceder à plataforma.
                </p>
              </div>
              <Button
                variant="accent"
                className="w-full"
                size="lg"
                onClick={() => {
                  setMode("login");
                  setSignUpSuccess(false);
                }}
              >
                Ir para o login
              </Button>
            </div>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot-password" && !resetEmailSent && (
            <div className="space-y-6">
              <button
                onClick={() => setMode("login")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </button>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Recuperar password
                </h2>
                <p className="text-muted-foreground">
                  Introduza o seu email para receber instruções de recuperação
                </p>
              </div>

              <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="seu@email.com"
                    {...resetForm.register("email")}
                  />
                  {resetForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {resetForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button type="submit" variant="accent" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar email de recuperação"}
                </Button>
              </form>
            </div>
          )}

          {/* Reset Email Sent */}
          {mode === "forgot-password" && resetEmailSent && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Email enviado!
                </h2>
                <p className="text-muted-foreground">
                  Verifique a sua caixa de correio e siga as instruções para redefinir a sua password.
                </p>
              </div>
              <Button
                variant="accent"
                className="w-full"
                size="lg"
                onClick={() => {
                  setMode("login");
                  setResetEmailSent(false);
                }}
              >
                Voltar ao login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
