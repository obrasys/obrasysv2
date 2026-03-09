import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type UserRole = "admin" | "gestor" | "fiscal" | "cliente" | "financeiro" | "sales";

const ALL_ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Acesso total ao sistema" },
  { value: "gestor", label: "Gestor", description: "Gestão de obras e orçamentos" },
  { value: "fiscal", label: "Fiscal", description: "Fiscalização de obras" },
  { value: "financeiro", label: "Financeiro", description: "Gestão financeira" },
  { value: "sales", label: "Sales", description: "Equipa comercial" },
  { value: "cliente", label: "Cliente", description: "Acesso ao portal de cliente" },
];

// Regular users cannot assign admin role
const REGULAR_ROLE_OPTIONS = ALL_ROLE_OPTIONS.filter(r => r.value !== "admin");

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const { session } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("gestor");

  const roleOptions = isSuperAdmin ? ALL_ROLE_OPTIONS : REGULAR_ROLE_OPTIONS;

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action: "create_user", email, nome, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Utilizador criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      onOpenChange(false);
      setNome("");
      setEmail("");
      setRole("gestor");
    },
    onError: (error) => {
      toast.error("Erro ao criar utilizador: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }
    createUserMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Utilizador
          </DialogTitle>
          <DialogDescription>
            O novo utilizador receberá um email com as instruções de acesso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Permissões</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex flex-col">
                      <span>{r.label}</span>
                      <span className="text-xs text-muted-foreground">{r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createUserMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
