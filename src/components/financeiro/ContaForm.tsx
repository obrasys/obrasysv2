import { useForm, useWatch } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { TIPO_CONTA_OPTIONS, ORIGEM_CONTA_OPTIONS } from '@/types/financeiro';
import type { ContaFinanceira, ContaFinanceiraFormData, OrigemConta } from '@/types/financeiro';
import type { Obra } from '@/types/obras';
import type { Fornecedor } from '@/types/financeiro';
import type { CategoriaFinanceira } from '@/types/categorias';

const contaSchema = z.object({
  tipo: z.enum(['pagar', 'receber']),
  origem: z.enum(['mao_de_obra', 'material', 'outros']),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  descricao: z.string().optional(),
  data_vencimento: z.string().min(1, 'Data de vencimento é obrigatória'),
  pago: z.boolean().optional(),
  data_pagamento: z.string().optional(),
  obra_id: z.string().optional(),
  fornecedor_id: z.string().optional(),
  cliente_id: z.string().optional(),
  categoria_id: z.string().optional(),
});

interface ContaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta?: ContaFinanceira | null;
  obras?: Obra[];
  fornecedores?: Fornecedor[];
  clientes?: Array<{ id: string; nome: string }>;
  categorias?: CategoriaFinanceira[];
  onSubmit: (data: ContaFinanceiraFormData) => void;
  isLoading?: boolean;
}

export function ContaForm({
  open,
  onOpenChange,
  conta,
  obras = [],
  fornecedores = [],
  clientes = [],
  categorias = [],
  onSubmit,
  isLoading,
}: ContaFormProps) {
  const form = useForm<ContaFinanceiraFormData>({
    resolver: zodResolver(contaSchema),
    defaultValues: {
      tipo: conta?.tipo || 'pagar',
      origem: conta?.origem || 'material',
      valor: conta?.valor ? Number(conta.valor) : 0,
      descricao: conta?.descricao || '',
      data_vencimento: conta?.data_vencimento || new Date().toISOString().split('T')[0],
      pago: conta?.pago || false,
      data_pagamento: conta?.data_pagamento || '',
      obra_id: conta?.obra_id || '',
      fornecedor_id: conta?.fornecedor_id || '',
      cliente_id: conta?.cliente_id || '',
      categoria_id: (conta as unknown as { categoria_id?: string })?.categoria_id || '',
    },
  });

  // Watch origem to filter categorias
  const selectedOrigem = useWatch({ control: form.control, name: 'origem' });
  const filteredCategorias = categorias.filter((cat) => cat.origem === selectedOrigem);

  const handleSubmit = (data: ContaFinanceiraFormData) => {
    onSubmit({
      ...data,
      data_pagamento: data.data_pagamento || undefined,
      obra_id: data.obra_id || undefined,
      fornecedor_id: data.fornecedor_id || undefined,
      cliente_id: data.cliente_id || undefined,
      categoria_id: data.categoria_id || undefined,
      descricao: data.descricao || undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{conta ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPO_CONTA_OPTIONS.map((opt) => (
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
                name="origem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
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
            </div>

            {/* Categoria (subcategoria da origem) */}
            {filteredCategorias.length > 0 && (
              <FormField
                control={form.control}
                name="categoria_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoria</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {filteredCategorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cat.cor }}
                              />
                              {cat.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_vencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Vencimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Pagamento</FormLabel>
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
              name="obra_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Obra</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} 
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma obra (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {obras.map((obra) => (
                        <SelectItem key={obra.id} value={obra.id}>
                          {obra.nome}
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
              name="fornecedor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} 
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {fornecedores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
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
              name="pago"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Marcar como pago</FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {conta ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
