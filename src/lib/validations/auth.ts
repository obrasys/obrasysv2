import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "O email é obrigatório")
  .email("Introduza um email válido");

export const passwordSchema = z
  .string()
  .min(8, "A password deve ter pelo menos 8 caracteres")
  .regex(/[A-Z]/, "A password deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "A password deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "A password deve conter pelo menos um número")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "A password deve conter pelo menos um caractere especial (!@#$%^&*...)");

// Helper function to calculate password strength
export const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  
  if (score <= 2) return { score, label: "Fraca", color: "bg-destructive" };
  if (score <= 4) return { score, label: "Média", color: "bg-yellow-500" };
  return { score, label: "Forte", color: "bg-green-500" };
};

export const nomeSchema = z
  .string()
  .min(2, "O nome deve ter pelo menos 2 caracteres")
  .max(100, "O nome não pode exceder 100 caracteres");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "A password é obrigatória"),
});

export const signUpSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirme a sua password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const newPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirme a sua password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;
