import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UNIDADES_MEDIDA } from '@/types/autos-medicao';
import type { AutoMedicaoItem, AutoMedicaoItemFormData } from '@/types/autos-medicao';

const formSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  capitulo: z.string().optional(),
  zona: z.string().optional(),
  piso: z.string().optional(),
  localizacao: z.string().optional(),
  quantidade_prevista: z.number().min(0).optional(),
  quantidade_atual: z.number().min(0).optional(),
  preco_unitario: z.number().min(0).optional(),
  tolerancia_maxima: z.number().min(0).max(100).optional(),
  observacoes: z.string().optional(),
});

interface AutoMedicaoItemFormProps {
  item?: AutoMedicaoItem;
  onSubmit: (data: AutoMedicaoItemFormData) => void;
}

export function AutoMedicaoItemForm({ item, onSubmit }: AutoMedicaoItemFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: item?.codigo || '',
      descricao: item?.descricao || '',
      unidade: item?.unidade || 'm²',
      capitulo: item?.capitulo || '',
      zona: item?.zona || '',
      piso: item?.piso || '',
      localizacao: item?.localizacao || '',
      quantidade_prevista: item?.quantidade_prevista || 0,
      quantidade_atual: item?.quantidade_atual || 0,
      preco_unitario: item?.preco_unitario || 0,
      tolerancia_maxima: item?.tolerancia_maxima || 5,
      observacoes: item?.observacoes || '',
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values as AutoMedicaoItemFormData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 1.1.1" {...field} />
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
                <FormLabel>Unidade *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {UNIDADES_MEDIDA.map(un => (
                      <SelectItem key={un.value} value={un.value}>
                        {un.label}
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
            name="capitulo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capítulo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Estrutura" {...field} />
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
              <FormLabel>Descrição *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descrição detalhada do trabalho..." 
                  rows={2}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="zona"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Bloco A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="piso"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Piso</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Piso 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="localizacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Localização</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Sala 101" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <FormField
            control={form.control}
            name="quantidade_prevista"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qtd. Prevista</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantidade_atual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qtd. Atual</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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
                    step="0.01"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tolerancia_maxima"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tolerância (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1"
                    min={0}
                    max={100}
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 5)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações adicionais..." 
                  rows={2}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">
            {item ? 'Atualizar Item' : 'Adicionar Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
