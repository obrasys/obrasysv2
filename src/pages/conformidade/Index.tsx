import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import {
  Plus,
  Search,
  BookOpen,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { useConformidade } from '@/hooks/useConformidade';
import { useObras } from '@/hooks/useObras';
import {
  ChecklistCard,
  DocumentoCard,
  LivroObraCard,
  AprovacaoCard,
  LivroObraForm,
  DocumentoForm,
  ChecklistForm,
} from '@/components/conformidade';
import type {
  LivroObra,
  Documento,
  ChecklistConformidade,
  LivroObraFormData,
  DocumentoFormData,
  ChecklistFormData,
  ChecklistItem,
} from '@/types/conformidade';

export default function ConformidadeIndex() {
  const [activeTab, setActiveTab] = useState('livros');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [livroObraModal, setLivroObraModal] = useState(false);
  const [documentoModal, setDocumentoModal] = useState(false);
  const [checklistModal, setChecklistModal] = useState(false);
  
  // Edit states
  const [editingLivroObra, setEditingLivroObra] = useState<LivroObra | null>(null);
  const [editingDocumento, setEditingDocumento] = useState<Documento | null>(null);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistConformidade | null>(null);
  
  // Delete states
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'livro' | 'documento' | 'checklist' | null>(null);

  const { obras } = useObras();
  const {
    livrosObra,
    documentos,
    checklists,
    aprovacoes,
    stats,
    loading,
    createLivroObra,
    updateLivroObra,
    submitLivroObra,
    deleteLivroObra,
    createDocumento,
    updateDocumento,
    deleteDocumento,
    createChecklist,
    updateChecklist,
    deleteChecklist,
    updateAprovacaoStatus,
  } = useConformidade();

  // Filter data based on search term
  const filteredLivrosObra = livrosObra.filter(
    (l) =>
      l.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.obra?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDocumentos = documentos.filter(
    (d) =>
      d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.obra?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredChecklists = checklists.filter(
    (c) =>
      c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.obra?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingAprovacoes = aprovacoes.filter((a) => a.status === 'pendente');

  // Handlers
  const handleCreateLivroObra = (data: LivroObraFormData) => {
    if (editingLivroObra) {
      updateLivroObra.mutate({ ...data, id: editingLivroObra.id }, {
        onSuccess: () => {
          setLivroObraModal(false);
          setEditingLivroObra(null);
        },
      });
    } else {
      createLivroObra.mutate(data, {
        onSuccess: () => setLivroObraModal(false),
      });
    }
  };

  const handleCreateDocumento = (data: DocumentoFormData) => {
    if (editingDocumento) {
      updateDocumento.mutate({ ...data, id: editingDocumento.id }, {
        onSuccess: () => {
          setDocumentoModal(false);
          setEditingDocumento(null);
        },
      });
    } else {
      createDocumento.mutate(data, {
        onSuccess: () => setDocumentoModal(false),
      });
    }
  };

  const handleCreateChecklist = (data: ChecklistFormData) => {
    if (editingChecklist) {
      updateChecklist.mutate({ ...data, id: editingChecklist.id }, {
        onSuccess: () => {
          setChecklistModal(false);
          setEditingChecklist(null);
        },
      });
    } else {
      createChecklist.mutate(data, {
        onSuccess: () => setChecklistModal(false),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId || !deleteType) return;
    
    if (deleteType === 'livro') {
      deleteLivroObra.mutate(deleteId);
    } else if (deleteType === 'documento') {
      deleteDocumento.mutate(deleteId);
    } else if (deleteType === 'checklist') {
      deleteChecklist.mutate(deleteId);
    }
    
    setDeleteId(null);
    setDeleteType(null);
  };

  const handleChecklistItemsUpdate = (id: string, itens: ChecklistItem[]) => {
    const allCompleted = itens.every((i) => i.concluido);
    const anyCompleted = itens.some((i) => i.concluido);
    const status = allCompleted ? 'concluido' : anyCompleted ? 'em_progresso' : 'pendente';
    
    updateChecklist.mutate({ id, itens, status });
  };

  const obrasOptions = (obras || []).map((o) => ({ id: o.id, nome: o.nome }));

  if (loading) {
    return (
      <AppLayout title="Conformidade" subtitle="Gestão de conformidade e documentação">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Conformidade e Livro de Obra"
      subtitle="Gestão de documentos, checklists e aprovações"
      actions={
        <div className="flex gap-2">
          {activeTab === 'livros' && (
            <Button onClick={() => setLivroObraModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Livro
            </Button>
          )}
          {activeTab === 'documentos' && (
            <Button onClick={() => setDocumentoModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Documento
            </Button>
          )}
          {activeTab === 'checklists' && (
            <Button onClick={() => setChecklistModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Checklist
            </Button>
          )}
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Livros de Obra</p>
                  <p className="text-2xl font-bold">{stats.totalLivrosObra}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.livrosSubmetidos} submetidos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documentos</p>
                  <p className="text-2xl font-bold">{stats.totalDocumentos}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.documentosAprovados} aprovados
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Checklists</p>
                  <p className="text-2xl font-bold">{stats.totalChecklists}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.checklistsConcluidas} concluídas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aprovações Pendentes</p>
                  <p className="text-2xl font-bold">{stats.aprovacoesPendentes}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalAprovacoes} total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="livros" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Livros de Obra
            </TabsTrigger>
            <TabsTrigger value="documentos" className="gap-2">
              <FileText className="w-4 h-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="checklists" className="gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Checklists
            </TabsTrigger>
            <TabsTrigger value="aprovacoes" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Aprovações
              {pendingAprovacoes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                  {pendingAprovacoes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Livros de Obra */}
          <TabsContent value="livros" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLivrosObra.map((livro) => (
                <LivroObraCard
                  key={livro.id}
                  livroObra={livro}
                  onEdit={(l) => {
                    setEditingLivroObra(l);
                    setLivroObraModal(true);
                  }}
                  onDelete={(id) => {
                    setDeleteId(id);
                    setDeleteType('livro');
                  }}
                  onSubmit={(id) => submitLivroObra.mutate(id)}
                  onView={() => {}}
                />
              ))}
              {filteredLivrosObra.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Nenhum livro de obra encontrado
                </div>
              )}
            </div>
          </TabsContent>

          {/* Documentos */}
          <TabsContent value="documentos" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocumentos.map((doc) => (
                <DocumentoCard
                  key={doc.id}
                  documento={doc}
                  onEdit={(d) => {
                    setEditingDocumento(d);
                    setDocumentoModal(true);
                  }}
                  onDelete={(id) => {
                    setDeleteId(id);
                    setDeleteType('documento');
                  }}
                  onApprove={(id, aprovado) =>
                    updateDocumento.mutate({ id, aprovado } as any)
                  }
                />
              ))}
              {filteredDocumentos.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Nenhum documento encontrado
                </div>
              )}
            </div>
          </TabsContent>

          {/* Checklists */}
          <TabsContent value="checklists" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChecklists.map((checklist) => (
                <ChecklistCard
                  key={checklist.id}
                  checklist={checklist}
                  onEdit={(c) => {
                    setEditingChecklist(c);
                    setChecklistModal(true);
                  }}
                  onDelete={(id) => {
                    setDeleteId(id);
                    setDeleteType('checklist');
                  }}
                  onUpdateItems={handleChecklistItemsUpdate}
                />
              ))}
              {filteredChecklists.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Nenhuma checklist encontrada
                </div>
              )}
            </div>
          </TabsContent>

          {/* Aprovações */}
          <TabsContent value="aprovacoes" className="mt-6">
            <div className="space-y-4">
              {aprovacoes.map((aprovacao) => (
                <AprovacaoCard
                  key={aprovacao.id}
                  aprovacao={aprovacao}
                  onApprove={(id) =>
                    updateAprovacaoStatus.mutate({ id, status: 'aprovado' })
                  }
                  onReject={(id) =>
                    updateAprovacaoStatus.mutate({ id, status: 'rejeitado' })
                  }
                />
              ))}
              {aprovacoes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma aprovação encontrada
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Livro de Obra Modal */}
      <Dialog
        open={livroObraModal}
        onOpenChange={(open) => {
          setLivroObraModal(open);
          if (!open) setEditingLivroObra(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingLivroObra ? 'Editar Livro de Obra' : 'Novo Livro de Obra'}
            </DialogTitle>
          </DialogHeader>
          <LivroObraForm
            obras={obrasOptions}
            livroObra={editingLivroObra}
            onSubmit={handleCreateLivroObra}
            onCancel={() => {
              setLivroObraModal(false);
              setEditingLivroObra(null);
            }}
            isLoading={createLivroObra.isPending || updateLivroObra.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Documento Modal */}
      <Dialog
        open={documentoModal}
        onOpenChange={(open) => {
          setDocumentoModal(open);
          if (!open) setEditingDocumento(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDocumento ? 'Editar Documento' : 'Novo Documento'}
            </DialogTitle>
          </DialogHeader>
          <DocumentoForm
            obras={obrasOptions}
            documento={editingDocumento}
            onSubmit={handleCreateDocumento}
            onCancel={() => {
              setDocumentoModal(false);
              setEditingDocumento(null);
            }}
            isLoading={createDocumento.isPending || updateDocumento.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Checklist Modal */}
      <Dialog
        open={checklistModal}
        onOpenChange={(open) => {
          setChecklistModal(open);
          if (!open) setEditingChecklist(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingChecklist ? 'Editar Checklist' : 'Nova Checklist'}
            </DialogTitle>
          </DialogHeader>
          <ChecklistForm
            obras={obrasOptions}
            checklist={editingChecklist}
            onSubmit={handleCreateChecklist}
            onCancel={() => {
              setChecklistModal(false);
              setEditingChecklist(null);
            }}
            isLoading={createChecklist.isPending || updateChecklist.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar este item? Esta ação não pode ser
              revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
