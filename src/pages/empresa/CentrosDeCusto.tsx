import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useCostCenters, useCreateCostCenter, useUpdateCostCenter } from '@/hooks/useCostCenters';
import type { CostCenter } from '@/types/cost-center';
import { Plus, Building2, Briefcase, Search } from 'lucide-react';

export default function CentrosDeCustoPage() {
  const { toast } = useToast();
  const { data: centers = [], isLoading } = useCostCenters();
  const createMut = useCreateCostCenter();
  const updateMut = useUpdateCostCenter();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'estrutura' | 'obra'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', notes: '' });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return centers.filter((c) => {
      if (tab !== 'all' && c.type !== tab) return false;
      if (!term) return true;
      return (
        c.code.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term) ||
        (c.location ?? '').toLowerCase().includes(term)
      );
    });
  }, [centers, search, tab]);

  const counts = useMemo(() => {
    return {
      estrutura: centers.filter((c) => c.type === 'estrutura').length,
      obra: centers.filter((c) => c.type === 'obra').length,
    };
  }, [centers]);

  const handleCreate = async () => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code || !name) {
      toast({ title: 'Código e nome são obrigatórios', variant: 'destructive' });
      return;
    }
    if (!/^CE\.[A-Za-z0-9.\-_]+$/i.test(code)) {
      toast({
        title: 'Código inválido',
        description: 'Centros de estrutura devem usar o prefixo CE. (ex.: CE.09, CE.01.A).',
        variant: 'destructive',
      });
      return;
    }
    try {
      await createMut.mutateAsync({
        code,
        name,
        type: 'estrutura',
        notes: form.notes || null,
      });
      toast({ title: 'Centro de custo criado' });
      setCreateOpen(false);
      setForm({ code: '', name: '', notes: '' });
    } catch (e: any) {
      toast({ title: 'Erro ao criar', description: e.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (c: CostCenter) => {
    await updateMut.mutateAsync({ id: c.id, patch: { active: !c.active } });
    toast({ title: c.active ? 'Centro desativado' : 'Centro reativado' });
  };

  return (
    <AppLayout title="Centros de Custo">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Centros de Custo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Estrutura (CE) para custos fixos da empresa · Obra (OB) gerado automaticamente para cada obra.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo CE
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo centro de custo de estrutura</DialogTitle>
                <DialogDescription>
                  Os centros OB são criados automaticamente ao criar uma obra. Use este formulário apenas para custos
                  fixos da empresa (CE).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    placeholder="CE.09"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex.: Formação Profissional"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createMut.isPending}>
                  {createMut.isPending ? 'A criar...' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 text-primary p-3">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Centros de Estrutura</p>
                <p className="text-2xl font-semibold">{counts.estrutura}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 text-emerald-600 p-3">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Centros de Obra</p>
                <p className="text-2xl font-semibold">{counts.obra}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-muted text-muted-foreground p-3">
                <Search className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Pesquisar</p>
                <Input
                  placeholder="Código, nome ou localização..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">Todos ({centers.length})</TabsTrigger>
                <TabsTrigger value="estrutura">Estrutura ({counts.estrutura})</TabsTrigger>
                <TabsTrigger value="obra">Obras ({counts.obra})</TabsTrigger>
              </TabsList>
              <TabsContent value={tab} className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Código</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead className="text-right">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            A carregar...
                          </TableCell>
                        </TableRow>
                      )}
                      {!isLoading && filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Sem centros de custo correspondentes.
                          </TableCell>
                        </TableRow>
                      )}
                      {filtered.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.code}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            {c.type === 'estrutura' ? (
                              <Badge variant="secondary">Estrutura</Badge>
                            ) : (
                              <Badge>Obra</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{c.location ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => toggleActive(c)}>
                              {c.active ? 'Ativo' : 'Inativo'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
