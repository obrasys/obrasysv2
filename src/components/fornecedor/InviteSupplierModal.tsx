import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTenantSupplierInvite } from '@/hooks/useTenantSupplierInvites';
import { AREAS_ATUACAO_FORNECEDOR } from '@/types/financeiro';

const schema = z.object({
  email: z.string().trim().email('Email inválido').max(254),
  nome_fornecedor: z.string().trim().max(150).optional().or(z.literal('')),
  categoria: z.string().max(80).optional().or(z.literal('')),
  mensagem: z.string().trim().max(1000).optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-preenche com um fornecedor existente */
  defaultFornecedorId?: string;
  defaultEmail?: string;
  defaultNome?: string;
}

export function InviteSupplierModal({
  open,
  onOpenChange,
  defaultFornecedorId,
  defaultEmail,
  defaultNome,
}: Props) {
  const create = useCreateTenantSupplierInvite();
  const [categoria, setCategoria] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: defaultEmail || '',
      nome_fornecedor: defaultNome || '',
      categoria: '',
      mensagem: '',
    },
  });

  const handleSubmit = async (data: FormData) => {
    await create.mutateAsync({
      email: data.email,
      nome_fornecedor: data.nome_fornecedor || undefined,
      categoria: categoria || undefined,
      mensagem: data.mensagem || undefined,
      fornecedor_id: defaultFornecedorId || null,
    });
    form.reset();
    setCategoria('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar fornecedor</DialogTitle>
          <DialogDescription>
            O fornecedor receberá um email para criar conta e ligar-se à sua empresa.
            Só verá pedidos que partirem desta empresa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do fornecedor *</Label>
            <Input
              id="email"
              type="email"
              placeholder="contacto@empresa.pt"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_fornecedor">Nome da empresa fornecedora</Label>
            <Input
              id="nome_fornecedor"
              placeholder="Ex: Materiais XPTO, Lda."
              {...form.register('nome_fornecedor')}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria de fornecimento</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar categoria (opcional)" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {AREAS_ATUACAO_FORNECEDOR.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem (opcional)</Label>
            <Textarea
              id="mensagem"
              placeholder="Olá, gostaríamos de o ter como fornecedor parceiro..."
              rows={3}
              {...form.register('mensagem')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
