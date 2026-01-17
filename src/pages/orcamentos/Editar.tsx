import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamento, useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoStatus } from '@/components/orcamentos/OrcamentoStatus';
import { CapituloAccordion } from '@/components/orcamentos/CapituloAccordion';
import { ArtigoForm } from '@/components/orcamentos/ArtigoForm';
import { CatalogoModal } from '@/components/orcamentos/CatalogoModal';
import { ResumoTotal } from '@/components/orcamentos/ResumoTotal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { CapituloFormData, ArtigoFormData } from '@/types/orcamentos';
import {
  Plus,
  Send,
  FileText,
  Loader2,
  Sparkles,
  Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function EditarOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { updateStatus } = useOrcamentos();
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
  } = useOrcamento(id);

  // Modal states
  const [showCapituloModal, setShowCapituloModal] = useState(false);
  const [showArtigoModal, setShowArtigoModal] = useState(false);
  const [showCatalogoModal, setShowCatalogoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [deleteCapituloId, setDeleteCapituloId] = useState<string | null>(null);
  const [deleteArtigoId, setDeleteArtigoId] = useState<string | null>(null);

  // Form states
  const [selectedCapituloId, setSelectedCapituloId] = useState<string | null>(null);
  const [editingArtigo, setEditingArtigo] = useState<{ id: string; capituloId: string } | null>(null);
  const [capituloForm, setCapituloForm] = useState<CapituloFormData>({
    numero: 1,
    titulo: '',
    descricao: '',
  });
  const [editingCapitulo, setEditingCapitulo] = useState<string | null>(null);

  if (isLoading || !orcamento) {
    return (
      <AppLayout title="Carregar Orçamento...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const isReadOnly = orcamento.status === 'adjudicado';

  const handleAddCapitulo = () => {
    const nextNumero = (orcamento.capitulos?.length || 0) + 1;
    setCapituloForm({ numero: nextNumero, titulo: '', descricao: '' });
    setEditingCapitulo(null);
    setShowCapituloModal(true);
  };

  const handleEditCapitulo = (capituloId: string) => {
    const cap = orcamento.capitulos?.find((c) => c.id === capituloId);
    if (cap) {
      setCapituloForm({ numero: cap.numero, titulo: cap.titulo, descricao: cap.descricao || '' });
      setEditingCapitulo(capituloId);
      setShowCapituloModal(true);
    }
  };

  const handleSaveCapitulo = async () => {
    if (!capituloForm.titulo.trim()) {
      toast({ title: 'Erro', description: 'Título é obrigatório', variant: 'destructive' });
      return;
    }

    if (editingCapitulo) {
      await updateCapitulo.mutateAsync({ capituloId: editingCapitulo, ...capituloForm });
    } else {
      await createCapitulo.mutateAsync(capituloForm);
    }
    setShowCapituloModal(false);
  };

  const handleDeleteCapitulo = async () => {
    if (deleteCapituloId) {
      await deleteCapitulo.mutateAsync(deleteCapituloId);
      setDeleteCapituloId(null);
    }
  };

  const handleAddArtigo = (capituloId: string) => {
    setSelectedCapituloId(capituloId);
    setEditingArtigo(null);
    setShowArtigoModal(true);
  };

  const handleEditArtigo = (artigoId: string, capituloId: string) => {
    setSelectedCapituloId(capituloId);
    setEditingArtigo({ id: artigoId, capituloId });
    setShowArtigoModal(true);
  };

  const handleSaveArtigo = async (data: ArtigoFormData) => {
    if (editingArtigo) {
      await updateArtigo.mutateAsync({ artigoId: editingArtigo.id, ...data });
    } else if (selectedCapituloId) {
      await createArtigo.mutateAsync({ capituloId: selectedCapituloId, ...data });
    }
    setShowArtigoModal(false);
  };

  const handleDeleteArtigo = async () => {
    if (deleteArtigoId) {
      await deleteArtigo.mutateAsync(deleteArtigoId);
      setDeleteArtigoId(null);
    }
  };

  const handleOpenCatalog = (capituloId: string) => {
    setSelectedCapituloId(capituloId);
    setShowCatalogoModal(true);
  };

  const handleAddFromCatalog = async (artigos: ArtigoFormData[]) => {
    if (selectedCapituloId) {
      await addArtigosFromCatalog.mutateAsync({ capituloId: selectedCapituloId, artigos });
    }
  };

  const handleFinalizar = async () => {
    await updateStatus.mutateAsync({
      id: orcamento.id,
      status: 'enviado',
      data_envio: new Date().toISOString(),
    });
    toast({ title: 'Sucesso', description: 'Orçamento enviado ao cliente' });
  };

  const getArtigoDefaults = (): Partial<ArtigoFormData> | undefined => {
    if (editingArtigo) {
      const cap = orcamento.capitulos?.find((c) => c.id === editingArtigo.capituloId);
      const art = cap?.artigos?.find((a) => a.id === editingArtigo.id);
      if (art) {
        return {
          codigo: art.codigo || '',
          descricao: art.descricao,
          unidade: art.unidade,
          quantidade: art.quantidade,
          preco_unitario: art.preco_unitario,
        };
      }
    }
    return undefined;
  };

  // Header actions
  const headerActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowSettingsModal(true)}>
        <Settings className="mr-2 h-4 w-4" />
        Configurações
      </Button>
      <Button variant="outline" size="sm">
        <Sparkles className="mr-2 h-4 w-4" />
        Validar com IA
      </Button>
      <Button variant="outline" size="sm">
        <FileText className="mr-2 h-4 w-4" />
        PDF
      </Button>
      {orcamento.status === 'rascunho' && (
        <Button onClick={handleFinalizar}>
          <Send className="mr-2 h-4 w-4" />
          Finalizar
        </Button>
      )}
    </>
  );

  return (
    <AppLayout
      title={orcamento.titulo}
      subtitle={orcamento.obra ? `Obra: ${orcamento.obra.nome}` : undefined}
      actions={headerActions}
    >
      <div className="p-6">
        {/* Status badge */}
        <div className="mb-4">
          <OrcamentoStatus status={orcamento.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Capítulos */}
            {orcamento.capitulos && orcamento.capitulos.length > 0 ? (
              orcamento.capitulos.map((capitulo) => (
                <CapituloAccordion
                  key={capitulo.id}
                  capitulo={capitulo}
                  onEdit={() => handleEditCapitulo(capitulo.id)}
                  onDelete={() => setDeleteCapituloId(capitulo.id)}
                  onAddArtigo={() => handleAddArtigo(capitulo.id)}
                  onEditArtigo={(artigoId) => handleEditArtigo(artigoId, capitulo.id)}
                  onDeleteArtigo={setDeleteArtigoId}
                  onOpenCatalog={handleOpenCatalog}
                  isReadOnly={isReadOnly}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Nenhum capítulo criado. Adicione o primeiro capítulo para começar.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Add Chapter Button */}
            {!isReadOnly && (
              <Button variant="outline" className="w-full" onClick={handleAddCapitulo}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Capítulo
              </Button>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <ResumoTotal orcamento={orcamento} />
          </div>
        </div>
      </div>

      {/* Capítulo Modal */}
      <Dialog open={showCapituloModal} onOpenChange={setShowCapituloModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCapitulo ? 'Editar Capítulo' : 'Novo Capítulo'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do capítulo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Número</Label>
                <Input
                  type="number"
                  min={1}
                  value={capituloForm.numero}
                  onChange={(e) =>
                    setCapituloForm({ ...capituloForm, numero: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="col-span-3">
                <Label>Título</Label>
                <Input
                  value={capituloForm.titulo}
                  onChange={(e) => setCapituloForm({ ...capituloForm, titulo: e.target.value })}
                  placeholder="Ex: Alvenarias"
                />
              </div>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={capituloForm.descricao}
                onChange={(e) => setCapituloForm({ ...capituloForm, descricao: e.target.value })}
                placeholder="Descrição do capítulo..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCapituloModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCapitulo}
                disabled={createCapitulo.isPending || updateCapitulo.isPending}
              >
                {(createCapitulo.isPending || updateCapitulo.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingCapitulo ? 'Guardar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Artigo Modal */}
      <Dialog open={showArtigoModal} onOpenChange={setShowArtigoModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingArtigo ? 'Editar Artigo' : 'Novo Artigo'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do artigo de trabalho
            </DialogDescription>
          </DialogHeader>
          <ArtigoForm
            defaultValues={getArtigoDefaults()}
            onSubmit={handleSaveArtigo}
            onCancel={() => setShowArtigoModal(false)}
            isLoading={createArtigo.isPending || updateArtigo.isPending}
            submitLabel={editingArtigo ? 'Guardar' : 'Adicionar'}
          />
        </DialogContent>
      </Dialog>

      {/* Catálogo Modal */}
      <CatalogoModal
        open={showCatalogoModal}
        onClose={() => setShowCatalogoModal(false)}
        onAddArtigos={handleAddFromCatalog}
      />

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações do Orçamento</DialogTitle>
            <DialogDescription>
              Ajuste a margem de lucro e custos indiretos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>Margem de Lucro: {orcamento.margem_lucro}%</Label>
              <Slider
                min={0}
                max={50}
                step={1}
                value={[orcamento.margem_lucro]}
                className="mt-2"
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-4">
              <Label>Custos Indiretos</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Estaleiro (€)</Label>
                  <Input
                    type="number"
                    value={orcamento.custos_indiretos?.estaleiro || 0}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Seguros (€)</Label>
                  <Input
                    type="number"
                    value={orcamento.custos_indiretos?.seguros || 0}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Licenciamento (€)</Label>
                  <Input
                    type="number"
                    value={orcamento.custos_indiretos?.licenciamento || 0}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Capítulo Dialog */}
      <AlertDialog open={!!deleteCapituloId} onOpenChange={() => setDeleteCapituloId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Capítulo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza? Todos os artigos deste capítulo serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCapitulo}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Artigo Dialog */}
      <AlertDialog open={!!deleteArtigoId} onOpenChange={() => setDeleteArtigoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Artigo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este artigo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArtigo}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
