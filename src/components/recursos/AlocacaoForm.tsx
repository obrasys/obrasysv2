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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AlocacaoObraFormData } from '@/types/alocacoes';
import type { EquipaMembro } from '@/types/recursos';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  membro_id: z.string().min(1, 'Selecione um membro'),
  obra_id: z.string().min(1, 'Selecione uma obra'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().optional(),
  funcao: z.string().optional(),
  custo_hora: z.coerce.number().min(0).optional(),
  custo_dia: z.coerce.number().min(0).optional(),
  observacoes: z.string().optional(),
});

interface AlocacaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membros: EquipaMembro[];
  obras: { id: string; nome: string }[];
  defaultMembroId?: string;
  defaultObraId?: string;
  onSubmit: (data: AlocacaoObraFormData) => Promise<void>;
  isLoading?: boolean;
}

export function AlocacaoForm({
  open,
  onOpenChange,
  membros,
  obras,
  defaultMembroId,
  defaultObraId,
  onSubmit,
  isLoading,
}: AlocacaoFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      membro_id: defaultMembroId || '',
      obra_id: defaultObraId || '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: '',
      funcao: '',
      custo_hora: undefined,
      custo_dia: undefined,
      observacoes: '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit({
      membro_id: values.membro_id,
      obra_id: values.obra_id,
      data_inicio: values.data_inicio,
      data_fim: values.data_fim || undefined,
      funcao: values.funcao || undefined,
      custo_hora: values.custo_hora,
      custo_dia: values.custo_dia,
      observacoes: values.observacoes || undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alocar Membro a Obra</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="membro_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membro da Equipa *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar membro" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {membros.filter(m => m.ativo).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome} {m.cargo ? `(${m.cargo})` : ''}
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
              name="obra_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Obra *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar obra" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {obras.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.nome}
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
              name="funcao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função nesta Obra</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Encarregado, Pedreiro..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Início *</FormLabel>
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
                    <FormLabel>Data Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="custo_hora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo/Hora (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="custo_dia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo/Dia (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} />
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
                    <Textarea placeholder="Notas sobre a alocação..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alocar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
