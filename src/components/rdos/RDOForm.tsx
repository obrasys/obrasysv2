import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import type { RelatorioDiario, RDOFormData, TrabalhoQuantificado } from '@/types/rdos';
import { CONDICOES_METEOROLOGICAS } from '@/types/rdos';
import { useObras } from '@/hooks/useObras';
import { RDOImageUpload } from './RDOImageUpload';
import { RDOMaterialRequests, type RDOMaterialRequestLine } from './RDOMaterialRequests';
import { 
  Calendar, 
  Cloud, 
  Users, 
  FileText, 
  AlertTriangle, 
  MessageSquare,
  Plus,
  Trash2,
  Loader2,
  HardHat,
  Camera,
} from 'lucide-react';
import { format } from 'date-fns';

const trabalhoSchema = z.object({
  id: z.string(),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  quantidade: z.coerce.number().min(0),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  artigo_id: z.string().optional(),
});

const formSchema = z.object({
  obra_id: z.string().min(1, 'Obra é obrigatória'),
  data: z.string().min(1, 'Data é obrigatória'),
  trabalhos_executados: z.string().optional(),
  ocorrencias: z.string().optional(),
  observacoes: z.string().optional(),
  condicoes_meteorologicas: z.string().optional(),
  mao_de_obra_presente: z.coerce.number().min(0).optional(),
});

interface RDOFormProps {
  rdo?: RelatorioDiario;
  obraId?: string;
  onSubmit: (data: RDOFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RDOForm({ rdo, obraId, onSubmit, onCancel, isLoading }: RDOFormProps) {
  const { obras, isLoading: loadingObras } = useObras();
  const [trabalhos, setTrabalhos] = useState<TrabalhoQuantificado[]>(
    rdo?.trabalhos_quantificados || []
  );
  const [fotos, setFotos] = useState<string[]>(rdo?.fotos || []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      obra_id: rdo?.obra_id || obraId || '',
      data: rdo?.data || format(new Date(), 'yyyy-MM-dd'),
      trabalhos_executados: rdo?.trabalhos_executados || '',
      ocorrencias: rdo?.ocorrencias || '',
      observacoes: rdo?.observacoes || '',
      condicoes_meteorologicas: rdo?.condicoes_meteorologicas || '',
      mao_de_obra_presente: rdo?.mao_de_obra_presente || 0,
    },
  });

  const addTrabalho = () => {
    setTrabalhos([
      ...trabalhos,
      {
        id: crypto.randomUUID(),
        descricao: '',
        quantidade: 0,
        unidade: 'm2',
      },
    ]);
  };

  const updateTrabalho = (id: string, field: keyof TrabalhoQuantificado, value: string | number) => {
    setTrabalhos(
      trabalhos.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      )
    );
  };

  const removeTrabalho = (id: string) => {
    setTrabalhos(trabalhos.filter((t) => t.id !== id));
  };

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    const validTrabalhos = trabalhos.filter(t => t.descricao.trim() !== '');
    onSubmit({
      obra_id: data.obra_id,
      data: data.data,
      trabalhos_executados: data.trabalhos_executados,
      ocorrencias: data.ocorrencias,
      observacoes: data.observacoes,
      condicoes_meteorologicas: data.condicoes_meteorologicas,
      mao_de_obra_presente: data.mao_de_obra_presente,
      trabalhos_quantificados: validTrabalhos,
      fotos: fotos,
    });
  };

  // Filter obras to show only active ones
  const obrasAtivas = obras?.filter(o => 
    o.status === 'em_curso' || o.status === 'planeamento'
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Dados Básicos */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dados do Relatório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="obra_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Obra *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!!obraId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar obra..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {loadingObras ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : obrasAtivas && obrasAtivas.length > 0 ? (
                          obrasAtivas.map((obra) => (
                            <SelectItem key={obra.id} value={obra.id}>
                              <div className="flex items-center gap-2">
                                <HardHat className="h-4 w-4 text-muted-foreground" />
                                {obra.nome}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="py-4 text-center text-sm text-muted-foreground">
                            Nenhuma obra ativa
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="condicoes_meteorologicas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Cloud className="h-3.5 w-3.5" />
                      Condições Meteorológicas
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {CONDICOES_METEOROLOGICAS.map((cond) => (
                          <SelectItem key={cond.value} value={cond.value}>
                            {cond.label}
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
                name="mao_de_obra_presente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      Mão de Obra Presente
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        placeholder="Número de trabalhadores" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Trabalhos Executados */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Trabalhos Executados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="trabalhos_executados"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição dos Trabalhos</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva os trabalhos realizados durante o dia..." 
                      className="resize-none min-h-[120px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Trabalhos Quantificados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Trabalhos Quantificados (opcional)</h4>
                <Button type="button" variant="outline" size="sm" onClick={addTrabalho}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>
              
              {trabalhos.length > 0 && (
                <div className="space-y-3">
                  {trabalhos.map((trabalho, index) => (
                    <div key={trabalho.id} className="flex gap-2 items-start">
                      <div className="flex-1 grid gap-2 sm:grid-cols-[1fr,100px,80px]">
                        <Input
                          placeholder="Descrição do trabalho"
                          value={trabalho.descricao}
                          onChange={(e) => updateTrabalho(trabalho.id, 'descricao', e.target.value)}
                        />
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="Qtd"
                          value={trabalho.quantidade}
                          onChange={(e) => updateTrabalho(trabalho.id, 'quantidade', parseFloat(e.target.value) || 0)}
                        />
                        <Select
                          value={trabalho.unidade}
                          onValueChange={(value) => updateTrabalho(trabalho.id, 'unidade', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="m2">m²</SelectItem>
                            <SelectItem value="m3">m³</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="un">un</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="h">h</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTrabalho(trabalho.id)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {trabalhos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Adicione trabalhos quantificados para cálculo automático de progresso
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ocorrências */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Ocorrências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="ocorrencias"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Registe quaisquer ocorrências, incidentes ou imprevistos..." 
                      className="resize-none min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas adicionais, comentários gerais..." 
                      className="resize-none min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Fotos da Obra */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotos da Obra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RDOImageUpload
              rdoId={rdo?.id}
              existingPhotos={fotos}
              onPhotosChange={setFotos}
              disabled={isLoading}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'A guardar...' : rdo ? 'Atualizar RDO' : 'Criar RDO'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
