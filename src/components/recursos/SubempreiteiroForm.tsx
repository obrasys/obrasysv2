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
import { ResourcePhotoUpload } from './ResourcePhotoUpload';
import type { Subempreiteiro, SubempreiteiroFormData } from '@/types/recursos';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  nif: z.string().max(20).optional(),
  email: z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  telefone: z.string().max(50).optional(),
  especialidade: z.string().max(255).optional(),
  endereco: z.string().optional(),
  ativo: z.boolean().default(true),
  observacoes: z.string().optional(),
});

interface SubempreiteiroFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subempreiteiro?: Subempreiteiro | null;
  onSubmit: (data: SubempreiteiroFormData) => Promise<void>;
  isLoading?: boolean;
}

export function SubempreiteiroForm({ open, onOpenChange, subempreiteiro, onSubmit, isLoading }: SubempreiteiroFormProps) {
  const [fotoUrl, setFotoUrl] = useState<string>(subempreiteiro?.foto_url || '');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: subempreiteiro?.nome || '',
      nif: subempreiteiro?.nif || '',
      email: subempreiteiro?.email || '',
      telefone: subempreiteiro?.telefone || '',
      especialidade: subempreiteiro?.especialidade || '',
      endereco: subempreiteiro?.endereco || '',
      ativo: subempreiteiro?.ativo ?? true,
      observacoes: subempreiteiro?.observacoes || '',
    },
  });

  const initials = (form.watch('nome') || 'S')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit({
      nome: values.nome,
      nif: values.nif || undefined,
      email: values.email || undefined,
      telefone: values.telefone || undefined,
      especialidade: values.especialidade || undefined,
      endereco: values.endereco || undefined,
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
          <DialogTitle>{subempreiteiro ? 'Editar Subempreiteiro' : 'Novo Subempreiteiro'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <ResourcePhotoUpload currentUrl={fotoUrl} fallbackInitials={initials} onUpload={setFotoUrl} />

            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input placeholder="Nome do subempreiteiro" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nif" render={({ field }) => (
                <FormItem><FormLabel>NIF</FormLabel><FormControl><Input placeholder="123456789" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="+351 912 345 678" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="especialidade" render={({ field }) => (
              <FormItem><FormLabel>Especialidade</FormLabel><FormControl><Input placeholder="Ex: Eletricidade, Canalização..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="endereco" render={({ field }) => (
              <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Morada completa" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

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
              <Button type="submit" disabled={isLoading}>{isLoading ? 'A guardar...' : subempreiteiro ? 'Atualizar' : 'Criar'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
