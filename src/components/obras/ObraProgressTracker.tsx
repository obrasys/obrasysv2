import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ObraProgressTracking, ObraProgressFormData } from '@/types/obras';
import { UNIDADES } from '@/types/orcamentos';

const formSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  quantidade_prevista: z.coerce.number().min(0, 'Quantidade deve ser positiva'),
  quantidade_executada: z.coerce.number().min(0, 'Quantidade deve ser positiva'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
});

interface ObraProgressTrackerProps {
  progressItems: ObraProgressTracking[];
  onAdd: (data: ObraProgressFormData) => void;
  onUpdate: (data: ObraProgressFormData & { progressId: string }) => void;
  onDelete: (progressId: string) => void;
  isLoading?: boolean;
}

export function ObraProgressTracker({
  progressItems,
  onAdd,
  onUpdate,
  onDelete,
  isLoading,
}: ObraProgressTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<ObraProgressFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: '',
      quantidade_prevista: 0,
      quantidade_executada: 0,
      unidade: 'un',
    },
  });

  const handleSubmit = (data: ObraProgressFormData) => {
    if (editingId) {
      onUpdate({ ...data, progressId: editingId });
      setEditingId(null);
    } else {
      onAdd(data);
    }
    form.reset();
    setShowForm(false);
  };

  const startEdit = (item: ObraProgressTracking) => {
    setEditingId(item.id);
    form.reset({
      descricao: item.descricao,
      quantidade_prevista: item.quantidade_prevista,
      quantidade_executada: item.quantidade_executada,
      unidade: item.unidade,
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    form.reset();
    setShowForm(false);
  };

  const averageProgress = progressItems.length > 0
    ? progressItems.reduce((sum, item) => sum + item.percentagem, 0) / progressItems.length
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Progresso da Obra</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe a execução de cada fase
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold">{Math.round(averageProgress)}%</p>
            <p className="text-xs text-muted-foreground">Progresso Médio</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <Progress value={averageProgress} className="h-3" />

        {/* Form */}
        {showForm && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Estrutura de betão" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="quantidade_prevista"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qtd. Prevista</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantidade_executada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qtd. Executada</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
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
                              <SelectValue placeholder="Un." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background">
                            {UNIDADES.map((un) => (
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
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={isLoading}>
                    <Check className="w-4 h-4 mr-1" />
                    {editingId ? 'Atualizar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Table */}
        {progressItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Prevista</TableHead>
                <TableHead className="text-right">Executada</TableHead>
                <TableHead className="text-center">Unidade</TableHead>
                <TableHead className="text-center">Progresso</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progressItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.descricao}</TableCell>
                  <TableCell className="text-right">{item.quantidade_prevista}</TableCell>
                  <TableCell className="text-right">{item.quantidade_executada}</TableCell>
                  <TableCell className="text-center">{item.unidade}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={item.percentagem} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-12 text-right">
                        {Math.round(item.percentagem)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(item)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          !showForm && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum item de progresso registado.</p>
              <p className="text-sm mt-1">Adicione itens para acompanhar a execução da obra.</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
