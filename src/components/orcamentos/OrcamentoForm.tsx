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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useObras } from '@/hooks/useOrcamentos';
import { useClientes } from '@/hooks/useClientes';
import { FiscalContextSection } from '@/components/orcamentos/FiscalContextSection';
import type { OrcamentoFormData, CustosIndiretos } from '@/types/orcamentos';
import { Loader2, Building2, User, Save } from 'lucide-react';

const formSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  obra_id: z.string().optional(),
  cliente_id: z.string().optional(),
  margem_lucro: z.number().min(0).max(99.99, 'Margem deve ser inferior a 100%'),
  custos_indiretos: z.object({
    estaleiro: z.number().min(0),
    seguros: z.number().min(0),
    licenciamento: z.number().min(0),
  }),
  tipo_obra: z.string().optional(),
  tipo_cliente: z.string().optional(),
  tipo_operacao: z.string().optional(),
});

interface OrcamentoFormProps {
  defaultValues?: Partial<OrcamentoFormData>;
  onSubmit: (data: OrcamentoFormData) => void;
  onSaveDraft?: (data: OrcamentoFormData) => void;
  isLoading?: boolean;
  isSavingDraft?: boolean;
  submitLabel?: string;
}

export function OrcamentoForm({
  defaultValues,
  onSubmit,
  onSaveDraft,
  isLoading,
  isSavingDraft,
  submitLabel = 'Criar Orçamento',
}: OrcamentoFormProps) {
  const { obras, isLoading: loadingObras } = useObras();
  const { clientesAtivos, isLoading: loadingClientes } = useClientes();

  const form = useForm<OrcamentoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: '',
      obra_id: undefined,
      cliente_id: undefined,
      margem_lucro: 15,
      custos_indiretos: {
        estaleiro: 0,
        seguros: 0,
        licenciamento: 0,
      },
      tipo_obra: undefined,
      tipo_cliente: undefined,
      tipo_operacao: undefined,
      ...defaultValues,
    },
  });

  const handleSubmit = (data: OrcamentoFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="titulo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título do Orçamento</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Remodelação Apartamento T3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover">
                  {loadingClientes ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : clientesAtivos && clientesAtivos.length > 0 ? (
                    clientesAtivos.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {cliente.nome}
                          {cliente.empresa && (
                            <span className="text-muted-foreground">({cliente.empresa})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado
                    </div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="obra_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Obra Associada (opcional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar obra..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover">
                  {loadingObras ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : obras && obras.length > 0 ? (
                    obras.map((obra) => (
                      <SelectItem key={obra.id} value={obra.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {obra.nome}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Nenhuma obra encontrada
                    </div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="margem_lucro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Margem de Lucro: {field.value}%</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={50}
                  step={1}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="py-4"
                />
              </FormControl>
              <FormDescription className="text-xs" title="Margem é calculada sobre o preço de venda final. Ex: 30% de margem sobre custo de 100 € = preço de venda de 142,86 €.">
                Margem sobre o preço de venda final. Não confundir com markup sobre o custo.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FiscalContextSection form={form} />

        <div className="space-y-4">
          <h4 className="font-medium text-sm">Custos Indiretos</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="custos_indiretos.estaleiro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estaleiro (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
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
              name="custos_indiretos.seguros"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seguros (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
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
              name="custos_indiretos.licenciamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Licenciamento (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex gap-3">
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isSavingDraft || isLoading}
              onClick={() => {
                const values = form.getValues();
                if (values.titulo) {
                  onSaveDraft(values);
                } else {
                  form.setError('titulo', { message: 'Título é obrigatório' });
                }
              }}
            >
              {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Rascunho
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={isLoading || isSavingDraft}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
