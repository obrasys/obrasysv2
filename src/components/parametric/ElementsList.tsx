import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  MoreVertical,
  Pencil,
  Trash2,
  Ruler,
  Layers,
  Box,
} from 'lucide-react';
import type { ConstructiveElement, WallParameters, FloorParameters } from '@/types/parametric';
import { ELEMENT_TYPES, CONSTRUCTION_METHODS, FUNCTIONAL_TYPES } from '@/types/parametric';

interface ElementsListProps {
  elements: ConstructiveElement[];
  selectedElementId: string | null;
  onSelectElement: (element: ConstructiveElement) => void;
  onCreateElement: () => void;
  onEditElement: (element: ConstructiveElement) => void;
  onDeleteElement: (id: string) => void;
  isLoading?: boolean;
}

export function ElementsList({
  elements,
  selectedElementId,
  onSelectElement,
  onCreateElement,
  onEditElement,
  onDeleteElement,
  isLoading,
}: ElementsListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'wall':
        return <Layers className="h-4 w-4" />;
      case 'floor':
      case 'slab':
        return <Box className="h-4 w-4" />;
      default:
        return <Ruler className="h-4 w-4" />;
    }
  };

  const formatDimensions = (element: ConstructiveElement) => {
    const params = element.parameters as WallParameters | FloorParameters;
    if (element.element_type === 'wall') {
      const wallParams = params as WallParameters;
      return `${wallParams.length_m}m × ${wallParams.height_m}m × ${wallParams.thickness_cm}cm`;
    }
    const floorParams = params as FloorParameters;
    return `${floorParams.length_m}m × ${floorParams.width_m}m × ${floorParams.thickness_cm}cm`;
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      onDeleteElement(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Elementos Construtivos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg">Elementos Construtivos</CardTitle>
          <Button size="sm" onClick={onCreateElement}>
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </Button>
        </CardHeader>
        <CardContent>
          {elements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum elemento construtivo</p>
              <p className="text-sm">Crie elementos para gerar medições paramétricas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {elements.map((element) => (
                <div
                  key={element.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedElementId === element.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onSelectElement(element)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-md ${
                        selectedElementId === element.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {getElementIcon(element.element_type)}
                    </div>
                    <div>
                      <div className="font-medium">{element.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{ELEMENT_TYPES[element.element_type]}</span>
                        <span>•</span>
                        <span>{formatDimensions(element)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {CONSTRUCTION_METHODS[element.construction_method].label}
                    </Badge>
                    <Badge
                      variant={element.functional_type === 'structural_wall' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {FUNCTIONAL_TYPES[element.functional_type].split(' ')[0]}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditElement(element);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(element.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá eliminar o elemento e todas as suas aberturas. Os artigos linkados
              passarão a ter quantidade manual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
