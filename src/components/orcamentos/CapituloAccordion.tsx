import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtigoRow } from './ArtigoRow';
import type { Capitulo, ArtigoFormData } from '@/types/orcamentos';
import {
  CAPITULO_COLUMNS,
  GROUP_LABELS,
  loadVisibleColumns,
  saveVisibleColumns,
  type CapituloColumnKey,
} from '@/lib/capitulo-columns';
import {
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Search,
  Euro,
  FileText,
  Columns3,
} from 'lucide-react';

interface CapituloAccordionProps {
  capitulo: Capitulo;
  onEdit: () => void;
  onDelete: () => void;
  onAddArtigo: () => void;
  onEditArtigo: (artigoId: string) => void;
  onDeleteArtigo: (artigoId: string) => void;
  onOpenCatalog: (capituloId: string) => void;
  onUpdateCommercial?: (capituloId: string, data: {
    client_summary_title?: string;
    client_summary_text?: string;
    client_exclusions_text?: string;
    include_in_client_summary?: boolean;
  }) => void;
  isReadOnly?: boolean;
}

export function CapituloAccordion({
  capitulo,
  onEdit,
  onDelete,
  onAddArtigo,
  onEditArtigo,
  onDeleteArtigo,
  onOpenCatalog,
  onUpdateCommercial,
  isReadOnly = false,
}: CapituloAccordionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryTitle, setSummaryTitle] = useState(capitulo.client_summary_title || '');
  const [summaryText, setSummaryText] = useState(capitulo.client_summary_text || '');
  const [exclusionsText, setExclusionsText] = useState(capitulo.client_exclusions_text || '');
  const [includeInSummary, setIncludeInSummary] = useState(capitulo.include_in_client_summary !== false);
  const [visibleCols, setVisibleCols] = useState<CapituloColumnKey[]>(() => loadVisibleColumns());
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  useEffect(() => {
    saveVisibleColumns(visibleCols);
  }, [visibleCols]);

  const toggleCol = (key: CapituloColumnKey) => {
    const def = CAPITULO_COLUMNS.find((c) => c.key === key);
    if (def?.required) return;
    setVisibleCols((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const groupedCols = CAPITULO_COLUMNS.reduce<Record<string, typeof CAPITULO_COLUMNS>>((acc, col) => {
    (acc[col.group] ||= []).push(col);
    return acc;
  }, {});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const filteredArtigos = (capitulo.artigos || []).filter((artigo) =>
    artigo.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artigo.codigo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveCommercial = () => {
    onUpdateCommercial?.(capitulo.id, {
      client_summary_title: summaryTitle || undefined,
      client_summary_text: summaryText || undefined,
      client_exclusions_text: exclusionsText || undefined,
      include_in_client_summary: includeInSummary,
    });
  };

  return (
    <Accordion type="single" collapsible className="border rounded-lg">
      <AccordionItem value={capitulo.id} className="border-0">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-t-lg">
          <AccordionTrigger className="flex-1 hover:no-underline py-0">
            <div className="flex items-center gap-3 text-left">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {capitulo.numero}
              </span>
              <div>
                <h4 className="font-semibold">{capitulo.titulo}</h4>
                {capitulo.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {capitulo.descricao}
                  </p>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm font-medium flex items-center gap-1">
              <Euro className="h-3.5 w-3.5" />
              {formatCurrency(capitulo.valor_total)}
            </span>
            
            {!isReadOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <AccordionContent className="px-4 py-4">
          <Tabs defaultValue="artigos">
            <TabsList className="mb-3 h-8">
              <TabsTrigger value="artigos" className="text-xs h-7 gap-1">
                <Euro className="h-3 w-3" /> Artigos
              </TabsTrigger>
              <TabsTrigger value="resumo" className="text-xs h-7 gap-1">
                <FileText className="h-3 w-3" /> Resumo Cliente
              </TabsTrigger>
            </TabsList>

            <TabsContent value="artigos">
              {!isReadOnly && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar artigos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowColumnPicker((v) => !v)}
                    title="Colunas visíveis"
                  >
                    <Columns3 className="mr-2 h-4 w-4" />
                    Colunas
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onOpenCatalog(capitulo.id)}>
                    <Search className="mr-2 h-4 w-4" />
                    Catálogo
                  </Button>
                  <Button size="sm" onClick={onAddArtigo}>
                    <Plus className="mr-2 h-4 w-4" />
                    Artigo
                  </Button>
                </div>
              )}

              {showColumnPicker && (
                <div className="mb-3 rounded-md border border-border bg-muted/30 p-3 space-y-2">
                  {(['id', 'unit', 'total', 'final'] as const).map((group) => (
                    <div key={group}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        {GROUP_LABELS[group]}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {(groupedCols[group] || []).map((col) => (
                          <label
                            key={col.key}
                            className={`flex items-center gap-1.5 select-none ${col.required ? 'opacity-60' : 'cursor-pointer'}`}
                          >
                            <Checkbox
                              checked={visibleCols.includes(col.key)}
                              onCheckedChange={() => toggleCol(col.key)}
                              disabled={col.required}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-xs">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredArtigos.length > 0 ? (
                <div className="space-y-1 overflow-x-auto">
                  <div
                    className="grid gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b"
                    style={{
                      gridTemplateColumns:
                        CAPITULO_COLUMNS.filter((c) => visibleCols.includes(c.key))
                          .map((c) => {
                            if (c.key === 'item') return 'minmax(180px, 2.5fr)';
                            if (c.key === 'unidade') return 'minmax(56px, 0.6fr)';
                            if (c.key === 'qtd') return 'minmax(64px, 0.7fr)';
                            if (c.key === 'subtotal') return 'minmax(96px, 1fr)';
                            return 'minmax(84px, 0.9fr)';
                          })
                          .join(' ') + ' 64px',
                    }}
                  >
                    {CAPITULO_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((c) => (
                      <div
                        key={c.key}
                        className={c.numeric ? 'text-right' : c.key === 'unidade' ? 'text-center' : 'text-left'}
                      >
                        {c.label}
                      </div>
                    ))}
                    <div />
                  </div>
                  {filteredArtigos.map((artigo) => (
                    <ArtigoRow
                      key={artigo.id}
                      artigo={artigo}
                      onEdit={() => onEditArtigo(artigo.id)}
                      onDelete={() => onDeleteArtigo(artigo.id)}
                      isReadOnly={isReadOnly}
                      visibleCols={visibleCols}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Nenhum artigo encontrado' : 'Nenhum artigo neste capítulo'}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resumo">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`include-${capitulo.id}`}
                    checked={includeInSummary}
                    onCheckedChange={(checked) => setIncludeInSummary(!!checked)}
                    disabled={isReadOnly}
                  />
                  <Label htmlFor={`include-${capitulo.id}`} className="text-sm">
                    Incluir no documento comercial
                  </Label>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Título comercial</Label>
                  <Input
                    placeholder={`${capitulo.numero}. ${capitulo.titulo}`}
                    value={summaryTitle}
                    onChange={(e) => setSummaryTitle(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Resumo para o cliente</Label>
                  <Textarea
                    placeholder="Descreva o escopo dos trabalhos deste capítulo de forma comercial..."
                    value={summaryText}
                    onChange={(e) => setSummaryText(e.target.value)}
                    rows={4}
                    disabled={isReadOnly}
                    className="resize-none"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Exclusões</Label>
                  <Textarea
                    placeholder="Itens não incluídos neste capítulo (opcional)..."
                    value={exclusionsText}
                    onChange={(e) => setExclusionsText(e.target.value)}
                    rows={2}
                    disabled={isReadOnly}
                    className="resize-none"
                  />
                </div>

                {!isReadOnly && onUpdateCommercial && (
                  <Button size="sm" variant="outline" onClick={handleSaveCommercial}>
                    Guardar Resumo
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
