import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';

export const TIPOS_OBRA = [
  { value: 'moradia_nova', label: 'Moradia Nova' },
  { value: 'remodelacao', label: 'Remodelação' },
  { value: 'ampliacao', label: 'Ampliação' },
  { value: 'instalacao_tecnica', label: 'Instalação Técnica' },
  { value: 'outro', label: 'Outro' },
] as const;

export type TipoObra = typeof TIPOS_OBRA[number]['value'];

export interface Step1Data {
  nome_cliente: string;
  email: string;
  telefone: string;
  tipo_obra: TipoObra;
}

interface EssencialStep1ClienteProps {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
  onNext: () => void;
  isLoading?: boolean;
}

export function EssencialStep1Cliente({ data, onChange, onNext, isLoading }: EssencialStep1ClienteProps) {
  const isValid = data.nome_cliente.trim() && data.email.trim() && data.telefone.trim() && data.tipo_obra;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="space-y-2">
        <Label htmlFor="nome_cliente">Nome do Cliente *</Label>
        <Input
          id="nome_cliente"
          placeholder="Ex: João Silva"
          value={data.nome_cliente}
          onChange={(e) => onChange({ ...data, nome_cliente: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          placeholder="cliente@email.com"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone *</Label>
        <Input
          id="telefone"
          type="tel"
          placeholder="+351 912 345 678"
          value={data.telefone}
          onChange={(e) => onChange({ ...data, telefone: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo de Obra *</Label>
        <Select
          value={data.tipo_obra}
          onValueChange={(v) => onChange({ ...data, tipo_obra: v as TipoObra })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de obra" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {TIPOS_OBRA.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={!isValid || isLoading}
        onClick={onNext}
      >
        Continuar
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
