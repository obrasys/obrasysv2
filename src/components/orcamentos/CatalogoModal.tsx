import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCatalogo } from '@/hooks/useOrcamentos';
import { CATEGORIAS, type ArtigoFormData } from '@/types/orcamentos';
import { Search, Plus, Loader2 } from 'lucide-react';

interface CatalogoModalProps {
  open: boolean;
  onClose: () => void;
  onAddArtigos: (artigos: ArtigoFormData[]) => void;
}

export function CatalogoModal({ open, onClose, onAddArtigos }: CatalogoModalProps) {
  const { defaultArticles, artigosTrabalho, isLoading } = useCatalogo();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('sistema');

  const allArticles = useMemo(() => {
    const sistema = (defaultArticles || []).map((a) => ({ ...a, source: 'sistema' }));
    const empresa = (artigosTrabalho || []).map((a) => ({ ...a, source: 'empresa' }));
    return [...sistema, ...empresa];
  }, [defaultArticles, artigosTrabalho]);

  const filteredArticles = useMemo(() => {
    let result = allArticles;

    // Filter by tab
    if (activeTab === 'sistema') {
      result = result.filter((a) => a.source === 'sistema');
    } else if (activeTab === 'empresa') {
      result = result.filter((a) => a.source === 'empresa');
    }

    // Filter by category
    if (selectedCategoria && selectedCategoria !== 'all') {
      result = result.filter((a) => a.categoria === selectedCategoria);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.descricao.toLowerCase().includes(query) ||
          a.codigo.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allArticles, activeTab, selectedCategoria, searchQuery]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleAddSelected = () => {
    const artigosToAdd: ArtigoFormData[] = allArticles
      .filter((a) => selectedIds.has(a.id))
      .map((a) => ({
        codigo: a.codigo,
        descricao: a.descricao,
        unidade: a.unidade,
        quantidade: 1,
        preco_unitario: a.preco_unitario,
      }));

    onAddArtigos(artigosToAdd);
    setSelectedIds(new Set());
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchQuery('');
    setSelectedCategoria('all');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Catálogo de Artigos</DialogTitle>
          <DialogDescription>
            Selecione artigos para adicionar ao orçamento
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sistema">Catálogo do Sistema</TabsTrigger>
            <TabsTrigger value="empresa">Meu Catálogo</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 my-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar artigos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIAS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[400px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredArticles.length > 0 ? (
              <div className="divide-y">
                {filteredArticles.map((artigo) => (
                  <div
                    key={artigo.id}
                    className="flex items-center gap-4 p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleSelection(artigo.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(artigo.id)}
                      onCheckedChange={() => toggleSelection(artigo.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">
                          {artigo.codigo}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {artigo.categoria}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1 line-clamp-2">{artigo.descricao}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium">
                        {formatCurrency(artigo.preco_unitario)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        por {artigo.unidade}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhum artigo encontrado
              </div>
            )}
          </ScrollArea>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} artigo(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleAddSelected} disabled={selectedIds.size === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Selecionados
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
