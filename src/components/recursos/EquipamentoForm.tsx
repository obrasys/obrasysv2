import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useObras } from '@/hooks/useObras';
import { ResourcePhotoUpload } from './ResourcePhotoUpload';
import type { Equipamento, EquipamentoFormData } from '@/types/recursos';
import { ESTADO_EQUIPAMENTO_CONFIG, CATEGORIA_EQUIPAMENTO_OPTIONS } from '@/types/recursos';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  codigo: z.string().max(50).optional(),
  categoria: z.string().max(100).optional(),
  marca: z.string().max(100).optional(),
  modelo: z.string().max(100).optional(),
  numero_serie: z.string().max(100).optional(),
  data_aquisicao: z.string().optional(),
  valor_aquisicao: z.coerce.number().min(0).optional(),
  estado: z.string().default('disponivel'),
  localizacao: z.string().max(255).optional(),
  obra_id: z.string().optional(),
  observacoes: z.string().optional(),
});

interface EquipamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento?: Equipamento | null;
  onSubmit: (data: EquipamentoFormData) => Promise<void>;
  isLoading?: boolean;
}

export function EquipamentoForm({ open, onOpenChange, equipamento, onSubmit, isLoading }: EquipamentoFormProps) {
  const { obras } = useObras();
  const [fotoUrl, setFotoUrl] = useState<string>(equipamento?.foto_url || '');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: equipamento?.nome || '',
      codigo: equipamento?.codigo || '',
      categoria: equipamento?.categoria || '',
      marca: equipamento?.marca || '',
      modelo: equipamento?.modelo || '',
      numero_serie: equipamento?.numero_serie || '',
      data_aquisicao: equipamento?.data_aquisicao || '',
      valor_aquisicao: equipamento?.valor_aquisicao || undefined,
      estado: equipamento?.estado || 'disponivel',
      localizacao: equipamento?.localizacao || '',
      obra_id: equipamento?.obra_id || '',
      observacoes: equipamento?.observacoes || '',
    },
  });

  const initials = (form.watch('nome') || 'E')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit({
      nome: values.nome,
      codigo: values.codigo || undefined,
      categoria: values.categoria || undefined,
      marca: values.marca || undefined,
      modelo: values.modelo || undefined,
      numero_serie: values.numero_serie || undefined,
      data_aquisicao: values.data_aquisicao || undefined,
      valor_aquisicao: values.valor_aquisicao,
      estado: values.estado as EquipamentoFormData['estado'],
      localizacao: values.localizacao || undefined,
      obra_id: values.obra_id === 'none' ? undefined : values.obra_id,
      observacoes: values.observacoes || undefined,
      foto_url: fotoUrl || undefined,
    });
    form.reset();
    setFotoUrl('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{equipamento ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <ResourcePhotoUpload currentUrl={fotoUrl} fallbackInitials={initials} onUpload={setFotoUrl} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Nome *</FormLabel><FormControl><Input placeholder="Nome do equipamento" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="codigo" render={({ field }) => (
                <FormItem><FormLabel>Código</FormLabel><FormControl><Input placeholder="EQ-001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="categoria" render={({ field }) => (
                <FormItem><FormLabel>Categoria</FormLabel>
                  <Select value={field.value || 'none'} onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="none">Nenhuma</SelectItem>
                      {CATEGORIA_EQUIPAMENTO_OPTIONS.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="marca" render={({ field }) => (
                <FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Marca" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="modelo" render={({ field }) => (
                <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Modelo" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="numero_serie" render={({ field }) => (
                <FormItem><FormLabel>Nº de Série</FormLabel><FormControl><Input placeholder="Número de série" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="estado" render={({ field }) => (
                <FormItem><FormLabel>Estado</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar estado" /></SelectTrigger></FormControl>
                    <SelectContent>{Object.entries(ESTADO_EQUIPAMENTO_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="data_aquisicao" render={({ field }) => (
                <FormItem><FormLabel>Data Aquisição</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="valor_aquisicao" render={({ field }) => (
                <FormItem><FormLabel>Valor Aquisição (€)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="localizacao" render={({ field }) => (
                <FormItem><FormLabel>Localização</FormLabel><FormControl><Input placeholder="Local atual" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="obra_id" render={({ field }) => (
                <FormItem><FormLabel>Obra Associada</FormLabel>
                  <Select value={field.value || 'none'} onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar obra" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="none">Nenhuma</SelectItem>
                      {obras.map((obra) => (<SelectItem key={obra.id} value={obra.id}>{obra.nome}</SelectItem>))}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Notas adicionais..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'A guardar...' : equipamento ? 'Atualizar' : 'Criar'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
