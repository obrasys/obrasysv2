import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  LayoutTemplate,
  Plus,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { usePlanRoomTemplates, type RoomTemplate } from "@/hooks/usePlanRoomTemplates";
import { TIPO_COMPARTIMENTO_OPTIONS } from "@/types/plan-measurements";

interface Props {
  onApplyTemplate?: (template: RoomTemplate) => void;
}

export function PlanRoomTemplatesPanel({ onApplyTemplate }: Props) {
  const { templates, isLoading, createTemplate, deleteTemplate, seedDefaults } = usePlanRoomTemplates();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTipo, setNewTipo] = useState("habitacao");
  const [newPeDireito, setNewPeDireito] = useState("2.70");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createTemplate.mutate(
      { nome: newName.trim(), tipo_compartimento: newTipo, pe_direito_m: parseFloat(newPeDireito) || 2.70 },
      { onSuccess: () => { setShowCreate(false); setNewName(""); } }
    );
  };

  return (
    <>
      <Card>
        <CardContent className="pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-accent">
                <LayoutTemplate className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="text-sm font-semibold">Templates</span>
              {templates.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {templates.length}
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              {templates.length === 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
                  {seedDefaults.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                  Padrão
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCreate(true)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}

          {!isLoading && templates.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              Sem templates. Clique em "Padrão" para criar os predefinidos ou crie um personalizado.
            </p>
          )}

          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted transition-colors group"
              onClick={() => onApplyTemplate?.(t)}
            >
              <div>
                <p className="text-xs font-medium">{t.nome}</p>
                <p className="text-[10px] text-muted-foreground">
                  {TIPO_COMPARTIMENTO_OPTIONS.find((o) => o.value === t.tipo_compartimento)?.label || t.tipo_compartimento}
                  {" · "}Pé-direito {t.pe_direito_m}m
                  {t.artigos.length > 0 && ` · ${t.artigos.length} artigos`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={(e) => { e.stopPropagation(); deleteTemplate.mutate(t.id); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Novo Template de Compartimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Cozinha Tipo" />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={newTipo} onValueChange={setNewTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_COMPARTIMENTO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Pé-direito (m)</Label>
              <Input type="number" step="0.01" value={newPeDireito} onChange={(e) => setNewPeDireito(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || createTemplate.isPending}>
              {createTemplate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
