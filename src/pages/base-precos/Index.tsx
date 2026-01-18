import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PriceConfidenceBadge } from "@/components/base-precos";
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

  const { data: priceRefs, isLoading } = useMaterialPriceReferences(filters);
  const { data: categories } = useMaterialCategories();
  const { data: regions } = useRegions();

  // Ordenar os resultados
  const sortedPrices = [...(priceRefs || [])].sort((a, b) => {
    if (sortBy === "preco") {
      return sortOrder === "asc"
        ? a.preco_medio - b.preco_medio
        : b.preco_medio - a.preco_medio;
    } else {
      return sortOrder === "asc"
        ? a.confidence_score - b.confidence_score
        : b.confidence_score - a.confidence_score;
    }
  });

  const toggleSort = (field: "preco" | "confidence") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <AppLayout 
      title="Base de Preços"
      subtitle="Preços de referência para materiais de construção"
      actions={
        <Link to="/base-precos/inserir">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Inserir Preço
          </Button>
        </Link>
      }
    >
      <div className="p-6 space-y-6">

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Pesquisa */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar material..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>

              {/* Categoria */}
              <Select
                value={filters.category_id || "all"}
                onValueChange={(v) =>
                  setFilters({
                    ...filters,
                    category_id: v === "all" ? undefined : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {(categories || []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Região */}
              <Select
                value={filters.region_id || "all"}
                onValueChange={(v) =>
                  setFilters({
                    ...filters,
                    region_id: v === "all" ? undefined : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Região" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as regiões</SelectItem>
                  {(regions || []).map((reg) => (
                    <SelectItem key={reg.id} value={reg.id}>
                      {reg.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Confiança mínima */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Confiança mínima: {filters.min_confidence}%
                </label>
                <Slider
                  value={[filters.min_confidence || 0]}
                  onValueChange={([v]) =>
                    setFilters({ ...filters, min_confidence: v })
                  }
                  max={100}
                  step={10}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de preços */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedPrices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum preço de referência encontrado.</p>
                <p className="text-sm mt-1">
                  Os preços são calculados automaticamente a partir dos preços
                  brutos inseridos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3"
                          onClick={() => toggleSort("preco")}
                        >
                          Preço Médio
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>P10</TableHead>
                      <TableHead>P90</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3"
                          onClick={() => toggleSort("confidence")}
                        >
                          Confiança
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Região</TableHead>
                      <TableHead>Amostras</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPrices.map((ref) => (
                      <TableRow key={ref.id}>
                        <TableCell>
                          <Badge variant="secondary">
                            {ref.material?.category?.nome || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {ref.material?.codigo}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {ref.material?.nome}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{ref.material?.unidade_base}</TableCell>
                        <TableCell className="font-medium">
                          €{ref.preco_medio.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ref.preco_p10
                            ? `€${ref.preco_p10.toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ref.preco_p90
                            ? `€${ref.preco_p90.toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <PriceConfidenceBadge
                            score={ref.confidence_score}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>{ref.region?.nome}</TableCell>
                        <TableCell>{ref.sample_size}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legenda */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>
            <strong>P10:</strong> Preço mínimo (percentil 10)
          </span>
          <span>
            <strong>P90:</strong> Preço máximo (percentil 90)
          </span>
          <span>
            <strong>Confiança:</strong> Baseada em amostras, recência e
            consistência
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
