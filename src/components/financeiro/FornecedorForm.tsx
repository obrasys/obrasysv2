import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AREAS_ATUACAO_FORNECEDOR, type Fornecedor, type FornecedorFormData } from '@/types/financeiro';

const fornecedorSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(200, 'Máx. 200 caracteres'),
  email: z.string().trim().email('Email inválido').max(200).optional().or(z.literal('')),
  telefone: z.string().trim().max(50).optional(),
  endereco: z.string().trim().max(500).optional(),
  nif: z.string().trim().max(20).optional(),
  area_atuacao: z.string().trim().max(100).optional(),
  ativo: z.boolean().optional(),
});

interface FornecedorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor?: Fornecedor | null;
  onSubmit: (data: FornecedorFormData & { ativo?: boolean }) => void;
  isLoading?: boolean;
}

export function FornecedorForm({
  open,
  onOpenChange,
  fornecedor,
  onSubmit,
  isLoading,
}: FornecedorFormProps) {
  const form = useForm<FornecedorFormData & { ativo?: boolean }>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      nome: fornecedor?.nome || '',
      email: fornecedor?.email || '',
      telefone: fornecedor?.telefone || '',
      endereco: fornecedor?.endereco || '',
      nif: fornecedor?.nif || '',
      area_atuacao: fornecedor?.area_atuacao || '',
      ativo: fornecedor?.ativo ?? true,
    },
  });

  const handleSubmit = (data: FornecedorFormData & { ativo?: boolean }) => {
    onSubmit({
      ...data,
      email: data.email || undefined,
      telefone: data.telefone || undefined,
      endereco: data.endereco || undefined,
      nif: data.nif || undefined,
      area_atuacao: data.area_atuacao || undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do fornecedor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="+351 912 345 678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nif"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIF</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Morada completa" {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fornecedor && (
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Fornecedor ativo</FormLabel>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {fornecedor ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
