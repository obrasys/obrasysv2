import { useState } from 'react';
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
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react';
import type { ChecklistConformidade, ChecklistFormData, ChecklistItem } from '@/types/conformidade';

const formSchema = z.object({
  obra_id: z.string().min(1, 'Selecione uma obra'),
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
});

interface ChecklistFormProps {
  obras: Array<{ id: string; nome: string }>;
  checklist?: ChecklistConformidade | null;
  onSubmit: (data: ChecklistFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ChecklistForm({
  obras,
  checklist,
  onSubmit,
  onCancel,
  isLoading,
}: ChecklistFormProps) {
  const [itens, setItens] = useState<ChecklistItem[]>(
    checklist?.itens || []
  );
  const [newItemText, setNewItemText] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      obra_id: checklist?.obra_id || '',
      titulo: checklist?.titulo || '',
      descricao: checklist?.descricao || '',
    },
  });

  const addItem = () => {
    if (newItemText.trim()) {
      setItens([
        ...itens,
        {
          id: crypto.randomUUID(),
          descricao: newItemText.trim(),
          concluido: false,
        },
      ]);
      setNewItemText('');
    }
  };

  const removeItem = (id: string) => {
    setItens(itens.filter((item) => item.id !== id));
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      obra_id: values.obra_id,
      titulo: values.titulo,
      descricao: values.descricao,
      itens,
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
          name="titulo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Verificação de Segurança" {...field} />
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
                  placeholder="Descreva o objetivo desta checklist..."
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Items list */}
        <div className="space-y-3">
          <FormLabel>Itens da Checklist</FormLabel>
          
          {/* Add new item */}
          <div className="flex gap-2">
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Adicionar novo item..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Items */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {itens.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 bg-muted rounded-lg"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                <span className="flex-1 text-sm">{item.descricao}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {itens.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Adicione itens à checklist
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || itens.length === 0}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {checklist ? 'Guardar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
