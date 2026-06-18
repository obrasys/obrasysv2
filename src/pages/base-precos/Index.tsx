import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Search,
  ArrowUpDown,
  Plus,
  Loader2,
  Sparkles,
  TrendingUp,
  Package,
  BarChart3,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PriceConfidenceBadge } from "@/components/base-precos";
import { AIPriceSearchPanel } from "@/components/base-precos/AIPriceSearchPanel";
import { ArtigosPanel } from "@/components/base-precos/ArtigosPanel";
import {
  useMaterialPriceReferences,
  useMaterialCategories,
  useRegions,
} from "@/hooks/useBasePrecos";
import type { PriceFilters } from "@/types/base-precos";

export default function BasePrecosIndex() {
  const [filters, setFilters] = useState<PriceFilters>({
    category_id: undefined,
    region_id: undefined,
    min_confidence: 0,
    search: "",
  });
  const [sortBy, setSortBy] = useState<"preco" | "confidence">("preco");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState("artigos");

  const { data: priceRefs, isLoading } = useMaterialPriceReferences(filters);
  const { data: categories } = useMaterialCategories();
  const { data: regions } = useRegions();

  const sortedPrices = [...(priceRefs || [])].sort((a, b) => {
    if (sortBy === "preco") {
      return sortOrder === "asc"
        ? a.preco_medio - b.preco_medio
        : b.preco_medio - a.preco_medio;
    }
    return sortOrder === "asc"
      ? a.confidence_score - b.confidence_score
      : b.confidence_score - a.confidence_score;
  });

  const toggleSort = (field: "preco" | "confidence") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Stats
  const totalMaterials = priceRefs?.length || 0;
  const avgConfidence = totalMaterials > 0
    ? Math.round((priceRefs || []).reduce((s, p) => s + p.confidence_score, 0) / totalMaterials)
    : 0;
  const highConfidence = (priceRefs || []).filter(p => p.confidence_score >= 80).length;
  const totalCategories = new Set((priceRefs || []).map(p => p.material?.category?.nome)).size;

  return (
    <AppLayout
      title="Base de Preços"
      subtitle="Pesquisa inteligente e referências de materiais de construção"
    >
      <div className="p-4 md:p-6 space-y-5">
        <PageHeader
          eyebrow="Catálogo"
          title="Base de Preços"
          subtitle="Pesquisa inteligente e referências de materiais de construção"
          actions={
            <Link to="/base-precos/inserir">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Inserir Preço
              </Button>
            </Link>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiMini icon={Package} label="Materiais" value={totalMaterials} />
          <KpiMini icon={BarChart3} label="Confiança Média" value={`${avgConfidence}%`} />
          <KpiMini icon={ShieldCheck} label="Alta Confiança" value={highConfidence} />
          <KpiMini icon={TrendingUp} label="Categorias" value={totalCategories} />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 max-w-2xl">
            <TabsTrigger value="artigos" className="flex items-center gap-2">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Artigos PT</span>
              <span className="sm:hidden">Artigos</span>
            </TabsTrigger>
            <TabsTrigger value="pesquisa-ai" className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pesquisa Axia™</span>
              <span className="sm:hidden">Axia™</span>
            </TabsTrigger>
            <TabsTrigger value="base-dados" className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Materiais</span>
              <span className="sm:hidden">Mat.</span>
            </TabsTrigger>
          </TabsList>

          {/* Artigos PT (Catálogo Obra Sys + CSV) */}
          <TabsContent value="artigos" className="mt-4">
            <ArtigosPanel />
          </TabsContent>

          {/* AI Search Tab */}
          <TabsContent value="pesquisa-ai" className="mt-4">
            <Card>
              <CardContent className="pt-5">
                <AIPriceSearchPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="base-dados" className="mt-4 space-y-4">
            {/* Filters Row */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar material..."
                  className="pl-10 h-9"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>

              <Select
                value={filters.category_id || "all"}
                onValueChange={(v) =>
                  setFilters({
                    ...filters,
                    category_id: v === "all" ? undefined : v,
                  })
                }
              >
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {(categories || []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.region_id || "all"}
                onValueChange={(v) =>
                  setFilters({
                    ...filters,
                    region_id: v === "all" ? undefined : v,
                  })
                }
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Região" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas regiões</SelectItem>
                  {(regions || []).map((reg) => (
                    <SelectItem key={reg.id} value={reg.id}>
                      {reg.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : sortedPrices.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={Database}
                      title="Nenhum preço de referência encontrado"
                      description="Use a pesquisa Axia™ para encontrar preços de mercado ou insira manualmente."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[120px]">Categoria</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead className="w-[70px]">Unid.</TableHead>
                          <TableHead className="w-[110px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="-ml-3 h-7 text-xs"
                              onClick={() => toggleSort("preco")}
                            >
                              Preço Médio
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="w-[80px]">P10</TableHead>
                          <TableHead className="w-[80px]">P90</TableHead>
                          <TableHead className="w-[100px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="-ml-3 h-7 text-xs"
                              onClick={() => toggleSort("confidence")}
                            >
                              Confiança
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="w-[100px]">Região</TableHead>
                          <TableHead className="w-[60px] text-center">N</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedPrices.map((ref) => (
                          <TableRow key={ref.id} className="hover:bg-muted/20">
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {ref.material?.category?.nome || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {ref.material?.codigo}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {ref.material?.nome}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {ref.material?.unidade_base}
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                              €{ref.preco_medio.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {ref.preco_p10 ? `€${ref.preco_p10.toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {ref.preco_p90 ? `€${ref.preco_p90.toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell>
                              <PriceConfidenceBadge
                                score={ref.confidence_score}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell className="text-xs">{ref.region?.nome}</TableCell>
                            <TableCell className="text-xs text-center text-muted-foreground">
                              {ref.sample_size}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span><strong>P10:</strong> Percentil 10 (mínimo)</span>
              <span><strong>P90:</strong> Percentil 90 (máximo)</span>
              <span><strong>N:</strong> Nº de amostras</span>
              <span><strong>Confiança:</strong> Baseada em amostras, recência e consistência</span>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function KpiMini({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card className="border-border">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
