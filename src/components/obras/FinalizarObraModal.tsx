import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Flag, DollarSign, Calendar, FileText, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  FormDescription,
} from '@/components/ui/form';
import type { Obra } from '@/types/obras';

const formSchema = z.object({
  valor_adjudicacao: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  valor_adicional: z.coerce.number().min(0).optional(),
  data_vencimento: z.string().min(1, 'Data de vencimento é obrigatória'),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FinalizarObraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obra: Obra;
  onConfirm: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

export function FinalizarObraModal({
  open,
  onOpenChange,
  obra,
  onConfirm,
  isLoading = false,
}: FinalizarObraModalProps) {
  const [error, setError] = useState<string | null>(null);

  const valorOrcamentos = obra.orcamentos?.reduce((sum, orc) => sum + (orc.valor_total || 0), 0) || 0;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valor_adjudicacao: valorOrcamentos || obra.valor_previsto || 0,
      valor_adicional: 0,
      data_vencimento: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      descricao: `Fecho de obra: ${obra.nome}`,
      observacoes: '',
    },
  });

  const handleSubmit = async (data: FormData) => {
    try {
      setError(null);
      await onConfirm(data);
      form.reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar obra');
    }
  };

  const valorTotal = (form.watch('valor_adjudicacao') || 0) + (form.watch('valor_adicional') || 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-primary" />
            Finalizar Obra
          </DialogTitle>
          <DialogDescription>
            Ao finalizar a obra "{obra.nome}", será criada uma conta a receber no módulo financeiro com o valor de adjudicação.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Valor de Adjudicação */}
            <FormField
              control={form.control}
              name="valor_adjudicacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Valor de Adjudicação (€)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Valor orçamentado: {formatCurrency(valorOrcamentos)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor Adicional / Trabalhos Extra */}
            <FormField
              control={form.control}
              name="valor_adicional"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trabalhos Adicionais (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Valor de trabalhos extra ou revisões de preços
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor Total Preview */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor Total a Receber</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(valorTotal)}
                </span>
              </div>
            </div>

            {/* Data de Vencimento */}
            <FormField
              control={form.control}
              name="data_vencimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data de Vencimento
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Data prevista para recebimento do valor
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Descrição
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição da conta a receber" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionais sobre a finalização..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A finalizar...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4 mr-2" />
                    Finalizar Obra
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
