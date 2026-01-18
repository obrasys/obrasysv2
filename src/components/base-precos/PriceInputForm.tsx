import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMaterials,
  useRegions,
  usePriceSources,
  useInsertPriceRaw,
} from "@/hooks/useBasePrecos";

const formSchema = z.object({
  material_id: z.string().min(1, "Selecione um material"),
  region_id: z.string().min(1, "Selecione uma região"),
  source_id: z.string().min(1, "Selecione uma fonte"),
  preco: z.coerce.number().positive("O preço deve ser maior que zero"),
  unidade_original: z.string().min(1, "Selecione a unidade"),
  observacoes: z.string().optional(),
  data_referencia: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PriceInputFormProps {
  onSuccess?: () => void;
}

export function PriceInputForm({ onSuccess }: PriceInputFormProps) {
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");

  const { data: materials, isLoading: materialsLoading } = useMaterials({
    search: materialSearch,
  });
  const { data: regions, isLoading: regionsLoading } = useRegions();
  const { data: sources, isLoading: sourcesLoading } = usePriceSources();
  const insertPrice = useInsertPriceRaw();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      material_id: "",
      region_id: "",
      source_id: "",
      preco: 0,
      unidade_original: "",
      observacoes: "",
      data_referencia: new Date().toISOString().split("T")[0],
    },
  });

  const selectedMaterial = materials?.find(
    (m) => m.id === form.watch("material_id")
  );

  const onSubmit = async (data: FormData) => {
    await insertPrice.mutateAsync({
      material_id: data.material_id,
      region_id: data.region_id,
      source_id: data.source_id,
      preco: data.preco,
      unidade_original: data.unidade_original,
      observacoes: data.observacoes,
      data_referencia: data.data_referencia,
    });
    form.reset();
    onSuccess?.();
  };

  const isLoading = materialsLoading || regionsLoading || sourcesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Material - Combobox com pesquisa */}
        <FormField
          control={form.control}
          name="material_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Material *</FormLabel>
              <Popover open={materialOpen} onOpenChange={setMaterialOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {selectedMaterial
                        ? `${selectedMaterial.codigo} - ${selectedMaterial.nome}`
                        : "Selecione um material"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Pesquisar material..."
                      value={materialSearch}
                      onValueChange={setMaterialSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum material encontrado.</CommandEmpty>
                      <CommandGroup>
                        {(materials || []).map((material) => (
                          <CommandItem
                            key={material.id}
                            value={`${material.codigo} ${material.nome}`}
                            onSelect={() => {
                              form.setValue("material_id", material.id);
                              form.setValue(
                                "unidade_original",
                                material.unidade_base
                              );
                              setMaterialOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                material.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {material.codigo}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {material.nome}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preço */}
          <FormField
            control={form.control}
            name="preco"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço (€) *</FormLabel>
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

          {/* Unidade */}
          <FormField
            control={form.control}
            name="unidade_original"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidade *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="m²">m²</SelectItem>
                    <SelectItem value="m³">m³</SelectItem>
                    <SelectItem value="ml">ml (metro linear)</SelectItem>
                    <SelectItem value="un">un (unidade)</SelectItem>
                    <SelectItem value="l">l (litro)</SelectItem>
                    <SelectItem value="ton">ton (tonelada)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Região */}
          <FormField
            control={form.control}
            name="region_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Região *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a região" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(regions || []).map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fonte */}
          <FormField
            control={form.control}
            name="source_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fonte *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a fonte" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(sources || []).map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Data de Referência */}
        <FormField
          control={form.control}
          name="data_referencia"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Referência</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Observações */}
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionais sobre este preço..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={insertPrice.isPending}
        >
          {insertPrice.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A inserir...
            </>
          ) : (
            "Inserir Preço"
          )}
        </Button>
      </form>
    </Form>
  );
}
