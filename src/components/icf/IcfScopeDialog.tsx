import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Layers,
  Paintbrush,
  Wrench,
  PanelTop,
  Hammer,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import type {
  IcfArchitectureScope,
  IcfScopeArea,
} from '@/lib/icf-architecture-engine';

export type IcfScopeMode = 'estrutura' | 'arquitetura' | 'completo';

export interface IcfScopeSelection {
  mode: IcfScopeMode;
  scope: IcfArchitectureScope;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (selection: IcfScopeSelection) => void;
  /** Indica se a obra tem planta calibrada (informativo) */
  hasPlantaAssociada?: boolean;
}

const SPECIALTIES: {
  id: IcfScopeArea;
  label: string;
  description: string;
  icon: typeof Paintbrush;
}[] = [
  {
    id: 'pinturas',
    label: 'Pinturas',
    description: 'Interior, exterior, primário e demãos',
    icon: Paintbrush,
  },
  {
    id: 'pavimentos',
    label: 'Pavimentos e Revestimentos',
    description: 'Cerâmico, flutuante, rodapés, betonilha',
    icon: PanelTop,
  },
  {
    id: 'tetos_isolamentos',
    label: 'Tetos Falsos e Isolamentos',
    description: 'Pladur, lã mineral, pé-direito útil',
    icon: Layers,
  },
  {
    id: 'instalacoes',
    label: 'Instalações Técnicas',
    description: 'Elétrica, águas, esgotos e AVAC',
    icon: Wrench,
  },
];

export function IcfScopeDialog({
  open,
  onOpenChange,
  onConfirm,
  hasPlantaAssociada,
}: Props) {
  const [mode, setMode] = useState<IcfScopeMode>('estrutura');
  const [especialidades, setEspecialidades] = useState<IcfScopeArea[]>([]);

  useEffect(() => {
    if (!open) return;
    setMode('estrutura');
    setEspecialidades([]);
  }, [open]);

  const toggleEspecialidade = (id: IcfScopeArea) => {
    setEspecialidades((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSelectMode = (m: IcfScopeMode) => {
    setMode(m);
    if (m === 'estrutura') setEspecialidades([]);
    else if (m === 'completo') setEspecialidades(['pinturas', 'pavimentos', 'tetos_isolamentos', 'instalacoes']);
  };

  const handleConfirm = () => {
    onConfirm({
      mode,
      scope: {
        arquitetura: mode !== 'estrutura',
        especialidades: mode === 'estrutura' ? [] : especialidades,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Âmbito do Orçamento
          </DialogTitle>
          <DialogDescription>
            Escolha o que pretende incluir no orçamento gerado a partir do ICF.
            {hasPlantaAssociada ? (
              <Badge variant="secondary" className="ml-2 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Planta detectada
              </Badge>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ScopeCard
              active={mode === 'estrutura'}
              onClick={() => handleSelectMode('estrutura')}
              icon={Building2}
              title="Só Estrutura"
              subtitle="ICF - sapatas, paredes, lajes"
              tag="Rápido"
            />
            <ScopeCard
              active={mode === 'arquitetura'}
              onClick={() => handleSelectMode('arquitetura')}
              icon={Hammer}
              title="Estrutura + Arquitetura"
              subtitle="Acabamentos selecionados abaixo"
              tag="Recomendado"
            />
            <ScopeCard
              active={mode === 'completo'}
              onClick={() => handleSelectMode('completo')}
              icon={Sparkles}
              title="Obra Completa"
              subtitle="Estrutura + todas as especialidades"
              tag="Chave-na-mão"
            />
          </div>

          {/* Specialties picker */}
          {mode !== 'estrutura' && (
            <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Especialidades a incluir</h4>
                <span className="text-xs text-muted-foreground">
                  {especialidades.length} selecionadas
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SPECIALTIES.map((s) => {
                  const Icon = s.icon;
                  const checked = especialidades.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                        checked
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleEspecialidade(s.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-sm">{s.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                {hasPlantaAssociada
                  ? 'A Axia vai usar áreas e perímetros da planta calibrada quando possível, com fallback paramétrico para os restantes valores.'
                  : 'Sem planta associada: as quantidades serão estimadas paramétricamente a partir do ICF. Pode editar tudo no orçamento.'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mode !== 'estrutura' && especialidades.length === 0}
            className="gap-2"
          >
            Continuar <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScopeCard({
  active,
  onClick,
  icon: Icon,
  title,
  subtitle,
  tag,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Building2;
  title: string;
  subtitle: string;
  tag: string;
}) {
  return (
    <Card
      onClick={onClick}
      className={`p-4 cursor-pointer transition rounded-xl ${
        active
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
          : 'hover:border-primary/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            active ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <Badge variant={active ? 'default' : 'secondary'} className="text-[10px]">
          {tag}
        </Badge>
      </div>
      <h4 className="font-semibold text-sm mt-3">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </Card>
  );
}
