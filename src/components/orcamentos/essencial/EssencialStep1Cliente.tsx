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
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function EssencialStep1Cliente({ data, onChange, onNext, isLoading }: EssencialStep1ClienteProps) {
  const isValid = data.nome_cliente.trim() && data.email.trim() && data.telefone.trim() && data.tipo_obra;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-lg mx-auto"
    >
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-8 pb-8 px-6 md:px-8 space-y-6">
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center gap-3 pb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Dados do Cliente</h2>
              <p className="text-xs text-muted-foreground">Preencha as informações básicas</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label htmlFor="nome_cliente" className="text-sm font-medium">
              Nome do Cliente
            </Label>
            <Input
              id="nome_cliente"
              placeholder="Ex: João Silva"
              value={data.nome_cliente}
              onChange={(e) => onChange({ ...data, nome_cliente: e.target.value })}
              className="h-11"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@email.com"
                value={data.email}
                onChange={(e) => onChange({ ...data, email: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone" className="text-sm font-medium">Telefone</Label>
              <Input
                id="telefone"
                type="tel"
                placeholder="+351 912 345 678"
                value={data.telefone}
                onChange={(e) => onChange({ ...data, telefone: e.target.value })}
                className="h-11"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label className="text-sm font-medium">Tipo de Obra</Label>
            <Select
              value={data.tipo_obra}
              onValueChange={(v) => onChange({ ...data, tipo_obra: v as TipoObra })}
            >
              <SelectTrigger className="h-11">
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
          </motion.div>

          <motion.div variants={itemVariants} className="pt-2">
            <Button
              className="w-full h-12 text-base font-semibold"
              size="lg"
              disabled={!isValid || isLoading}
              onClick={onNext}
            >
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
