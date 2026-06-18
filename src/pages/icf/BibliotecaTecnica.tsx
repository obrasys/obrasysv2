import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Search } from 'lucide-react';
import { useIcfBlockLibrary } from '@/hooks/useIcfBlockLibrary';
import { ICFBlockCard } from '@/components/icf/library/ICFBlockCard';

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'bloco_principal', label: 'Blocos' },
  { value: 'topo', label: 'Topos' },
  { value: 'espacador', label: 'Espaçadores' },
  { value: 'detalhe_tecnico', label: 'Detalhes' },
];

const IcfBibliotecaTecnica = () => {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useIcfBlockLibrary(tab === 'all' ? undefined : tab);

  const filtered = (data ?? []).filter(b => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.use_case ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout
      title="Biblioteca Técnica ICF"
      subtitle="Catálogo de componentes HOMEBLOCK - desenhos técnicos oficiais"
    >
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Procurar por nome, código ou aplicação…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="overflow-x-auto">
            {CATEGORIES.map(c => (
              <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(c => (
            <TabsContent key={c.value} value={c.value} className="mt-4">
              {isLoading ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
                  A carregar biblioteca…
                </CardContent></Card>
              ) : filtered.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
                  Nenhum componente encontrado.
                </CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map(item => <ICFBlockCard key={item.id} item={item} />)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <p className="text-xs text-muted-foreground italic pt-2">
          Os desenhos SVG são referência visual oficial HOMEBLOCK. As medidas usadas pela Axia e
          pelo motor de composição vêm dos campos estruturados desta biblioteca.
        </p>
      </div>
    </AppLayout>
  );
};

export default IcfBibliotecaTecnica;
