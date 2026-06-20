import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/patterns';
import { Loader2, Search, Truck, FileSpreadsheet, ChevronLeft } from 'lucide-react';

interface PricebookRow {
  id: string;
  name: string;
  categoria: string | null;
  status: string;
  item_count: number | null;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  fornecedor_id: string;
  fornecedor: { id: string; nome: string; categoria: string | null } | null;
}

interface ItemRow {
  id: string;
  codigo_artigo: string | null;
  descricao: string;
  unidade: string | null;
  preco_unitario: number;
  iva: number | null;
  categoria: string | null;
  marca: string | null;
  referencia: string | null;
}

export function SupplierPricebooksPanel() {
  const [search, setSearch] = useState('');
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('all');
  const [selected, setSelected] = useState<PricebookRow | null>(null);
  const [itemSearch, setItemSearch] = useState('');

  const { data: pricebooks, isLoading } = useQuery({
    queryKey: ['base-precos-supplier-pricebooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_supplier_pricebooks')
        .select(`
          id, name, categoria, status, item_count, valid_from, valid_to, created_at, fornecedor_id,
          fornecedor:fornecedores(id, nome, categoria)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) as PricebookRow[];
    },
  });

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ['base-precos-supplier-pricebook-items', selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_supplier_pricebook_items')
        .select(
          'id, codigo_artigo, descricao, unidade, preco_unitario, iva, categoria, marca, referencia'
        )
        .eq('pricebook_id', selected!.id)
        .order('descricao', { ascending: true });
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  const fornecedores = useMemo(() => {
    const map = new Map<string, string>();
    (pricebooks || []).forEach((p) => {
      if (p.fornecedor) map.set(p.fornecedor.id, p.fornecedor.nome);
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [pricebooks]);

  const filtered = useMemo(() => {
    return (pricebooks || []).filter((p) => {
      if (fornecedorFilter !== 'all' && p.fornecedor_id !== fornecedorFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(s) ||
        (p.fornecedor?.nome || '').toLowerCase().includes(s) ||
        (p.categoria || '').toLowerCase().includes(s)
      );
    });
  }, [pricebooks, fornecedorFilter, search]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!itemSearch) return items;
    const s = itemSearch.toLowerCase();
    return items.filter(
      (it) =>
        it.descricao.toLowerCase().includes(s) ||
        (it.codigo_artigo || '').toLowerCase().includes(s) ||
        (it.referencia || '').toLowerCase().includes(s) ||
        (it.categoria || '').toLowerCase().includes(s)
    );
  }, [items, itemSearch]);

  // Detail view
  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {selected.fornecedor?.nome || 'Fornecedor'}
            </p>
            <h3 className="font-semibold text-base truncate">{selected.name}</h3>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {selected.item_count ?? 0} itens
          </Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar itens..."
            className="pl-10 h-9"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {loadingItems ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FileSpreadsheet}
                  title="Sem itens"
                  description="Esta tabela ainda não tem itens registados."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[120px]">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[100px]">Categoria</TableHead>
                      <TableHead className="w-[70px]">Unid.</TableHead>
                      <TableHead className="w-[110px] text-right">Preço</TableHead>
                      <TableHead className="w-[70px] text-right">IVA</TableHead>
                      <TableHead className="w-[120px]">Marca</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((it) => (
                      <TableRow key={it.id} className="hover:bg-muted/20">
                        <TableCell className="text-xs font-mono">
                          {it.codigo_artigo || '-'}
                        </TableCell>
                        <TableCell className="text-sm">{it.descricao}</TableCell>
                        <TableCell>
                          {it.categoria ? (
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {it.categoria}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.unidade || '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-sm text-right">
                          €{Number(it.preco_unitario || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-right">
                          {it.iva != null ? `${it.iva}%` : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.marca || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar tabela ou fornecedor..."
            className="pl-10 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {fornecedores.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Truck}
                title="Nenhuma tabela de fornecedor"
                description="Importe uma tabela de preços na ficha de um fornecedor para a ver aqui."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="w-[140px]">Categoria</TableHead>
                    <TableHead className="w-[90px] text-center">Itens</TableHead>
                    <TableHead className="w-[130px]">Validade</TableHead>
                    <TableHead className="w-[100px] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow
                      key={p.id}
                      className="hover:bg-muted/20 cursor-pointer"
                      onClick={() => setSelected(p)}
                    >
                      <TableCell className="text-sm font-medium">
                        {p.fornecedor?.nome || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{p.name}</TableCell>
                      <TableCell>
                        {p.categoria ? (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {p.categoria}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {p.item_count ?? 0}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.valid_to ? `até ${new Date(p.valid_to).toLocaleDateString('pt-PT')}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(p);
                          }}
                        >
                          Ver itens
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
