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
import { Loader2 } from 'lucide-react';
import type { Documento, DocumentoFormData, DocumentoTipo } from '@/types/conformidade';
import { DOCUMENTO_TIPO_CONFIG } from '@/types/conformidade';

const formSchema = z.object({
  obra_id: z.string().min(1, 'Selecione uma obra'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['licenca', 'projeto', 'certificado', 'relatorio', 'contrato', 'outro']),
  url: z.string().url('URL inválida'),
  categoria: z.string().optional(),
  data_validade: z.string().optional(),
});

interface DocumentoFormProps {
  obras: Array<{ id: string; nome: string }>;
  documento?: Documento | null;
  onSubmit: (data: DocumentoFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DocumentoForm({
  obras,
  documento,
  onSubmit,
  onCancel,
  isLoading,
}: DocumentoFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      obra_id: documento?.obra_id || '',
      nome: documento?.nome || '',
      tipo: documento?.tipo || 'outro',
      url: documento?.url || '',
      categoria: documento?.categoria || '',
      data_validade: documento?.data_validade || '',
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      obra_id: values.obra_id,
      nome: values.nome,
      tipo: values.tipo as DocumentoTipo,
      url: values.url,
      categoria: values.categoria,
      data_validade: values.data_validade,
    });
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
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Documento *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Licença de Construção" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover">
                  {Object.entries(DOCUMENTO_TIPO_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
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
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do Documento *</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Fase 1, Estrutura, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="data_validade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Validade</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
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
            {documento ? 'Guardar' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
