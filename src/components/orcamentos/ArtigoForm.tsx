import { useState, useEffect } from 'react';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UNIDADES, type ArtigoFormData } from '@/types/orcamentos';
import { Loader2, Link2, Unlink, Ruler, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ConstructiveElement, ParametricRule } from '@/types/parametric';
import { ELEMENT_TYPES, CONSTRUCTION_METHODS, TRADES } from '@/types/parametric';

const formSchema = z.object({
  codigo: z.string().optional(),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  quantidade: z.number().min(0, 'Quantidade deve ser positiva'),
  preco_base: z.number().min(0, 'Preço base deve ser positivo'),
  margem_lucro_artigo: z.number().min(0, 'Margem deve ser positiva').max(99.99, 'Margem deve ser inferior a 100%'),
  preco_unitario: z.number().min(0, 'Preço deve ser positivo'),
  custo_mo: z.number().min(0).optional(),
  custo_mat: z.number().min(0).optional(),
  custo_sub: z.number().min(0).optional(),
  custo_srv: z.number().min(0).optional(),
  custo_alu: z.number().min(0).optional(),
  custo_div: z.number().min(0).optional(),
  quantity_source: z.enum(['manual', 'parametric']).optional(),
  linked_element_id: z.string().nullable().optional(),
  linked_rule_id: z.string().nullable().optional(),
});

const DECOMP_FIELDS = [
  { key: 'custo_mo' as const,  label: 'MO',      title: 'Mão de Obra' },
  { key: 'custo_mat' as const, label: 'MAT',     title: 'Materiais' },
  { key: 'custo_sub' as const, label: 'SUB',     title: 'Subempreitadas' },
  { key: 'custo_srv' as const, label: 'SRV',     title: 'Serviços' },
  { key: 'custo_alu' as const, label: 'ALU',     title: 'Alugueres' },
  { key: 'custo_div' as const, label: 'DIV',     title: 'Diversos' },
];


interface ArtigoFormProps {
  defaultValues?: Partial<ArtigoFormData>;
  onSubmit: (data: ArtigoFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  orcamentoId?: string;
}

export function ArtigoForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = 'Adicionar',
  orcamentoId,
}: ArtigoFormProps) {
  const [useParametric, setUseParametric] = useState(
    defaultValues?.quantity_source === 'parametric'
  );
  const [elements, setElements] = useState<ConstructiveElement[]>([]);
  const [rules, setRules] = useState<ParametricRule[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    defaultValues?.linked_element_id || null
  );
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(
    defaultValues?.linked_rule_id || null
  );
  const [calculatedQuantity, setCalculatedQuantity] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const form = useForm<ArtigoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: '',
      descricao: '',
      // unidade definida abaixo após o spread de defaultValues
      quantidade: 1,
      preco_base: defaultValues?.preco_base || defaultValues?.preco_unitario || 0,
      margem_lucro_artigo: defaultValues?.margem_lucro_artigo || 0,
      preco_unitario: defaultValues?.preco_unitario || 0,
      custo_mo: defaultValues?.custo_mo ?? 0,
      custo_mat: defaultValues?.custo_mat ?? 0,
      custo_sub: defaultValues?.custo_sub ?? 0,
      custo_srv: defaultValues?.custo_srv ?? 0,
      custo_alu: defaultValues?.custo_alu ?? 0,
      custo_div: defaultValues?.custo_div ?? 0,
      quantity_source: 'manual',
      linked_element_id: null,
      linked_rule_id: null,
      ...defaultValues,
      // Garantir unidade válida — evita falha silenciosa de validação no Guardar
      unidade: defaultValues?.unidade && String(defaultValues.unidade).trim() !== ''
        ? defaultValues.unidade
        : 'un',
    },
  });

  // Surface validation errors so o botão Guardar nunca pareça inerte
  const handleInvalid = (errors: any) => {
    const first = Object.values(errors)[0] as any;
    const msg = first?.message || 'Verifique os campos do formulário.';
    console.warn('[ArtigoForm] validation errors', errors);
    if (typeof window !== 'undefined') {
      // dynamic import to avoid circular deps
      import('@/hooks/use-toast').then(({ toast }) =>
        toast({ title: 'Não foi possível gravar', description: String(msg), variant: 'destructive' }),
      );
    }
  };

  // Auto-soma da decomposição → preco_base (quando o utilizador preenche os 6 componentes)
  const cMo  = form.watch('custo_mo')  ?? 0;
  const cMat = form.watch('custo_mat') ?? 0;
  const cSub = form.watch('custo_sub') ?? 0;
  const cSrv = form.watch('custo_srv') ?? 0;
  const cAlu = form.watch('custo_alu') ?? 0;
  const cDiv = form.watch('custo_div') ?? 0;
  const somaDecomp = Number((cMo + cMat + cSub + cSrv + cAlu + cDiv).toFixed(2));
  const decompAtiva = somaDecomp > 0;

  useEffect(() => {
    if (decompAtiva) {
      form.setValue('preco_base', somaDecomp);
    }
  }, [decompAtiva, somaDecomp, form]);

  // Calcular preço unitário quando preço base ou margem mudam
  const precoBase = form.watch('preco_base');
  const margemLucro = form.watch('margem_lucro_artigo');

  useEffect(() => {
    if (precoBase !== undefined && margemLucro !== undefined) {
      const precoComMargem = margemLucro > 0 && margemLucro < 100
        ? precoBase / (1 - margemLucro / 100)
        : precoBase;
      form.setValue('preco_unitario', Number(precoComMargem.toFixed(2)));
    }
  }, [precoBase, margemLucro, form]);


  // Carregar elementos do orçamento
  useEffect(() => {
    if (orcamentoId && useParametric) {
      const fetchElements = async () => {
        const { data } = await supabase
          .from('constructive_elements')
          .select('*')
          .eq('orcamento_id', orcamentoId)
          .order('created_at');
        
        if (data) {
          setElements(data as unknown as ConstructiveElement[]);
        }
      };
      fetchElements();
    }
  }, [orcamentoId, useParametric]);

  // Carregar regras quando elemento é selecionado
  useEffect(() => {
    if (selectedElementId && useParametric) {
      const element = elements.find(e => e.id === selectedElementId);
      if (element) {
        const fetchRules = async () => {
          const { data } = await supabase
            .from('parametric_rules')
            .select('*')
            .eq('element_type', element.element_type)
            .eq('construction_method', element.construction_method)
            .order('trade', { ascending: true });
          
          if (data) {
            setRules(data as ParametricRule[]);
          }
        };
        fetchRules();
      }
    } else {
      setRules([]);
      setSelectedRuleId(null);
    }
  }, [selectedElementId, elements, useParametric]);

  // Calcular quantidade quando regra é selecionada
  useEffect(() => {
    if (selectedElementId && selectedRuleId && useParametric) {
      const calculateQuantity = async () => {
        setIsCalculating(true);
        try {
          const { data, error } = await supabase.rpc('execute_parametric_rule_v2', {
            p_rule_id: selectedRuleId,
            p_element_id: selectedElementId,
            p_coefficient_overrides: {},
          });

          if (!error && data !== null) {
            setCalculatedQuantity(data as number);
            form.setValue('quantidade', data as number);
            
            // Atualizar unidade baseada na regra
            const rule = rules.find(r => r.id === selectedRuleId);
            if (rule?.output_unit || rule?.unit) {
              const unitValue = rule.output_unit || rule.unit;
              // Mapear unidades da regra para unidades do formulário
              const unitMap: Record<string, string> = {
                'm2': 'm2',
                'm²': 'm2',
                'm3': 'm3',
                'm³': 'm3',
                'lm': 'm',
                'm': 'm',
                'kg': 'kg',
                'l': 'un',
                'un': 'un',
              };
              const mappedUnit = unitMap[unitValue.toLowerCase()] || 'un';
              form.setValue('unidade', mappedUnit);
            }
          }
        } catch (err) {
          console.error('Erro ao calcular quantidade:', err);
        } finally {
          setIsCalculating(false);
        }
      };
      calculateQuantity();
    } else {
      setCalculatedQuantity(null);
    }
  }, [selectedElementId, selectedRuleId, useParametric, rules, form]);

  const handleSubmit = (data: ArtigoFormData) => {
    onSubmit({
      ...data,
      quantity_source: useParametric ? 'parametric' : 'manual',
      linked_element_id: useParametric ? selectedElementId : null,
      linked_rule_id: useParametric ? selectedRuleId : null,
    });
  };

  const handleToggleParametric = (enabled: boolean) => {
    setUseParametric(enabled);
    if (!enabled) {
      setSelectedElementId(null);
      setSelectedRuleId(null);
      setCalculatedQuantity(null);
    }
  };

  const valorTotal = form.watch('quantidade') * form.watch('preco_unitario');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const selectedElement = elements.find(e => e.id === selectedElementId);
  const selectedRule = rules.find(r => r.id === selectedRuleId);

  // Agrupar regras por trade
  const rulesByTrade = rules.reduce((acc, rule) => {
    const trade = rule.trade || 'outros';
    if (!acc[trade]) acc[trade] = [];
    acc[trade].push(rule);
    return acc;
  }, {} as Record<string, ParametricRule[]>);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-start">
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: ALV.001" {...field} />
                </FormControl>
                <div className="h-4" />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unidade"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Unidade</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={useParametric && !!selectedRuleId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover">
                    {UNIDADES.map((unidade) => (
                      <SelectItem key={unidade.value} value={unidade.value}>
                        {unidade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="h-4" />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantidade"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  Quantidade
                  {useParametric && calculatedQuantity !== null && (
                    <Badge variant="secondary" className="text-xs">
                      <Calculator className="h-3 w-3 mr-1" />
                      Auto
                    </Badge>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.001}
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    disabled={useParametric && calculatedQuantity !== null}
                    className={useParametric && calculatedQuantity !== null ? 'bg-muted' : ''}
                  />
                </FormControl>
                <div className="h-4" />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preco_base"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Preço Base (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    readOnly={decompAtiva}
                    className={decompAtiva ? 'bg-muted' : ''}
                  />
                </FormControl>
                <FormDescription className="text-xs h-4">
                  {decompAtiva ? 'Soma da decomposição' : 'Custo unitário'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


          <FormField
            control={form.control}
            name="margem_lucro_artigo"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Margem (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription className="text-xs h-4" title="Margem é calculada sobre o preço de venda final. Ex: 30% de margem sobre custo de 100 € = preço de venda de 142,86 €.">
                  Margem sobre preço de venda
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preco_unitario"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Preço Final (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    {...field}
                    readOnly
                    className="bg-muted"
                  />
                </FormControl>
                <FormDescription className="text-xs h-4">
                  Base + margem
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o artigo de trabalho..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Decomposição de custo por artigo (MO/MAT/SUB/SRV/ALU/DIV) */}
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Decomposição de Custo</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {decompAtiva
                  ? `Soma: ${formatCurrency(somaDecomp)} → alimenta Preço Base`
                  : 'Opcional - preencher para permitir compras parciais por categoria'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {DECOMP_FIELDS.map((d) => (
                <FormField
                  key={d.key}
                  control={form.control}
                  name={d.key}
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs" title={d.title}>{d.label}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>


        {/* Secção de Medição Paramétrica */}
        {orcamentoId && (
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Medição Paramétrica</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {useParametric ? 'Ativo' : 'Inativo'}
                  </span>
                  <Switch
                    checked={useParametric}
                    onCheckedChange={handleToggleParametric}
                  />
                </div>
              </div>

              {useParametric && (
                <div className="space-y-4">
                  {elements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum elemento construtivo criado neste orçamento.
                      Vá à tab "Medições Paramétricas" para criar elementos.
                    </p>
                  ) : (
                    <>
                      {/* Seleção de Elemento */}
                      <div className="space-y-2">
                        <FormLabel className="text-xs">Elemento Construtivo</FormLabel>
                        <Select
                          value={selectedElementId || ''}
                          onValueChange={(val) => setSelectedElementId(val || null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um elemento..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {elements.map((element) => (
                              <SelectItem key={element.id} value={element.id}>
                                <div className="flex items-center gap-2">
                                  <span>{element.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {ELEMENT_TYPES[element.element_type]}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Info do elemento selecionado */}
                      {selectedElement && (
                        <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Tipo:</span>
                            <span>{ELEMENT_TYPES[selectedElement.element_type]}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Método:</span>
                            <span>{CONSTRUCTION_METHODS[selectedElement.construction_method].label}</span>
                          </div>
                        </div>
                      )}

                      {/* Seleção de Regra */}
                      {selectedElementId && rules.length > 0 && (
                        <div className="space-y-2">
                          <FormLabel className="text-xs">Regra de Cálculo</FormLabel>
                          <Select
                            value={selectedRuleId || ''}
                            onValueChange={(val) => setSelectedRuleId(val || null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma regra..." />
                            </SelectTrigger>
                            <SelectContent className="bg-popover max-h-[300px]">
                              {Object.entries(rulesByTrade).map(([trade, tradeRules]) => (
                                <div key={trade}>
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    {TRADES[trade] || trade}
                                  </div>
                                  {tradeRules.map((rule) => (
                                    <SelectItem key={rule.id} value={rule.id}>
                                      <div className="flex items-center gap-2">
                                        <span>{rule.rule_name}</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {rule.output_unit || rule.unit}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Resultado do cálculo */}
                      {selectedRule && calculatedQuantity !== null && (
                        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Link2 className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">Quantidade Calculada</span>
                            </div>
                            <div className="text-right">
                              {isCalculating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <span className="text-lg font-bold text-primary">
                                  {calculatedQuantity.toFixed(3)} {selectedRule.output_unit || selectedRule.unit}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedRule.notes && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {selectedRule.notes}
                            </p>
                          )}
                        </div>
                      )}

                      {selectedElementId && rules.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Nenhuma regra disponível para este tipo de elemento.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Valor Total: </span>
            <span className="font-semibold text-primary">{formatCurrency(valorTotal)}</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
