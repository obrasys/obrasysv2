import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArtigoRow } from './ArtigoRow';
import type { Capitulo, ArtigoFormData } from '@/types/orcamentos';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Plus, 
  Search,
  Euro
} from 'lucide-react';

interface CapituloAccordionProps {
  capitulo: Capitulo;
  onEdit: () => void;
  onDelete: () => void;
  onAddArtigo: () => void;
  onEditArtigo: (artigoId: string) => void;
  onDeleteArtigo: (artigoId: string) => void;
  onOpenCatalog: (capituloId: string) => void;
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
  isReadOnly = false,
}: CapituloAccordionProps) {
  const [searchQuery, setSearchQuery] = useState('');

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

          {filteredArtigos.length > 0 ? (
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
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Nenhum artigo encontrado' : 'Nenhum artigo neste capítulo'}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
