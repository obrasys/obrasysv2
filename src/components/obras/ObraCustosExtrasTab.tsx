import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  UtensilsCrossed,
  Fuel,
  Car,
  ParkingCircle,
  Wrench,
  MapPin,
  MoreHorizontal,
  Plus,
  X,
  Check,
  Trash2,
  Calendar,
  Receipt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { useFinanceiro } from '@/hooks/useFinanceiro';
import type { ContaFinanceira, ContaFinanceiraFormData } from '@/types/financeiro';

// ── Tipos de custo extra ──
const EXTRA_COST_TYPES = [
  { key: 'ALMOÇO', label: 'Almoço', icon: UtensilsCrossed, color: 'hsl(var(--chart-1))' },
  { key: 'GASÓLEO', label: 'Gasóleo', icon: Fuel, color: 'hsl(var(--chart-2))' },
  { key: 'PORTAGEM', label: 'Portagem', icon: Car, color: 'hsl(var(--chart-3))' },
  { key: 'ESTACIONAMENTO', label: 'Estacionamento', icon: ParkingCircle, color: 'hsl(var(--chart-4))' },
  { key: 'FERRAMENTA', label: 'Ferramenta', icon: Wrench, color: 'hsl(var(--chart-5))' },
  { key: 'DESLOCAÇÃO', label: 'Deslocação', icon: MapPin, color: 'hsl(var(--accent))' },
  { key: 'OUTROS', label: 'Outros', icon: MoreHorizontal, color: 'hsl(var(--muted-foreground))' },
] as const;

type ExtraCostKey = (typeof EXTRA_COST_TYPES)[number]['key'];

function extractTag(descricao: string | null): ExtraCostKey | null {
  if (!descricao) return null;
  const match = descricao.match(/^\[([A-ZÁÉÍÓÚÃÕÇ]+)\]/);
  if (!match) return null;
  const tag = match[1] as ExtraCostKey;
  return EXTRA_COST_TYPES.some((t) => t.key === tag) ? tag : null;
}

function cleanDesc(descricao: string | null): string {
  if (!descricao) return '';
  return descricao.replace(/^\[[A-ZÁÉÍÓÚÃÕÇ]+\]\s*/, '');
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

// ── Component ──
interface Props {
  obraId: string;
}

export function ObraCustosExtrasTab({ obraId }: Props) {
  const { contas, createConta, deleteConta } = useFinanceiro(obraId);
  const [activeType, setActiveType] = useState<ExtraCostKey | null>(null);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [descricao, setDescricao] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Filtrar apenas custos extras (origem = 'outros')
  const custosExtras = useMemo(
    () => (contas || []).filter((c) => c.origem === 'outros' && c.tipo === 'pagar'),
    [contas],
  );

  // KPIs
  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  const totalAcumulado = custosExtras.reduce((s, c) => s + Number(c.valor), 0);
  const totalMes = custosExtras
    .filter((c) => {
      const d = new Date(c.data_vencimento);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    })
    .reduce((s, c) => s + Number(c.valor), 0);

  const porTipo = useMemo(() => {
    const map: Record<string, number> = {};
    EXTRA_COST_TYPES.forEach((t) => (map[t.key] = 0));
    custosExtras.forEach((c) => {
      const tag = extractTag(c.descricao) || 'OUTROS';
      map[tag] = (map[tag] || 0) + Number(c.valor);
    });
    return map;
  }, [custosExtras]);

  // Submit
  const handleSubmit = () => {
    if (!activeType || !valor || Number(valor) <= 0) return;
    const tagLabel = EXTRA_COST_TYPES.find((t) => t.key === activeType)?.label || activeType;
    const fullDesc = `[${activeType}] ${descricao || tagLabel}`;
    const safeDate = data && data.trim() !== '' ? data : new Date().toISOString().split('T')[0];
    const formData: ContaFinanceiraFormData = {
      obra_id: obraId,
      tipo: 'pagar',
      origem: 'outros',
      valor: Number(valor),
      descricao: fullDesc,
      data_vencimento: safeDate,
      pago: true,
      data_pagamento: safeDate,
    };
    createConta.mutate(formData);
    setActiveType(null);
    setValor('');
    setDescricao('');
    setData(new Date().toISOString().split('T')[0]);
  };

  // Filtered list
  const displayList = useMemo(() => {
    if (filterType === 'all') return custosExtras;
    return custosExtras.filter((c) => extractTag(c.descricao) === filterType);
  }, [custosExtras, filterType]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Mês</p>
              <p className="text-lg font-bold">{formatCurrency(totalMes)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Acumulado</p>
              <p className="text-lg font-bold">{formatCurrency(totalAcumulado)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Almoços</p>
              <p className="text-lg font-bold">{formatCurrency(porTipo['ALMOÇO'] || 0)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <UtensilsCrossed className="h-5 w-5 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Gasóleo</p>
              <p className="text-lg font-bold">{formatCurrency(porTipo['GASÓLEO'] || 0)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Fuel className="h-5 w-5 text-secondary-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick-add buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lançamento Rápido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EXTRA_COST_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = activeType === type.key;
              return (
                <Button
                  key={type.key}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveType(isActive ? null : type.key)}
                  className="gap-1.5"
                >
                  <Icon className="h-4 w-4" />
                  {type.label}
                </Button>
              );
            })}
          </div>

          {activeType && (
            <div className="flex flex-col sm:flex-row gap-3 items-end p-4 rounded-lg border bg-muted/30">
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs text-muted-foreground mb-1 block">Valor (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="w-full sm:w-[150px]">
                <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-muted-foreground mb-1 block">Descrição (opcional)</label>
                <Input
                  placeholder="Ex: 3 almoços equipa"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmit} disabled={createConta.isPending || !valor}>
                  <Check className="h-4 w-4 mr-1" />
                  Gravar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setActiveType(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution chips */}
      <div className="flex flex-wrap gap-2">
        {EXTRA_COST_TYPES.filter((t) => (porTipo[t.key] || 0) > 0).map((type) => {
          const Icon = type.icon;
          return (
            <Badge key={type.key} variant="secondary" className="gap-1 py-1 px-2.5 text-xs">
              <Icon className="h-3 w-3" />
              {type.label}: {formatCurrency(porTipo[type.key])}
            </Badge>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Registos</CardTitle>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Filtrar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {EXTRA_COST_TYPES.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {displayList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nenhum custo extra registado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayList.map((conta) => {
                  const tag = extractTag(conta.descricao) || 'OUTROS';
                  const typeConfig = EXTRA_COST_TYPES.find((t) => t.key === tag) || EXTRA_COST_TYPES[6];
                  const Icon = typeConfig.icon;
                  return (
                    <TableRow key={conta.id}>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Icon className="h-3 w-3" />
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{cleanDesc(conta.descricao)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(conta.data_vencimento), 'dd/MM/yyyy', { locale: pt })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(conta.valor))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteConta.mutate(conta.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
