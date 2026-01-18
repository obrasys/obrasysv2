import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Package, Users, MoreHorizontal } from 'lucide-react';
import { useCategorias } from '@/hooks/useCategorias';
import { CategoriaForm } from './CategoriaForm';
import { ORIGEM_CONTA_OPTIONS } from '@/types/financeiro';
import type { CategoriaFinanceira, CategoriaFormData } from '@/types/categorias';
import type { OrigemConta } from '@/types/financeiro';

interface CategoriasManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ORIGEM_ICONS: Record<OrigemConta, React.ReactNode> = {
  mao_de_obra: <Users className="h-4 w-4" />,
  material: <Package className="h-4 w-4" />,
  outros: <MoreHorizontal className="h-4 w-4" />,
};

export function CategoriasManager({ open, onOpenChange }: CategoriasManagerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaFinanceira | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { 
    categoriasPorOrigem, 
    createCategoria, 
    updateCategoria, 
    deleteCategoria 
  } = useCategorias();

  const handleSubmit = (data: CategoriaFormData) => {
    if (editingCategoria) {
      updateCategoria.mutate({ id: editingCategoria.id, data });
    } else {
      createCategoria.mutate(data);
    }
    setEditingCategoria(null);
  };

  const handleEdit = (categoria: CategoriaFinanceira) => {
    setEditingCategoria(categoria);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteCategoria.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const renderCategoriasList = (origem: OrigemConta) => {
    const categorias = categoriasPorOrigem(origem);
    
    if (categorias.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhuma subcategoria criada para {ORIGEM_CONTA_OPTIONS.find(o => o.value === origem)?.label}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {categorias.map((categoria) => (
          <div
            key={categoria.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: categoria.cor }}
              />
              <span className="font-medium">{categoria.nome}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(categoria)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(categoria.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gestão de Categorias</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="material" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              {ORIGEM_CONTA_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value} className="flex items-center gap-2">
                  {ORIGEM_ICONS[opt.value as OrigemConta]}
                  <span className="hidden sm:inline">{opt.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {ORIGEM_CONTA_OPTIONS.map((opt) => (
              <TabsContent key={opt.value} value={opt.value} className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Subcategorias de {opt.label}</h4>
                    <p className="text-sm text-muted-foreground">
                      {categoriasPorOrigem(opt.value as OrigemConta).length} subcategorias
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCategoria(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {renderCategoriasList(opt.value as OrigemConta)}
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>

      <CategoriaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categoria={editingCategoria}
        onSubmit={handleSubmit}
        isLoading={createCategoria.isPending || updateCategoria.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta categoria? 
              Contas financeiras associadas perderão a referência de categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
