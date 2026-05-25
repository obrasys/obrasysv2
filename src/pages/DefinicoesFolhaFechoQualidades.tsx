import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, ListChecks, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQualitySpecsCatalog, type QualitySpec } from "@/hooks/useQualitySpecsCatalog";
import { toast } from "sonner";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "")
    .slice(0, 64);
}

export default function DefinicoesFolhaFechoQualidades() {
  const navigate = useNavigate();
  const { list, upsert, remove } = useQualitySpecsCatalog();
  const [draft, setDraft] = useState({ label: "", spec_key: "" });

  const handleAdd = () => {
    const label = draft.label.trim();
    if (!label) {
      toast.error("Indica o nome da rúbrica");
      return;
    }
    const key = (draft.spec_key.trim() || slugify(label));
    const ordem = (list.data?.length ?? 0) + 1;
    upsert.mutate(
      { label, spec_key: key, ordem, ativo: true },
      { onSuccess: () => setDraft({ label: "", spec_key: "" }) },
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" /> Qualidades da Folha de Fecho
            </h1>
            <p className="text-sm text-muted-foreground">
              Catálogo configurável de rúbricas técnicas (fundações, AVAC, acabamentos, etc.) usadas na Folha de Fecho.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adicionar Rúbrica</CardTitle>
            <CardDescription>A chave técnica é gerada automaticamente se deixada em branco.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome / Etiqueta</label>
              <Input
                value={draft.label}
                placeholder="Ex.: Cobertura e Impermeabilizações"
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Chave (opcional)</label>
              <Input
                value={draft.spec_key}
                placeholder="auto-gerada"
                onChange={(e) => setDraft((d) => ({ ...d, spec_key: e.target.value }))}
              />
            </div>
            <Button onClick={handleAdd} disabled={upsert.isPending} className="gap-2">
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Rúbricas do Catálogo</CardTitle>
              <CardDescription>
                {list.data?.length ?? 0} rúbricas · Drag-free, edita inline e grava.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                A carregar catálogo…
              </div>
            ) : (list.data?.length ?? 0) === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                Catálogo vazio. As 34 rúbricas padrão serão semeadas no primeiro acesso à Folha de Fecho.
              </div>
            ) : (
              <div className="space-y-2">
                {list.data!.map((spec) => (
                  <SpecRow key={spec.id} spec={spec} onSave={(p) => upsert.mutate(p)} onRemove={() => remove.mutate(spec.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function SpecRow({
  spec,
  onSave,
  onRemove,
}: {
  spec: QualitySpec;
  onSave: (p: { id: string; spec_key: string; label: string; ordem: number; ativo: boolean }) => void;
  onRemove: () => void;
}) {
  const [label, setLabel] = useState(spec.label);
  const [key, setKey] = useState(spec.spec_key);
  const [ordem, setOrdem] = useState(spec.ordem);
  const [ativo, setAtivo] = useState(spec.ativo);
  const dirty =
    label !== spec.label || key !== spec.spec_key || ordem !== spec.ordem || ativo !== spec.ativo;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[60px_1fr_200px_auto_auto_auto] gap-2 items-center border rounded-lg p-2 bg-background">
      <Input
        type="number"
        value={ordem}
        onChange={(e) => setOrdem(parseInt(e.target.value || "0", 10))}
        className="h-9 text-center"
      />
      <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-9" />
      <Input value={key} onChange={(e) => setKey(e.target.value)} className="h-9 font-mono text-xs" />
      <div className="flex items-center gap-2">
        <Switch checked={ativo} onCheckedChange={setAtivo} />
        <Badge variant={ativo ? "default" : "secondary"} className="text-[10px]">
          {ativo ? "Activa" : "Inactiva"}
        </Badge>
      </div>
      <Button
        size="sm"
        variant={dirty ? "default" : "outline"}
        disabled={!dirty}
        onClick={() => onSave({ id: spec.id, spec_key: key, label, ordem, ativo })}
        className="gap-2"
      >
        <Save className="h-3.5 w-3.5" />
        Gravar
      </Button>
      <Button size="sm" variant="ghost" onClick={onRemove} className="text-rose-600 hover:text-rose-700">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
