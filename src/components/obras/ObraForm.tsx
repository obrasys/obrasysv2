import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Obra, ObraFormData } from '@/types/obras';
import { OBRA_STATUS_OPTIONS } from '@/types/obras';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cliente: z.string().optional(),
  endereco: z.string().optional(),
  status: z.string().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  valor_previsto: z.coerce.number().min(0).optional(),
});

interface ObraFormProps {
  obra?: Obra;
  onSubmit: (data: ObraFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ObraForm({ obra, onSubmit, onCancel, isLoading }: ObraFormProps) {
  const form = useForm<ObraFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: obra?.nome || '',
      cliente: obra?.cliente || '',
      endereco: obra?.endereco || '',
      status: obra?.status || 'planeamento',
      data_inicio: obra?.data_inicio || '',
      data_fim: obra?.data_fim || '',
      valor_previsto: obra?.valor_previsto || 0,
    },
  });

  const handleSubmit = (data: ObraFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Obra *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Reabilitação Edifício Av. Lisboa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="cliente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do cliente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-background">
                    {OBRA_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="endereco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Localização</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Endereço completo da obra" 
                  className="resize-none" 
                  rows={2}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="data_inicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Início</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_fim"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Fim Prevista</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="valor_previsto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Previsto (€)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01"
                  min="0"
                  placeholder="0.00" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'A guardar...' : obra ? 'Atualizar' : 'Criar Obra'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
