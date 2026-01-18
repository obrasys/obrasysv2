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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { LivroObra, LivroObraFormData } from '@/types/conformidade';

const formSchema = z.object({
  obra_id: z.string().min(1, 'Selecione uma obra'),
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
});

interface LivroObraFormProps {
  obras: Array<{ id: string; nome: string }>;
  livroObra?: LivroObra | null;
  onSubmit: (data: LivroObraFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LivroObraForm({
  obras,
  livroObra,
  onSubmit,
  onCancel,
  isLoading,
}: LivroObraFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      obra_id: livroObra?.obra_id || '',
      titulo: livroObra?.titulo || '',
      descricao: livroObra?.descricao || '',
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values as LivroObraFormData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="obra_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Obra *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma obra" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover">
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
          name="titulo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Livro de Obra - Fase 1" {...field} />
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
                <Textarea
                  placeholder="Descreva o conteúdo do livro de obra..."
                  rows={4}
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
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {livroObra ? 'Guardar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
