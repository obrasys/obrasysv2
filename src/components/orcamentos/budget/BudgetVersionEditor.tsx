import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrcamento } from "@/hooks/useOrcamentos";
import { useBudgetComparison } from "@/hooks/useBudgetComparison";
import { BudgetChapterAccordion } from "./BudgetChapterAccordion";
import { BudgetItemFormDialog } from "./BudgetItemFormDialog";
import { BudgetChapterFormDialog } from "./BudgetChapterFormDialog";
import type { ArtigoOrcamento } from "@/types/orcamentos";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  /** id da versão do Budget (linha em orcamentos com budget_version_number) */
  versionId: string;
  /** id do orçamento base bloqueado */
  baseId: string;
  /** controla edição (rascunho ou ativa => editável) */
  readOnly: boolean;
}

export function BudgetVersionEditor({ versionId, baseId, readOnly }: Props) {
  const {
    orcamento,
    isLoading,
    createCapitulo,
    updateCapitulo,
    deleteCapitulo,
    createArtigo,
    updateArtigo,
    deleteArtigo,
  } = useOrcamento(versionId);

  const comparison = useBudgetComparison(baseId, orcamento ?? undefined);

  // Item dialog
  const [itemDialog, setItemDialog] = useState<{
    open: boolean;
    capituloId: string | null;
    artigo: ArtigoOrcamento | null;
  }>({ open: false, capituloId: null, artigo: null });

  // Chapter dialog
  const [chapterDialog, setChapterDialog] = useState<{ open: boolean; editId: string | null }>({
    open: false,
    editId: null,
  });

  // Confirm deletes
  const [delArtigo, setDelArtigo] = useState<string | null>(null);
  const [delCapitulo, setDelCapitulo] = useState<string | null>(null);

  const nextChapterNumero = useMemo(
    () => (orcamento?.capitulos?.reduce((max, c) => Math.max(max, c.numero), 0) ?? 0) + 1,
    [orcamento?.capitulos],
  );

  if (isLoading || !orcamento) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSubmitArtigo = async (data: any) => {
    if (itemDialog.artigo) {
      await updateArtigo.mutateAsync({ artigoId: itemDialog.artigo.id, ...data });
    } else if (itemDialog.capituloId) {
      await createArtigo.mutateAsync({ capituloId: itemDialog.capituloId, ...data });
    }
    setItemDialog({ open: false, capituloId: null, artigo: null });
  };

  const handleSubmitCapitulo = async (data: any) => {
    if (chapterDialog.editId) {
      await updateCapitulo.mutateAsync({ capituloId: chapterDialog.editId, ...data });
    } else {
      await createCapitulo.mutateAsync(data);
    }
    setChapterDialog({ open: false, editId: null });
  };

  const editingChapter = chapterDialog.editId
    ? orcamento.capitulos?.find((c) => c.id === chapterDialog.editId)
    : null;

  return (
    <div className="space-y-3">
      {/* Toolbar capítulos */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Capítulos e artigos desta versão</p>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => setChapterDialog({ open: true, editId: null })}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo capítulo
          </Button>
        )}
      </div>

      {(orcamento.capitulos?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum capítulo nesta versão do Budget.
            {!readOnly && (
              <div className="mt-3">
                <Button size="sm" onClick={() => setChapterDialog({ open: true, editId: null })}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar capítulo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orcamento.capitulos!.map((cap) => (
            <BudgetChapterAccordion
              key={cap.id}
              capitulo={cap}
              comparison={comparison}
              readOnly={readOnly}
              onAddArtigo={(capituloId) => setItemDialog({ open: true, capituloId, artigo: null })}
              onEditArtigo={(artigo) =>
                setItemDialog({ open: true, capituloId: artigo.capitulo_id, artigo })
              }
              onDeleteArtigo={(id) => setDelArtigo(id)}
              onEditCapitulo={(capituloId) => setChapterDialog({ open: true, editId: capituloId })}
              onDeleteCapitulo={(capituloId) => setDelCapitulo(capituloId)}
              onUpdateQuantidade={(artigoId, quantidade) =>
                updateArtigo.mutate({ artigoId, quantidade })
              }
              onUpdateCustoVenda={(artigoId, payload) => updateArtigo.mutate({ artigoId, ...payload })}
            />
          ))}
        </div>
      )}

      <BudgetItemFormDialog
        open={itemDialog.open}
        onOpenChange={(o) => setItemDialog((s) => ({ ...s, open: o }))}
        initial={itemDialog.artigo}
        onSubmit={handleSubmitArtigo}
        saving={createArtigo.isPending || updateArtigo.isPending}
      />

      <BudgetChapterFormDialog
        open={chapterDialog.open}
        onOpenChange={(o) => setChapterDialog((s) => ({ ...s, open: o }))}
        nextNumero={nextChapterNumero}
        initial={editingChapter ? { numero: editingChapter.numero, titulo: editingChapter.titulo, descricao: editingChapter.descricao ?? "" } : null}
        onSubmit={handleSubmitCapitulo}
        saving={createCapitulo.isPending || updateCapitulo.isPending}
      />

      <AlertDialog open={!!delArtigo} onOpenChange={(o) => !o && setDelArtigo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover artigo desta versão?</AlertDialogTitle>
            <AlertDialogDescription>
              O artigo é removido apenas desta versão do Budget. O Orçamento Base bloqueado permanece intacto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (delArtigo) await deleteArtigo.mutateAsync(delArtigo);
                setDelArtigo(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!delCapitulo} onOpenChange={(o) => !o && setDelCapitulo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar capítulo desta versão?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os artigos do capítulo serão removidos desta versão do Budget. O Orçamento Base bloqueado não é afetado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (delCapitulo) await deleteCapitulo.mutateAsync(delCapitulo);
                setDelCapitulo(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
