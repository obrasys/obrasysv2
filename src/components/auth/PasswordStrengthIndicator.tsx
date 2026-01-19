import { Check, X } from "lucide-react";
import { getPasswordStrength } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const requirements = [
  { regex: /.{8,}/, label: "Mínimo 8 caracteres" },
  { regex: /[A-Z]/, label: "Uma letra maiúscula" },
  { regex: /[a-z]/, label: "Uma letra minúscula" },
  { regex: /[0-9]/, label: "Um número" },
  { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, label: "Um caractere especial" },
];

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const strength = getPasswordStrength(password);
  
  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Força da password:</span>
          <span className={cn(
            "font-medium",
            strength.label === "Fraca" && "text-destructive",
            strength.label === "Média" && "text-yellow-600",
            strength.label === "Forte" && "text-green-600"
          )}>
            {strength.label}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300", strength.color)}
            style={{ width: `${(strength.score / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 gap-1">
        {requirements.map((req, index) => {
          const isValid = req.regex.test(password);
          return (
            <div 
              key={index} 
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                isValid ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {isValid ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
              <span>{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
