import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Phone, Mail, UserPlus } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Obra, ObraFormData } from '@/types/obras';
import { OBRA_STATUS_OPTIONS } from '@/types/obras';
import { useClientes } from '@/hooks/useClientes';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cliente_id: z.string().optional(),
  cliente: z.string().optional(),
  endereco: z.string().optional(),
  status: z.string().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  valor_previsto: z.coerce.number().min(0).optional(),
});

interface ObraFormProps {
  obra?: Obra;
  onSubmit: (data: ObraFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ObraForm({ obra, onSubmit, onCancel, isLoading }: ObraFormProps) {
  const { clientesAtivos, createCliente } = useClientes();
  const [selectedClienteId, setSelectedClienteId] = useState<string | undefined>(
    (obra as any)?.cliente_id || undefined
  );
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const selectedCliente = clientesAtivos?.find(c => c.id === selectedClienteId);

  const form = useForm<ObraFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: obra?.nome || '',
      cliente_id: (obra as any)?.cliente_id || '',
      cliente: obra?.cliente || '',
      endereco: obra?.endereco || '',
      status: obra?.status || 'planeamento',
      data_inicio: obra?.data_inicio || '',
      data_fim: obra?.data_fim || '',
      valor_previsto: obra?.valor_previsto || 0,
    },
  });

  const handleClienteChange = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    const cliente = clientesAtivos?.find(c => c.id === clienteId);
    if (cliente) {
      form.setValue('cliente_id', clienteId);
      form.setValue('cliente', cliente.nome);
    }
  };

  const handleCreateCliente = async () => {
    if (!newClientName.trim()) return;
    try {
      const result = await createCliente.mutateAsync({
        nome: newClientName.trim(),
        email: newClientEmail.trim() || undefined,
        telefone: newClientPhone.trim() || undefined,
      } as any);
      // Auto-select the newly created client
      if (result?.id) {
        handleClienteChange(result.id);
      }
      setShowNewClientDialog(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
    } catch {}
  };

  const handleSubmit = (data: ObraFormData) => {
    onSubmit(data);
  };

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Obra *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Reabilitação Edifício Av. Lisboa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="cliente_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                {clientesAtivos && clientesAtivos.length > 0 ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select onValueChange={handleClienteChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background">
                          {clientesAtivos.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome}{cliente.empresa ? ` (${cliente.empresa})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setShowNewClientDialog(true)}
                      title="Criar novo cliente"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewClientDialog(true)}
                      className="gap-1.5"
                    >
                      <UserPlus className="h-4 w-4" />
                      Criar novo cliente
                    </Button>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-background">
                    {OBRA_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {selectedCliente && (
          <div className="grid gap-4 sm:grid-cols-2 rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Telefone:</span>
              <span className="font-medium">
                {selectedCliente.telefone || selectedCliente.telemovel || '-'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">
                {selectedCliente.email || '-'}
              </span>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="endereco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Localização</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Endereço completo da obra" 
                  className="resize-none" 
                  rows={2}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="data_inicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Início</FormLabel>
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
                <FormLabel>Data de Fim Prevista</FormLabel>
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
          name="valor_previsto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Previsto (€)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01"
                  min="0"
                  placeholder="0.00" 
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
            {isLoading ? 'A guardar...' : obra ? 'Atualizar' : 'Criar Obra'}
          </Button>
        </div>
      </form>
    </Form>

    <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="new-client-name">Nome *</Label>
            <Input
              id="new-client-name"
              placeholder="Nome do cliente"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-client-email">Email</Label>
            <Input
              id="new-client-email"
              type="email"
              placeholder="email@exemplo.com"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-client-phone">Telefone</Label>
            <Input
              id="new-client-phone"
              type="tel"
              placeholder="+351 000 000 000"
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowNewClientDialog(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateCliente}
              disabled={!newClientName.trim() || createCliente.isPending}
            >
              {createCliente.isPending ? 'A criar...' : 'Criar Cliente'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
