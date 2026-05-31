import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrcamento } from "@/hooks/useOrcamentos";
import { CapituloAccordion } from "@/components/orcamentos/CapituloAccordion";
import { ArtigoForm } from "@/components/orcamentos/ArtigoForm";
import { CatalogoModal } from "@/components/orcamentos/CatalogoModal";
import { BudgetChapterFormDialog } from "./BudgetChapterFormDialog";
import type { ArtigoFormData } from "@/types/orcamentos";
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
  /** id do orçamento base bloqueado (mantido para retro-compat / contexto) */
  baseId: string;
  /** controla edição (rascunho ou ativa => editável) */
  readOnly: boolean;
}

export function BudgetVersionEditor({ versionId, readOnly }: Props) {
  const {
    orcamento,
    isLoading,
    createCapitulo,
    updateCapitulo,
    deleteCapitulo,
    createArtigo,
    updateArtigo,
    deleteArtigo,
    addArtigosFromCatalog,
  } = useOrcamento(versionId);

  // Artigo dialog (mesmo form do Orçamento Base, com Decomposição de Custo)
  const [artigoModal, setArtigoModal] = useState<{
    open: boolean;
    capituloId: string | null;
    artigoId: string | null;
  }>({ open: false, capituloId: null, artigoId: null });

  // Catálogo modal
  const [catalogoModal, setCatalogoModal] = useState<{ open: boolean; capituloId: string | null }>({
    open: false,
    capituloId: null,
  });

  // Capítulo dialog
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

  const editingArtigo = artigoModal.artigoId
    ? orcamento.capitulos
        ?.flatMap((c) => c.artigos ?? [])
        .find((a) => a.id === artigoModal.artigoId)
    : null;

  const getArtigoDefaults = (): Partial<ArtigoFormData> | undefined => {
    if (!editingArtigo) return undefined;
    const a: any = editingArtigo;
    return {
      codigo: a.codigo || "",
      descricao: a.descricao,
      unidade: a.unidade,
      quantidade: a.quantidade,
      preco_base: a.preco_base ?? a.preco_unitario,
      margem_lucro_artigo: a.margem_lucro_artigo ?? 0,
      preco_unitario: a.preco_unitario,
      custo_mo: a.custo_mo ?? 0,
      custo_mat: a.custo_mat ?? 0,
      custo_sub: a.custo_sub ?? 0,
      custo_srv: a.custo_srv ?? 0,
      custo_alu: a.custo_alu ?? 0,
      custo_div: a.custo_div ?? 0,
      quantity_source: a.quantity_source ?? "manual",
      linked_element_id: a.linked_element_id ?? null,
      linked_rule_id: a.linked_rule_id ?? null,
    };
  };

  const handleSaveArtigo = async (data: ArtigoFormData) => {
    if (artigoModal.artigoId) {
      await updateArtigo.mutateAsync({ artigoId: artigoModal.artigoId, ...data });
    } else if (artigoModal.capituloId) {
      await createArtigo.mutateAsync({ capituloId: artigoModal.capituloId, ...data });
    }
    setArtigoModal({ open: false, capituloId: null, artigoId: null });
  };

  const handleSubmitCapitulo = async (data: any) => {
    if (chapterDialog.editId) {
      await updateCapitulo.mutateAsync({ capituloId: chapterDialog.editId, ...data });
    } else {
      await createCapitulo.mutateAsync(data);
    }
    setChapterDialog({ open: false, editId: null });
  };

  const handleAddFromCatalog = async (artigos: ArtigoFormData[]) => {
    if (catalogoModal.capituloId) {
      await addArtigosFromCatalog.mutateAsync({
        capituloId: catalogoModal.capituloId,
        artigos,
      });
    }
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
          {orcamento.capitulos!.map((capitulo) => (
            <CapituloAccordion
              key={capitulo.id}
              capitulo={capitulo}
              onEdit={() => setChapterDialog({ open: true, editId: capitulo.id })}
              onDelete={() => setDelCapitulo(capitulo.id)}
              onAddArtigo={() =>
                setArtigoModal({ open: true, capituloId: capitulo.id, artigoId: null })
              }
              onEditArtigo={(artigoId) =>
                setArtigoModal({ open: true, capituloId: capitulo.id, artigoId })
              }
              onDeleteArtigo={(artigoId) => setDelArtigo(artigoId)}
              onOpenCatalog={(capituloId) =>
                setCatalogoModal({ open: true, capituloId })
              }
              onUpdateCommercial={(capId, data) =>
                updateCapitulo.mutateAsync({ capituloId: capId, ...data })
              }
              onUpdateDiscount={(capId, descontoPct) =>
                updateCapitulo.mutateAsync({ capituloId: capId, desconto_pct: descontoPct })
              }
              isReadOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* Editar / Novo Artigo (mesmo form do Orçamento Base — inclui Decomposição de Custo) */}
      <Dialog
        open={artigoModal.open}
        onOpenChange={(o) => setArtigoModal((s) => ({ ...s, open: o }))}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{artigoModal.artigoId ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
            <DialogDescription>
              Preencha as informações do artigo de trabalho
            </DialogDescription>
          </DialogHeader>
          <ArtigoForm
            defaultValues={getArtigoDefaults()}
            onSubmit={handleSaveArtigo}
            onCancel={() => setArtigoModal({ open: false, capituloId: null, artigoId: null })}
            isLoading={createArtigo.isPending || updateArtigo.isPending}
            submitLabel={artigoModal.artigoId ? "Guardar" : "Adicionar"}
            orcamentoId={orcamento.id}
          />
        </DialogContent>
      </Dialog>

      {/* Catálogo */}
      <CatalogoModal
        open={catalogoModal.open}
        onClose={() => setCatalogoModal({ open: false, capituloId: null })}
        onAddArtigos={handleAddFromCatalog}
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
