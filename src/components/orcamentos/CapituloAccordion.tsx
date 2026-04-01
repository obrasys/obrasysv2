import { useState } from 'react';
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
  MoreVertical, 
  Edit, 
  Trash2, 
  Plus, 
  Search,
  Euro,
  FileText,
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

              {filteredArtigos.length > 0 ? (() => {
                const hasItemsWithoutPrices = filteredArtigos.some(
                  (a) => a.preco_unitario === 0 && (a.valor_total === 0 || a.valor_total === null)
                );
                const allWithoutPrices = filteredArtigos.every(
                  (a) => a.preco_unitario === 0 && (a.valor_total === 0 || a.valor_total === null)
                );
                const showSimplified = allWithoutPrices || (hasItemsWithoutPrices && filteredArtigos.filter(a => a.preco_unitario === 0 && (a.valor_total === 0 || a.valor_total === null)).length > filteredArtigos.length / 2);

                return showSimplified ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase border-b">
                      Descrição
                    </div>
                    {filteredArtigos.map((artigo) => (
                      <div
                        key={artigo.id}
                        className="group flex items-start gap-2 px-3 py-2 rounded-md hover:bg-muted/50 text-sm"
                      >
                        <span className="text-muted-foreground shrink-0">{artigo.codigo}</span>
                        <span className="flex-1">{artigo.descricao}</span>
                        {!isReadOnly && (
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditArtigo(artigo.id)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteArtigo(artigo.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-end px-3 py-2 border-t mt-2">
                      <span className="text-sm font-semibold">
                        Subtotal Capítulo: {formatCurrency(capitulo.valor_total)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase border-b">
                      <div className="col-span-1">Cód.</div>
                      <div className="col-span-4">Descrição</div>
                      <div className="col-span-1 text-center">Un.</div>
                      <div className="col-span-2 text-right">Qtd.</div>
                      <div className="col-span-2 text-right">P. Unit.</div>
                      <div className="col-span-2 text-right">Total</div>
                    </div>
                    {filteredArtigos.map((artigo) => (
                      <ArtigoRow
                        key={artigo.id}
                        artigo={artigo}
                        onEdit={() => onEditArtigo(artigo.id)}
                        onDelete={() => onDeleteArtigo(artigo.id)}
                        isReadOnly={isReadOnly}
                      />
                    ))}
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 border-t mt-2">
                      <div className="col-span-10 text-sm font-semibold text-right">
                        Subtotal Capítulo:
                      </div>
                      <div className="col-span-2 text-sm text-right font-semibold">
                        {formatCurrency(capitulo.valor_total)}
                      </div>
                    </div>
                  </div>
                );
              })() : (
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
