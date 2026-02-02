import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useObras } from '@/hooks/useObras';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { Loader2, Save } from 'lucide-react';
import { TIPOS_CONTRATO, FASES_OBRA, NORMAS_APLICAVEIS } from '@/types/autos-medicao';
import type { AutoMedicao, AutoMedicaoFormData } from '@/types/autos-medicao';

const formSchema = z.object({
  obra_id: z.string().min(1, 'Selecione uma obra'),
  orcamento_id: z.string().optional(),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().min(1, 'Data de fim é obrigatória'),
  responsavel_medicao: z.string().min(1, 'Responsável é obrigatório'),
  responsavel_cargo: z.string().optional(),
  responsavel_ordem: z.string().optional(),
  fiscal_obra: z.string().optional(),
  fiscal_entidade: z.string().optional(),
  zona_medicao: z.string().optional(),
  fase_obra: z.string().optional(),
  localizacao_obra: z.string().optional(),
  tipo_contrato: z.enum(['principal', 'subempreitada', 'adicional']).optional(),
  contrato_referencia: z.string().optional(),
  codigo_referencia: z.string().optional(),
  observacoes_tecnicas: z.string().optional(),
  nao_conformidades: z.string().optional(),
  condicoes_execucao: z.string().optional(),
  idioma: z.enum(['pt', 'es']).optional(),
  taxa_iva: z.number().min(0).max(100).optional(),
});

interface AutoMedicaoFormProps {
  auto?: AutoMedicao;
  onSubmit: (data: AutoMedicaoFormData) => void;
  isLoading?: boolean;
}

export function AutoMedicaoForm({ auto, onSubmit, isLoading }: AutoMedicaoFormProps) {
  const { obras } = useObras();
  const { orcamentos } = useOrcamentos();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      obra_id: auto?.obra_id || '',
      orcamento_id: auto?.orcamento_id || '',
      data_inicio: auto?.data_inicio || new Date().toISOString().split('T')[0],
      data_fim: auto?.data_fim || new Date().toISOString().split('T')[0],
      responsavel_medicao: auto?.responsavel_medicao || '',
      responsavel_cargo: auto?.responsavel_cargo || '',
      responsavel_ordem: auto?.responsavel_ordem || '',
      fiscal_obra: auto?.fiscal_obra || '',
      fiscal_entidade: auto?.fiscal_entidade || '',
      zona_medicao: auto?.zona_medicao || '',
      fase_obra: auto?.fase_obra || '',
      localizacao_obra: auto?.localizacao_obra || '',
      tipo_contrato: auto?.tipo_contrato || undefined,
      contrato_referencia: auto?.contrato_referencia || '',
      codigo_referencia: auto?.codigo_referencia || '',
      observacoes_tecnicas: auto?.observacoes_tecnicas || '',
      nao_conformidades: auto?.nao_conformidades || '',
      condicoes_execucao: auto?.condicoes_execucao || '',
      idioma: auto?.idioma || 'pt',
      taxa_iva: auto?.taxa_iva || 23,
    },
  });

  const selectedObraId = form.watch('obra_id');
  const selectedIdioma = form.watch('idioma') || 'pt';
  const filteredOrcamentos = orcamentos?.filter(o => o.obra_id === selectedObraId) || [];

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values as AutoMedicaoFormData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Identificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="obra_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Obra *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a obra" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {obras?.map(obra => (
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
              name="orcamento_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orçamento Associado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o orçamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredOrcamentos.map(orc => (
                        <SelectItem key={orc.id} value={orc.id}>
                          {orc.titulo}
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
              name="data_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Início *</FormLabel>
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
                  <FormLabel>Data Fim *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_contrato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Contrato</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPOS_CONTRATO.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
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
              name="contrato_referencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referência do Contrato</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: CT-2024-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Responsabilidade Técnica */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Responsabilidade Técnica</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="responsavel_medicao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável pela Medição *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do técnico/engenheiro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsavel_cargo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Engenheiro Civil" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsavel_ordem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº Ordem Profissional</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: OE-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fiscal_obra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal de Obra</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do fiscal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fiscal_entidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entidade Fiscalizadora</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da entidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Localização e Fase */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Localização e Fase</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="zona_medicao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zona de Medição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Bloco A, Piso 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fase_obra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fase da Obra</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a fase" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FASES_OBRA.map(fase => (
                        <SelectItem key={fase} value={fase}>
                          {fase}
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
              name="localizacao_obra"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Localização da Obra</FormLabel>
                  <FormControl>
                    <Input placeholder="Morada completa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Observações Técnicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações Técnicas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="condicoes_execucao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condições de Execução</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva as condições em que os trabalhos foram executados..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes_tecnicas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Técnicas</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações gerais sobre a medição..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nao_conformidades"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Não Conformidades</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Registe quaisquer não conformidades detetadas..." 
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

        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="idioma"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Idioma do Documento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxa_iva"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxa IVA (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      max={100} 
                      step={0.1}
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="codigo_referencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Referência</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: AM-2024-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Normas Aplicáveis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Normas Aplicáveis ({selectedIdioma === 'pt' ? 'Portugal' : 'Espanha'})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {NORMAS_APLICAVEIS[selectedIdioma].map((norma, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {norma}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {auto ? 'Guardar Alterações' : 'Criar Auto de Medição'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
