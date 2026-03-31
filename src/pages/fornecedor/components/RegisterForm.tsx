import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Upload, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { passwordSchema as appPasswordSchema } from "@/lib/validations/auth";

// Constantes
const DISTRICTS = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", "Évora", "Faro", "Guarda",
  "Leiria", "Lisboa", "Portalegre", "Porto", "Santarém", "Setúbal", "Viana do Castelo", "Vila Real", "Viseu",
  "Ilha da Madeira", "Ilha de Porto Santo", "Ilha de Santa Maria", "Ilha de São Miguel", "Ilha Terceira",
  "Ilha da Graciosa", "Ilha de São Jorge", "Ilha do Pico", "Ilha do Faial", "Ilha das Flores", "Ilha do Corvo"
];

const CATEGORIAS = [
  "Materiais de Construção", "Estruturas Metálicas", "LSF", "Eletricidade / ITED", "Canalização",
  "Revestimentos", "Ferragens", "Equipamentos", "Subempreiteiro", "Outros"
];

// NIF validation (Portuguese)
const validateNIF = (nif: string): boolean => {
  if (!/^\d{9}$/.test(nif)) return false;
  const checkDigit = parseInt(nif[8]);
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(nif[i]) * (9 - i);
  }
  const remainder = sum % 11;
  const expected = remainder < 2 ? 0 : 11 - remainder;
  return checkDigit === expected;
};

// Código Postal validation
const codigoPostalRegex = /^\d{4}-\d{3}$/;

// Zod Schemas with improved validation
const registerSchema = z.object({
  // Passo 1: Login
  responsavel_nome: z.string()
    .min(2, "Nome é obrigatório")
    .max(100, "O nome não pode exceder 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "O nome contém caracteres inválidos"),
  email: z.string()
    .min(1, "O email é obrigatório")
    .email("Introduza um email válido")
    .max(255, "O email não pode exceder 255 caracteres"),
  telemovel: z.string()
    .min(9, "O telemóvel deve ter pelo menos 9 dígitos")
    .max(20, "Telemóvel inválido")
    .regex(/^[0-9+\s()-]+$/, "Formato de telemóvel inválido"),
  password: appPasswordSchema,
  confirmPassword: z.string().min(1, "Confirme a sua password"),
  aceita_termos: z.boolean().refine(val => val === true, "Deve aceitar os termos"),
  aceita_comunicacoes: z.boolean().optional(),

  // Passo 2: Empresa
  legal_name: z.string()
    .min(2, "Nome da empresa obrigatório")
    .max(200, "O nome da empresa não pode exceder 200 caracteres"),
  nif: z.string()
    .length(9, "O NIF deve ter exatamente 9 dígitos")
    .regex(/^\d{9}$/, "O NIF deve conter apenas números")
    .refine(validateNIF, "NIF inválido (dígito de controlo incorreto)"),
  morada_completa: z.string()
    .min(5, "Morada obrigatória")
    .max(300, "A morada não pode exceder 300 caracteres"),
  codigo_postal: z.string()
    .regex(codigoPostalRegex, "Formato: 0000-000"),
  localidade: z.string()
    .min(2, "Localidade obrigatória")
    .max(100, "A localidade não pode exceder 100 caracteres"),
  location_district: z.string().min(2, "Distrito obrigatório"),
  pais: z.string().default("Portugal"),
  cae_principal: z.string()
    .min(3, "CAE obrigatório")
    .max(10, "CAE inválido")
    .regex(/^\d+$/, "O CAE deve conter apenas números"),
  cae_secundario: z.string().max(10, "CAE inválido").optional().or(z.literal("")),
  telefone_fixo: z.string()
    .max(20, "Telefone inválido")
    .regex(/^[0-9+\s()-]*$/, "Formato de telefone inválido")
    .optional()
    .or(z.literal("")),
  email_comercial: z.string().email("Email comercial inválido").optional().or(z.literal("")),
  website: z.string().url("URL inválido").optional().or(z.literal("")),
  ano_fundacao: z.string().refine(val => {
    if (!val) return false;
    const year = parseInt(val);
    return year > 1800 && year <= new Date().getFullYear();
  }, "Ano inválido"),
  num_colaboradores: z.string().min(1, "Selecione o número de colaboradores"),
  certificacoes: z.string().max(500, "Máximo 500 caracteres").optional(),

  // Passo 3: Perfil
  categoria_principal: z.string().min(1, "Categoria obrigatória"),
  subcategorias: z.string().max(500, "Máximo 500 caracteres").optional(),
  zona_atuacao: z.enum(["nacional", "distrito", "raio"]),
  distritos_atuacao: z.array(z.string()).optional(),
  raio_atuacao_km: z.string().optional(),
  tipo_fornecimento: z.array(z.string()).min(1, "Selecione pelo menos um tipo"),
  prazo_medio_entrega: z.string().min(1, "Prazo obrigatório"),
  min_order_value: z.string().optional(),
  trabalha_credito: z.boolean().default(false),
  prazo_pagamento_padrao: z.string().optional(),
  desconto_volume: z.boolean().default(false),

  // Passo 4: Config
  aceita_pedidos_plataforma: z.boolean().default(true),
  permite_api: z.boolean().default(false),
  atualizacao_precos: z.enum(["manual", "csv", "api"]),
  frequencia_atualizacao: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      pais: "Portugal",
      aceita_termos: false,
      aceita_comunicacoes: false,
      trabalha_credito: false,
      desconto_volume: false,
      aceita_pedidos_plataforma: true,
      permite_api: false,
      atualizacao_precos: "manual",
      tipo_fornecimento: [],
      distritos_atuacao: [],
    },
    mode: "onChange",
  });

  const { watch, trigger, register, setValue, formState: { errors } } = form;
  const zonaAtuacao = watch("zona_atuacao");
  const trabalhaCredito = watch("trabalha_credito");
  const passwordValue = watch("password") || "";

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["responsavel_nome", "email", "telemovel", "password", "confirmPassword", "aceita_termos"];
    if (step === 2) fieldsToValidate = ["legal_name", "nif", "morada_completa", "codigo_postal", "localidade", "location_district", "cae_principal", "ano_fundacao", "num_colaboradores"];
    if (step === 3) fieldsToValidate = ["categoria_principal", "tipo_fornecimento", "prazo_medio_entrega"];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const metadata = {
        role: "supplier",
        invite_token: inviteToken,
        responsavel_nome: data.responsavel_nome.trim(),
        telemovel: data.telemovel.trim(),
        aceita_termos: data.aceita_termos,
        aceita_comunicacoes: data.aceita_comunicacoes,
        legal_name: data.legal_name.trim(),
        nif: data.nif.trim(),
        morada_completa: data.morada_completa.trim(),
        codigo_postal: data.codigo_postal.trim(),
        localidade: data.localidade.trim(),
        location_district: data.location_district,
        pais: data.pais,
        cae_principal: data.cae_principal.trim(),
        cae_secundario: data.cae_secundario?.trim(),
        telefone_fixo: data.telefone_fixo?.trim(),
        email_comercial: data.email_comercial?.trim() || data.email.trim(),
        website: data.website?.trim(),
        ano_fundacao: parseInt(data.ano_fundacao),
        num_colaboradores: data.num_colaboradores,
        certificacoes: data.certificacoes ? data.certificacoes.split(",").map(s => s.trim()).filter(Boolean) : [],
        categoria_principal: data.categoria_principal,
        subcategorias: data.subcategorias ? data.subcategorias.split(",").map(s => s.trim()).filter(Boolean) : [],
        zona_atuacao: data.zona_atuacao,
        distritos_atuacao: data.distritos_atuacao,
        raio_atuacao_km: data.raio_atuacao_km ? parseInt(data.raio_atuacao_km) : null,
        tipo_fornecimento: data.tipo_fornecimento,
        prazo_medio_entrega: data.prazo_medio_entrega,
        min_order_value: data.min_order_value ? parseFloat(data.min_order_value) : 0,
        trabalha_credito: data.trabalha_credito,
        prazo_pagamento_padrao: data.prazo_pagamento_padrao,
        desconto_volume: data.desconto_volume,
        aceita_pedidos_plataforma: data.aceita_pedidos_plataforma,
        permite_api: data.permite_api,
        atualizacao_precos: data.atualizacao_precos,
        frequencia_atualizacao: data.frequencia_atualizacao,
      };

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;

      if (logoFile && signUpData?.user?.id) {
        try {
          const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
          const filePath = `${signUpData.user.id}/logo.${ext}`;
          await supabase.storage.from('empresa-logos').upload(filePath, logoFile, { upsert: true });
          const { data: urlData } = supabase.storage.from('empresa-logos').getPublicUrl(filePath);
          await supabase.from('supplier_profiles').update({ logo_url: urlData.publicUrl }).eq('user_id', signUpData.user.id);
        } catch (logoErr) {
          console.warn('Logo upload failed, can be added later from profile:', logoErr);
        }
      }

      toast({
        title: "Registo efetuado com sucesso!",
        description: "Verifique o seu email para confirmar a conta.",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no registo",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Acesso", "Empresa", "Comercial", "Integração"];

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-card border rounded-xl shadow-sm">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-10" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > i
                  ? "bg-primary text-primary-foreground"
                  : step === i
                  ? "bg-accent text-white ring-4 ring-accent/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > i ? <CheckCircle2 className="h-4 w-4" /> : i}
            </div>
            <span className={`text-[10px] font-medium ${step >= i ? 'text-foreground' : 'text-muted-foreground'}`}>
              {stepLabels[i - 1]}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {step === 1 && "Dados de Acesso"}
          {step === 2 && "Dados da Empresa"}
          {step === 3 && "Perfil Comercial"}
          {step === 4 && "Integração"}
        </h2>
        <p className="text-muted-foreground">
          {step === 1 && "Crie as suas credenciais para aceder ao portal."}
          {step === 2 && "Informações legais e contactos da sua empresa."}
          {step === 3 && "Defina o seu perfil para receber pedidos relevantes."}
          {step === 4 && "Configure como deseja interagir com a plataforma."}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* STEP 1: LOGIN */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo do Responsável *</Label>
              <Input {...register("responsavel_nome")} placeholder="Nome Apelido" maxLength={100} />
              {errors.responsavel_nome && <p className="text-destructive text-xs">{errors.responsavel_nome.message}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email (Login) *</Label>
                <Input {...register("email")} type="email" placeholder="email@empresa.pt" maxLength={255} />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Telemóvel *</Label>
                <Input {...register("telemovel")} placeholder="912 345 678" maxLength={20} />
                {errors.telemovel && <p className="text-destructive text-xs">{errors.telemovel.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Palavra-passe *</Label>
                <div className="relative">
                  <Input {...register("password")} type={showPassword ? "text" : "password"} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
                <PasswordStrengthIndicator password={passwordValue} />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Palavra-passe *</Label>
                <Input {...register("confirmPassword")} type="password" />
                {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-2">
                <Checkbox id="termos" onCheckedChange={(c) => setValue("aceita_termos", c as boolean)} />
                <Label htmlFor="termos" className="text-sm font-normal leading-tight">
                  Aceito os Termos e Condições e a Política de Privacidade.
                </Label>
              </div>
              {errors.aceita_termos && <p className="text-destructive text-xs">{errors.aceita_termos.message}</p>}

              <div className="flex items-start space-x-2">
                <Checkbox id="coms" onCheckedChange={(c) => setValue("aceita_comunicacoes", c as boolean)} />
                <Label htmlFor="coms" className="text-sm font-normal leading-tight">
                  Aceito receber comunicações comerciais e novidades. (Opcional)
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: EMPRESA */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Logotipo da Empresa (Opcional)</Label>
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/40 transition-colors relative group"
                  onClick={() => document.getElementById('logo-input')?.click()}
                >
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                      <Upload className="w-4 h-4" />
                      <span className="text-[10px]">Logo</span>
                    </div>
                  )}
                </div>
                <input
                  id="logo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast({ title: 'Ficheiro muito grande', description: 'Máximo 5MB', variant: 'destructive' });
                        return;
                      }
                      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                      if (!allowedTypes.includes(file.type)) {
                        toast({ title: 'Formato não suportado', description: 'Use JPG, PNG ou WebP', variant: 'destructive' });
                        return;
                      }
                      setLogoFile(file);
                      setLogoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <div className="text-xs text-muted-foreground">
                  <p>JPG, PNG ou WebP. Máx 5MB.</p>
                  {logoFile && <p className="text-primary mt-1">✓ {logoFile.name}</p>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input {...register("legal_name")} placeholder="Empresa Lda" maxLength={200} />
                {errors.legal_name && <p className="text-destructive text-xs">{errors.legal_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>NIF *</Label>
                <Input {...register("nif")} placeholder="123456789" maxLength={9} />
                {errors.nif && <p className="text-destructive text-xs">{errors.nif.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Morada Completa *</Label>
              <Input {...register("morada_completa")} placeholder="Rua, Número, Andar" maxLength={300} />
              {errors.morada_completa && <p className="text-destructive text-xs">{errors.morada_completa.message}</p>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-1">
                <Label>Código Postal *</Label>
                <Input {...register("codigo_postal")} placeholder="0000-000" maxLength={8} />
                {errors.codigo_postal && <p className="text-destructive text-xs">{errors.codigo_postal.message}</p>}
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Localidade *</Label>
                <Input {...register("localidade")} maxLength={100} />
                {errors.localidade && <p className="text-destructive text-xs">{errors.localidade.message}</p>}
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Distrito *</Label>
                <Select onValueChange={(v) => setValue("location_district", v)} defaultValue={watch("location_district")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.location_district && <p className="text-destructive text-xs">{errors.location_district.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CAE Principal *</Label>
                <Input {...register("cae_principal")} placeholder="Ex: 41200" maxLength={10} />
                {errors.cae_principal && <p className="text-destructive text-xs">{errors.cae_principal.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>CAE Secundário (Opcional)</Label>
                <Input {...register("cae_secundario")} maxLength={10} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Comercial (Opcional)</Label>
                <Input {...register("email_comercial")} placeholder="comercial@empresa.pt" />
              </div>
              <div className="space-y-2">
                <Label>Telefone Fixo (Opcional)</Label>
                <Input {...register("telefone_fixo")} maxLength={20} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Website (Opcional)</Label>
                <Input {...register("website")} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Ano Fundação *</Label>
                <Input {...register("ano_fundacao")} type="number" placeholder="2000" min={1800} max={new Date().getFullYear()} />
                {errors.ano_fundacao && <p className="text-destructive text-xs">{errors.ano_fundacao.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nº Colaboradores *</Label>
                <Select onValueChange={(v) => setValue("num_colaboradores", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5">1-5</SelectItem>
                    <SelectItem value="6-10">6-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="200+">200+</SelectItem>
                  </SelectContent>
                </Select>
                {errors.num_colaboradores && <p className="text-destructive text-xs">{errors.num_colaboradores.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Certificações (ISO, Alvará, etc.)</Label>
              <Input {...register("certificacoes")} placeholder="Separe por vírgulas" maxLength={500} />
              <p className="text-xs text-muted-foreground">Ex: ISO 9001, Alvará 12345, PME Líder</p>
            </div>
          </div>
        )}

        {/* STEP 3: PERFIL COMERCIAL */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria Principal *</Label>
              <Select onValueChange={(v) => setValue("categoria_principal", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoria_principal && <p className="text-destructive text-xs">{errors.categoria_principal.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Subcategorias (separar por vírgulas)</Label>
              <Textarea {...register("subcategorias")} placeholder="Ex: Cimento, Tijolo, Areia" maxLength={500} />
            </div>

            <div className="space-y-2">
              <Label>Zona de Atuação *</Label>
              <Select onValueChange={(v) => setValue("zona_atuacao", v as any)} defaultValue={zonaAtuacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="distrito">Distritos Específicos</SelectItem>
                  <SelectItem value="raio">Raio (km)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {zonaAtuacao === "distrito" && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/20">
                <Label>Selecione os Distritos</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 h-40 overflow-y-auto">
                  {DISTRICTS.map((d) => (
                    <div key={d} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`dist-${d}`} 
                        onCheckedChange={(checked) => {
                          const current = watch("distritos_atuacao") || [];
                          if (checked) setValue("distritos_atuacao", [...current, d]);
                          else setValue("distritos_atuacao", current.filter(x => x !== d));
                        }}
                      />
                      <Label htmlFor={`dist-${d}`} className="font-normal text-xs">{d}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {zonaAtuacao === "raio" && (
              <div className="space-y-2">
                <Label>Raio de atuação (km)</Label>
                <Input {...register("raio_atuacao_km")} type="number" placeholder="Ex: 50" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Tipo de Fornecimento *</Label>
              <div className="flex flex-wrap gap-4">
                {["Venda direta", "Apenas por encomenda", "Produção própria", "Distribuidor", "Revendedor"].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`type-${type}`} 
                      onCheckedChange={(checked) => {
                        const current = watch("tipo_fornecimento") || [];
                        if (checked) setValue("tipo_fornecimento", [...current, type]);
                        else setValue("tipo_fornecimento", current.filter(x => x !== type));
                      }}
                    />
                    <Label htmlFor={`type-${type}`} className="font-normal">{type}</Label>
                  </div>
                ))}
              </div>
              {errors.tipo_fornecimento && <p className="text-destructive text-xs">{errors.tipo_fornecimento.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prazo Médio de Entrega *</Label>
                <Select onValueChange={(v) => setValue("prazo_medio_entrega", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24h</SelectItem>
                    <SelectItem value="48h">48h</SelectItem>
                    <SelectItem value="3-5 dias">3-5 dias</SelectItem>
                    <SelectItem value="Sob consulta">Sob consulta</SelectItem>
                  </SelectContent>
                </Select>
                {errors.prazo_medio_entrega && <p className="text-destructive text-xs">{errors.prazo_medio_entrega.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Pedido Mínimo (€) (Opcional)</Label>
                <Input {...register("min_order_value")} type="number" placeholder="0" />
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label>Trabalha com crédito?</Label>
                <Checkbox checked={trabalhaCredito} onCheckedChange={(c) => setValue("trabalha_credito", c as boolean)} />
              </div>
              
              {trabalhaCredito && (
                <div className="space-y-2">
                  <Label>Prazo de pagamento padrão</Label>
                  <Select onValueChange={(v) => setValue("prazo_pagamento_padrao", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30 dias">30 dias</SelectItem>
                      <SelectItem value="60 dias">60 dias</SelectItem>
                      <SelectItem value="90 dias">90 dias</SelectItem>
                      <SelectItem value="Negociável">Negociável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Desconto por volume?</Label>
                <Checkbox checked={watch("desconto_volume")} onCheckedChange={(c) => setValue("desconto_volume", c as boolean)} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: INTEGRAÇÃO */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-4 p-4 border rounded-lg bg-accent/5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Receber Pedidos na Plataforma</Label>
                  <p className="text-sm text-muted-foreground">Permite que construtores enviem pedidos de orçamento diretamente.</p>
                </div>
                <Checkbox 
                  checked={watch("aceita_pedidos_plataforma")} 
                  onCheckedChange={(c) => setValue("aceita_pedidos_plataforma", c as boolean)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Integração via API</Label>
                  <p className="text-sm text-muted-foreground">Para sistemas ERP avançados.</p>
                </div>
                <Checkbox 
                  checked={watch("permite_api")} 
                  onCheckedChange={(c) => setValue("permite_api", c as boolean)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Atualização de Preços</Label>
                <Select onValueChange={(v) => setValue("atualizacao_precos", v as any)} defaultValue="manual">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (Portal)</SelectItem>
                    <SelectItem value="csv">Importação CSV</SelectItem>
                    <SelectItem value="api">Via API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência de Atualização</Label>
                <Select onValueChange={(v) => setValue("frequencia_atualizacao", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diaria">Diária</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t mt-6">
          {step === 1 ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Já tenho conta
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={prevStep}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
            </Button>
          )}

          {step < 4 ? (
            <Button type="button" onClick={nextStep} variant="accent">
              Próximo <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" variant="accent" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Finalizar Registo
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
