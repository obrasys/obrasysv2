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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ORIGEM_CONTA_OPTIONS } from '@/types/financeiro';
import { CORES_CATEGORIA } from '@/types/categorias';
import type { CategoriaFinanceira, CategoriaFormData } from '@/types/categorias';

const categoriaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  origem: z.enum(['mao_de_obra', 'material', 'outros']),
  cor: z.string().optional(),
});

interface CategoriaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria?: CategoriaFinanceira | null;
  onSubmit: (data: CategoriaFormData) => void;
  isLoading?: boolean;
}

export function CategoriaForm({
  open,
  onOpenChange,
  categoria,
  onSubmit,
  isLoading,
}: CategoriaFormProps) {
  const form = useForm<CategoriaFormData>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nome: categoria?.nome || '',
      origem: categoria?.origem || 'material',
      cor: categoria?.cor || '#6b7280',
    },
  });

  const handleSubmit = (data: CategoriaFormData) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{categoria ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Cimento, Eletricista..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="origem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Origem</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ORIGEM_CONTA_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {CORES_CATEGORIA.map((cor) => (
                      <button
                        key={cor.value}
                        type="button"
                        onClick={() => field.onChange(cor.value)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          field.value === cor.value
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: cor.value }}
                        title={cor.label}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {categoria ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
