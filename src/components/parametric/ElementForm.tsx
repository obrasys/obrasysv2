import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type {
  ElementFormData,
  ElementType,
  ConstructionMethod,
  FunctionalType,
  ConfigurationType,
  InsulationType,
  ConstructiveElement,
} from '@/types/parametric';
import {
  ELEMENT_TYPES,
  CONSTRUCTION_METHODS,
  FUNCTIONAL_TYPES,
  CONFIGURATION_TYPES,
  INSULATION_TYPES,
  isMethodStructural,
  DEFAULT_WALL_PARAMS,
  DEFAULT_FLOOR_PARAMS,
  DEFAULT_ROOF_PARAMS,
} from '@/types/parametric';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  element_type: z.enum(['wall', 'floor', 'slab', 'ceiling', 'roof']),
  construction_method: z.enum([
    'brick_ceramic',
    'concrete_block',
    'natural_stone',
    'drywall_pladur',
    'wood_frame',
    'steel_frame',
    'reinforced_concrete',
  ]),
  functional_type: z.enum(['partition_wall', 'structural_wall']),
  configuration_type: z.enum(['single_layer', 'double_layer', 'cavity_wall']),
  insulation_type: z.enum(['mineral_wool', 'cork', 'eps', 'xps', 'none']).optional(),
  insulation_thickness_cm: z.number().min(0).optional(),
  length_m: z.number().min(0.01, 'Comprimento deve ser maior que 0'),
  height_m: z.number().min(0.01).optional(),
  width_m: z.number().min(0.01).optional(),
  thickness_cm: z.number().min(1, 'Espessura deve ser maior que 0'),
  layer_count: z.union([z.literal(1), z.literal(2)]).optional(),
  wall_side_count: z.union([z.literal(1), z.literal(2)]).optional(),
  slope_factor: z.number().min(1).optional(),
});

interface ElementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ElementFormData) => void;
  initialData?: ConstructiveElement | null;
  isLoading?: boolean;
}

export function ElementForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}: ElementFormProps) {
  const [structuralWarning, setStructuralWarning] = useState<string | null>(null);

  const form = useForm<ElementFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      element_type: 'wall',
      construction_method: 'brick_ceramic',
      functional_type: 'partition_wall',
      configuration_type: 'single_layer',
      length_m: 0,
      height_m: DEFAULT_WALL_PARAMS.height_m,
      thickness_cm: DEFAULT_WALL_PARAMS.thickness_cm!,
      layer_count: 1,
      wall_side_count: 2,
    },
  });

  const elementType = form.watch('element_type');
  const constructionMethod = form.watch('construction_method');
  const functionalType = form.watch('functional_type');
  const configType = form.watch('configuration_type');

  // Preencher dados iniciais
  useEffect(() => {
    if (initialData) {
      const params = initialData.parameters as unknown as Record<string, number | string>;
      form.reset({
        name: initialData.name,
        element_type: initialData.element_type,
        construction_method: initialData.construction_method,
        functional_type: initialData.functional_type,
        configuration_type: initialData.configuration_type,
        insulation_type: (initialData.insulation_type as InsulationType) || undefined,
        insulation_thickness_cm: initialData.insulation_thickness_cm || undefined,
        length_m: (params.length_m as number) || 0,
        height_m: (params.height_m as number) || undefined,
        width_m: (params.width_m as number) || undefined,
        thickness_cm: (params.thickness_cm as number) || 15,
        layer_count: ((params.layer_count as number) || 1) as 1 | 2,
        wall_side_count: ((params.wall_side_count as number) || 2) as 1 | 2,
        slope_factor: (params.slope_factor as number) || undefined,
      });
    } else {
      form.reset({
        name: '',
        element_type: 'wall',
        construction_method: 'brick_ceramic',
        functional_type: 'partition_wall',
        configuration_type: 'single_layer',
        length_m: 0,
        height_m: DEFAULT_WALL_PARAMS.height_m,
        thickness_cm: DEFAULT_WALL_PARAMS.thickness_cm!,
        layer_count: 1,
        wall_side_count: 2,
      });
    }
  }, [initialData, form, open]);

  // Validar compatibilidade estrutural
  useEffect(() => {
    if (functionalType === 'structural_wall' && !isMethodStructural(constructionMethod)) {
      setStructuralWarning(
        `${CONSTRUCTION_METHODS[constructionMethod].label} não suporta função estrutural`
      );
    } else {
      setStructuralWarning(null);
    }
  }, [functionalType, constructionMethod]);

  // Ajustar defaults quando tipo de elemento muda
  useEffect(() => {
    if (elementType === 'wall') {
      form.setValue('height_m', DEFAULT_WALL_PARAMS.height_m);
      form.setValue('thickness_cm', DEFAULT_WALL_PARAMS.thickness_cm!);
    } else if (elementType === 'roof') {
      form.setValue('thickness_cm', DEFAULT_ROOF_PARAMS.thickness_cm!);
      form.setValue('slope_factor', DEFAULT_ROOF_PARAMS.slope_factor);
    } else {
      form.setValue('thickness_cm', DEFAULT_FLOOR_PARAMS.thickness_cm!);
    }
  }, [elementType, form]);

  const handleSubmit = (data: ElementFormData) => {
    onSubmit(data);
    onOpenChange(false);
  };

  const isWall = elementType === 'wall';
  const isRoof = elementType === 'roof';
  const needsInsulation = configType === 'cavity_wall' || configType === 'double_layer';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Elemento Construtivo' : 'Novo Elemento Construtivo'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Elemento</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Parede Sala" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Elemento e Método Construtivo */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="element_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Elemento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ELEMENT_TYPES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="construction_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método Construtivo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CONSTRUCTION_METHODS).map(([value, { label, region }]) => (
                          <SelectItem key={value} value={value}>
                            {label}{' '}
                            <span className="text-xs text-muted-foreground">({region})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tipologia e Configuração */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="functional_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipologia Funcional</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(FUNCTIONAL_TYPES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="configuration_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Configuração</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CONFIGURATION_TYPES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Warning estrutural */}
            {structuralWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{structuralWarning}</AlertDescription>
              </Alert>
            )}

            {/* Parâmetros Geométricos */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Parâmetros Geométricos</Label>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="length_m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comprimento (m)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isWall ? (
                  <FormField
                    control={form.control}
                    name="height_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Altura (m)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="width_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Largura (m)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="thickness_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Espessura (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Campos específicos para paredes */}
              {isWall && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="layer_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº de Camadas</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(parseInt(v) as 1 | 2)}
                          value={String(field.value || 1)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 Camada</SelectItem>
                            <SelectItem value="2">2 Camadas</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="wall_side_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Faces a Revestir</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(parseInt(v) as 1 | 2)}
                          value={String(field.value || 2)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 Face</SelectItem>
                            <SelectItem value="2">2 Faces</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Campo específico para cobertura */}
              {isRoof && (
                <FormField
                  control={form.control}
                  name="slope_factor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fator de Inclinação</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Isolamento (quando aplicável) */}
            {needsInsulation && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Isolamento</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="insulation_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Isolamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'none'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(INSULATION_TYPES).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
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
                    name="insulation_thickness_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Espessura Isolamento (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !!structuralWarning}>
                {isLoading ? 'A guardar...' : initialData ? 'Guardar' : 'Criar Elemento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
