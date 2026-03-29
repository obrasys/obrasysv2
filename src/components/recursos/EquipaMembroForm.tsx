import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ResourcePhotoUpload } from './ResourcePhotoUpload';
import type { EquipaMembro, EquipaMembroFormData, Subempreiteiro } from '@/types/recursos';
import { TIPO_CONTRATO_CONFIG } from '@/types/recursos';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  cargo: z.string().max(100).optional(),
  email: z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  telefone: z.string().max(50).optional(),
  nif: z.string().max(20).optional(),
  data_admissao: z.string().optional(),
  salario_base: z.coerce.number().min(0).optional(),
  tipo_contrato: z.string().optional(),
  subempreiteiro_id: z.string().optional(),
  ativo: z.boolean().default(true),
  observacoes: z.string().optional(),
});

interface EquipaMembroFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membro?: EquipaMembro | null;
  subempreiteiros: Subempreiteiro[];
  onSubmit: (data: EquipaMembroFormData) => Promise<void>;
  isLoading?: boolean;
}

export function EquipaMembroForm({ open, onOpenChange, membro, subempreiteiros, onSubmit, isLoading }: EquipaMembroFormProps) {
  const [fotoUrl, setFotoUrl] = useState<string>(membro?.foto_url || '');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '', cargo: '', email: '', telefone: '', nif: '',
      data_admissao: '', salario_base: undefined, tipo_contrato: '',
      subempreiteiro_id: '', ativo: true, observacoes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nome: membro?.nome || '',
        cargo: membro?.cargo || '',
        email: membro?.email || '',
        telefone: membro?.telefone || '',
        nif: membro?.nif || '',
        data_admissao: membro?.data_admissao || '',
        salario_base: membro?.salario_base || undefined,
        tipo_contrato: membro?.tipo_contrato || '',
        subempreiteiro_id: membro?.subempreiteiro_id || '',
        ativo: membro?.ativo ?? true,
        observacoes: membro?.observacoes || '',
      });
      setFotoUrl(membro?.foto_url || '');
    }
  }, [open, membro]);

  const initials = (form.watch('nome') || 'M')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit({
      nome: values.nome,
      cargo: values.cargo || undefined,
      email: values.email || undefined,
      telefone: values.telefone || undefined,
      nif: values.nif || undefined,
      data_admissao: values.data_admissao || undefined,
      salario_base: values.salario_base,
      tipo_contrato: (values.tipo_contrato === 'none' ? undefined : values.tipo_contrato) as EquipaMembroFormData['tipo_contrato'],
      subempreiteiro_id: values.subempreiteiro_id === 'none' ? undefined : values.subempreiteiro_id,
      ativo: values.ativo,
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
          <DialogTitle>{membro ? 'Editar Membro' : 'Novo Membro da Equipa'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <ResourcePhotoUpload currentUrl={fotoUrl} fallbackInitials={initials} onUpload={setFotoUrl} />

            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input placeholder="Nome completo" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="cargo" render={({ field }) => (
                <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="Função" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="nif" render={({ field }) => (
                <FormItem><FormLabel>NIF</FormLabel><FormControl><Input placeholder="123456789" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="+351 912 345 678" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tipo_contrato" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Contrato</FormLabel>
                  <Select value={field.value || 'none'} onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="none">Nenhum</SelectItem>
                      {Object.entries(TIPO_CONTRATO_CONFIG).map(([key, config]) => (<SelectItem key={key} value={key}>{config.label}</SelectItem>))}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="data_admissao" render={({ field }) => (
                <FormItem><FormLabel>Data de Admissão</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="salario_base" render={({ field }) => (
                <FormItem><FormLabel>Salário Base (€)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="subempreiteiro_id" render={({ field }) => (
                <FormItem><FormLabel>Subempreiteiro</FormLabel>
                  <Select value={field.value || 'none'} onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="none">Interno</SelectItem>
                      {subempreiteiros.map((sub) => (<SelectItem key={sub.id} value={sub.id}>{sub.nome}</SelectItem>))}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Notas adicionais..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="ativo" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="cursor-pointer">Ativo</FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'A guardar...' : membro ? 'Atualizar' : 'Criar'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
