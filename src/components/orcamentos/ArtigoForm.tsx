import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UNIDADES, type ArtigoFormData } from '@/types/orcamentos';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  codigo: z.string().optional(),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  quantidade: z.number().min(0, 'Quantidade deve ser positiva'),
  preco_unitario: z.number().min(0, 'Preço deve ser positivo'),
});

interface ArtigoFormProps {
  defaultValues?: Partial<ArtigoFormData>;
  onSubmit: (data: ArtigoFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function ArtigoForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = 'Adicionar',
}: ArtigoFormProps) {
  const form = useForm<ArtigoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: '',
      descricao: '',
      unidade: 'un',
      quantidade: 1,
      preco_unitario: 0,
      ...defaultValues,
    },
  });

  const handleSubmit = (data: ArtigoFormData) => {
    onSubmit(data);
  };

  const valorTotal = form.watch('quantidade') * form.watch('preco_unitario');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: ALV.001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidade</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover">
                    {UNIDADES.map((unidade) => (
                      <SelectItem key={unidade.value} value={unidade.value}>
                        {unidade.label}
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
            name="quantidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.001}
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preco_unitario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço Unitário (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o artigo de trabalho..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Valor Total: </span>
            <span className="font-semibold text-primary">{formatCurrency(valorTotal)}</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
