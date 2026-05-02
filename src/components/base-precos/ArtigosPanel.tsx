import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Download,
  Upload,
  Search,
  Loader2,
  Trash2,
  Sparkles,
  FileSpreadsheet,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  useBaseArtigosUser,
  useImportBaseGlobalToUser,
  useImportCsvToUser,
  useUpdateArtigoUser,
  useDeleteArtigoUser,
  type BaseArtigoUser,
  type TipoBase,
} from "@/hooks/useBaseArtigos";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ArtigosPanel() {
  const [search, setSearch] = useState("");
  const [tipoBase, setTipoBase] = useState<TipoBase>("geral");
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: artigos, isLoading } = useBaseArtigosUser(search, tipoBase);
  const importGlobal = useImportBaseGlobalToUser();
  const importCsv = useImportCsvToUser();
  const update = useUpdateArtigoUser();
  const remove = useDeleteArtigoUser();

  const [editId, setEditId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<BaseArtigoUser>>({});

  const grouped = useMemo(() => {
    const map = new Map<string, BaseArtigoUser[]>();
    (artigos || []).forEach((a) => {
      const list = map.get(a.capitulo) || [];
      list.push(a);
      map.set(a.capitulo, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [artigos]);

  const total = artigos?.length ?? 0;

  const onCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) importCsv.mutate(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (a: BaseArtigoUser) => {
    setEditId(a.id);
    setEditRow({
      artigo: a.artigo,
      unidade: a.unidade,
      mao_obra_estimada_eur: a.mao_obra_estimada_eur,
      material_estimado_eur: a.material_estimado_eur,
      margem_configuravel_pct: a.margem_configuravel_pct,
      preco_indicativo_eur: a.preco_indicativo_eur,
    });
  };

  const saveEdit = () => {
    if (!editId) return;
    const custo = (Number(editRow.mao_obra_estimada_eur) || 0) +
      (Number(editRow.material_estimado_eur) || 0);
    const margem = Number(editRow.margem_configuravel_pct) || 0;
    const preco = margem >= 100 ? custo : custo / (1 - margem / 100);
    update.mutate(
      {
        id: editId,
        patch: {
          ...editRow,
          custo_direto_eur: Number(custo.toFixed(2)),
          preco_indicativo_eur: Number(preco.toFixed(2)),
        },
      },
      { onSuccess: () => setEditId(null) }
    );
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Artigos de Obra (PT)</p>
              <p className="text-xs text-muted-foreground">
                {total} artigo(s) na sua base. Pode editar livremente preços, mão-de-obra e margens.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => importGlobal.mutate()}
              disabled={importGlobal.isPending}
            >
              {importGlobal.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Importar Base Padrão Obra Sys
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={importCsv.isPending}
            >
              {importCsv.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Importar CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={onCsvUpload}
            />

            <a
              href="/base-precos-template.csv"
              download
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground px-2"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Template CSV
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por código, artigo ou capítulo..."
          className="pl-10 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">A sua base de artigos está vazia</p>
            <p className="text-sm mt-1">
              Comece por importar a <strong>Base Padrão Obra Sys (300 artigos PT)</strong> ou um CSV próprio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={grouped.slice(0, 1).map(([c]) => c)}>
          {grouped.map(([capitulo, items]) => (
            <AccordionItem key={capitulo} value={capitulo} className="border rounded-xl mb-2 px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">{capitulo}</span>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[90px]">Código</TableHead>
                        <TableHead>Artigo</TableHead>
                        <TableHead className="w-[60px]">Un.</TableHead>
                        <TableHead className="w-[90px] text-right">M.O.</TableHead>
                        <TableHead className="w-[90px] text-right">Material</TableHead>
                        <TableHead className="w-[80px] text-right">Margem%</TableHead>
                        <TableHead className="w-[100px] text-right">Preço €</TableHead>
                        <TableHead className="w-[110px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((a) => {
                        const isEditing = editId === a.id;
                        return (
                          <TableRow key={a.id} className="hover:bg-muted/20">
                            <TableCell className="text-xs font-mono">{a.codigo}</TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={String(editRow.artigo ?? "")}
                                  onChange={(e) => setEditRow({ ...editRow, artigo: e.target.value })}
                                  className="h-8 text-sm"
                                />
                              ) : (
                                <div>
                                  <p className="text-sm font-medium leading-tight">{a.artigo}</p>
                                  {a.subcapitulo && (
                                    <p className="text-[11px] text-muted-foreground">{a.subcapitulo}</p>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {isEditing ? (
                                <Input
                                  value={String(editRow.unidade ?? "")}
                                  onChange={(e) => setEditRow({ ...editRow, unidade: e.target.value })}
                                  className="h-8 w-16 text-xs"
                                />
                              ) : a.unidade}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {isEditing ? (
                                <Input
                                  type="number" step="0.01"
                                  value={String(editRow.mao_obra_estimada_eur ?? 0)}
                                  onChange={(e) => setEditRow({ ...editRow, mao_obra_estimada_eur: parseFloat(e.target.value) || 0 })}
                                  className="h-8 w-20 text-right text-xs"
                                />
                              ) : `€${a.mao_obra_estimada_eur.toFixed(2)}`}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {isEditing ? (
                                <Input
                                  type="number" step="0.01"
                                  value={String(editRow.material_estimado_eur ?? 0)}
                                  onChange={(e) => setEditRow({ ...editRow, material_estimado_eur: parseFloat(e.target.value) || 0 })}
                                  className="h-8 w-20 text-right text-xs"
                                />
                              ) : `€${a.material_estimado_eur.toFixed(2)}`}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {isEditing ? (
                                <Input
                                  type="number" step="0.1"
                                  value={String(editRow.margem_configuravel_pct ?? 0)}
                                  onChange={(e) => setEditRow({ ...editRow, margem_configuravel_pct: parseFloat(e.target.value) || 0 })}
                                  className="h-8 w-16 text-right text-xs"
                                />
                              ) : `${a.margem_configuravel_pct}%`}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm">
                              €{a.preco_indicativo_eur.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(a)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-7 w-7">
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Eliminar artigo?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {a.codigo} — {a.artigo}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => remove.mutate(a.id)}>
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
