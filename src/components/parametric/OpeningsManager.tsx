import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Plus, DoorOpen, Trash2 } from 'lucide-react';
import type { ElementOpening, OpeningFormData, OpeningType } from '@/types/parametric';
import { OPENING_TYPES } from '@/types/parametric';

interface OpeningsManagerProps {
  openings: ElementOpening[];
  isLoading?: boolean;
  onCreateOpening: (data: OpeningFormData) => void;
  onDeleteOpening: (id: string) => void;
  disabled?: boolean;
}

export function OpeningsManager({
  openings,
  isLoading,
  onCreateOpening,
  onDeleteOpening,
  disabled,
}: OpeningsManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OpeningFormData>({
    name: '',
    opening_type: 'door',
    width_m: 0.9,
    height_m: 2.1,
  });

  const handleSubmit = () => {
    onCreateOpening(formData);
    setIsFormOpen(false);
    setFormData({
      name: '',
      opening_type: 'door',
      width_m: 0.9,
      height_m: 2.1,
    });
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      onDeleteOpening(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const calculateArea = (width: number, height: number) => {
    return (width * height).toFixed(2);
  };

  const totalOpeningsArea = openings.reduce(
    (sum, o) => sum + o.width_m * o.height_m,
    0
  );

  // Set defaults based on opening type
  const handleTypeChange = (type: OpeningType) => {
    const defaults: Record<OpeningType, { width: number; height: number }> = {
      door: { width: 0.9, height: 2.1 },
      window: { width: 1.2, height: 1.4 },
      technical: { width: 0.6, height: 0.6 },
    };

    setFormData({
      ...formData,
      opening_type: type,
      width_m: defaults[type].width,
      height_m: defaults[type].height,
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            Aberturas
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFormOpen(true)}
            disabled={disabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {disabled ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Selecione um elemento para gerir aberturas
            </p>
          ) : openings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma abertura definida
            </p>
          ) : (
            <div className="space-y-2">
              {openings.map((opening) => (
                <div
                  key={opening.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <DoorOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {opening.name || OPENING_TYPES[opening.opening_type]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {opening.width_m}m × {opening.height_m}m ={' '}
                        {calculateArea(opening.width_m, opening.height_m)} m²
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteConfirmId(opening.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {openings.length > 0 && (
                <div className="pt-2 border-t mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Área total de aberturas:</span>
                    <span className="font-medium">{totalOpeningsArea.toFixed(2)} m²</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Abertura</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.opening_type}
                onValueChange={(v) => handleTypeChange(v as OpeningType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPENING_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome (opcional)</Label>
              <Input
                placeholder="Ex: Porta Principal"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Largura (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.width_m}
                  onChange={(e) =>
                    setFormData({ ...formData, width_m: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Altura (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.height_m}
                  onChange={(e) =>
                    setFormData({ ...formData, height_m: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Área:</span>
                <span className="font-medium">
                  {calculateArea(formData.width_m, formData.height_m)} m²
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar abertura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá eliminar a abertura e recalcular os parâmetros do elemento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
