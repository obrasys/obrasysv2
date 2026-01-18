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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Cliente, ClienteFormData } from '@/types/clientes';
import { NIVEL_ACESSO_OPTIONS } from '@/types/clientes';
import { User, Building2, MapPin, Settings } from 'lucide-react';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  telemovel: z.string().optional(),
  empresa: z.string().optional(),
  nif: z.string().optional(),
  endereco: z.string().optional(),
  codigo_postal: z.string().optional(),
  cidade: z.string().optional(),
  pais: z.string().optional(),
  nivel_acesso: z.string().optional(),
  observacoes: z.string().optional(),
});

interface ClienteFormProps {
  cliente?: Cliente;
  onSubmit: (data: ClienteFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClienteForm({ cliente, onSubmit, onCancel, isLoading }: ClienteFormProps) {
  const form = useForm<ClienteFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: cliente?.nome || '',
      email: cliente?.email || '',
      telefone: cliente?.telefone || '',
      telemovel: cliente?.telemovel || '',
      empresa: cliente?.empresa || '',
      nif: cliente?.nif || '',
      endereco: cliente?.endereco || '',
      codigo_postal: cliente?.codigo_postal || '',
      cidade: cliente?.cidade || '',
      pais: cliente?.pais || 'Portugal',
      nivel_acesso: cliente?.nivel_acesso || 'basico',
      observacoes: cliente?.observacoes || '',
    },
  });

  const handleSubmit = (data: ClienteFormData) => {
    // Clean empty strings to undefined
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === '' ? undefined : value,
      ])
    ) as ClienteFormData;
    onSubmit(cleanedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telemovel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telemóvel</FormLabel>
                    <FormControl>
                      <Input placeholder="+351 912 345 678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone Fixo</FormLabel>
                  <FormControl>
                    <Input placeholder="+351 21 123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Dados da Empresa */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="empresa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Morada</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Rua, número, andar..." 
                      className="resize-none" 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="codigo_postal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Postal</FormLabel>
                    <FormControl>
                      <Input placeholder="1000-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Lisboa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pais"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <Input placeholder="Portugal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nivel_acesso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Acesso (Portal)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar nível" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {NIVEL_ACESSO_OPTIONS.map((option) => (
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

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas internas sobre o cliente..." 
                      className="resize-none" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'A guardar...' : cliente ? 'Atualizar' : 'Criar Cliente'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
