import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Loader2, Sparkles, TrendingUp, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface EssencialStep3LucroEnvioProps {
  subtotal: number;
  margemLucro: number;
  onMargemChange: (v: number) => void;
  incluirIva: boolean;
  onIncluirIvaChange: (v: boolean) => void;
  enviarEmail: boolean;
  onEnviarEmailChange: (v: boolean) => void;
  onBack: () => void;
  onFinalize: () => void;
  isLoading?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function EssencialStep3LucroEnvio({
  subtotal,
  margemLucro,
  onMargemChange,
  incluirIva,
  onIncluirIvaChange,
  enviarEmail,
  onEnviarEmailChange,
  onBack,
  onFinalize,
  isLoading,
}: EssencialStep3LucroEnvioProps) {
  const lucroValor = subtotal * (margemLucro / 100);
  const totalSemIva = subtotal + lucroValor;
  const iva = incluirIva ? totalSemIva * 0.23 : 0;
  const totalFinal = totalSemIva + iva;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-lg mx-auto space-y-5"
    >
      {/* Slider de margem */}
      <motion.div variants={cardVariants}>
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-1.5 bg-primary" />
          <CardContent className="pt-6 pb-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-base font-bold">Margem de Lucro</Label>
                <p className="text-xs text-muted-foreground">Ajuste o lucro pretendido</p>
              </div>
              <motion.span
                key={margemLucro}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-3xl font-black text-primary tabular-nums"
              >
                {margemLucro}%
              </motion.span>
            </div>
            <Slider
              value={[margemLucro]}
              onValueChange={([v]) => onMargemChange(v)}
              min={0}
              max={40}
              step={1}
              className="py-1"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium -mt-1 px-0.5">
              <span>0%</span>
              <span>10%</span>
              <span>20%</span>
              <span>30%</span>
              <span>40%</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Resumo financeiro */}
      <motion.div variants={cardVariants}>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6 pb-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-bold text-base">Resumo Financeiro</h3>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal dos trabalhos</span>
                <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-accent dark:text-accent">
                <span>Lucro ({margemLucro}%)</span>
                <span className="font-semibold tabular-nums">+{formatCurrency(lucroValor)}</span>
              </div>
              {incluirIva && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA (23%)</span>
                  <span className="tabular-nums">{formatCurrency(iva)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-xl">
                <span className="font-bold">Total Final</span>
                <motion.span
                  key={totalFinal}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="font-black tabular-nums"
                >
                  {formatCurrency(totalFinal)}
                </motion.span>
              </div>
            </div>

            {/* Microcopy motivacional */}
            <div className="flex items-center gap-2.5 bg-accent/10 text-accent rounded-xl p-3.5 text-sm">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                Lucro estimado: <strong>{formatCurrency(lucroValor)}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Opções */}
      <motion.div variants={cardVariants}>
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4 px-5 space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="incluir-iva"
                checked={incluirIva}
                onCheckedChange={(v) => onIncluirIvaChange(!!v)}
              />
              <Label htmlFor="incluir-iva" className="cursor-pointer text-sm">
                Incluir IVA automaticamente (23%)
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="enviar-email"
                checked={enviarEmail}
                onCheckedChange={(v) => onEnviarEmailChange(!!v)}
              />
              <Label htmlFor="enviar-email" className="cursor-pointer text-sm">
                Enviar por email ao cliente
              </Label>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div variants={cardVariants} className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onBack} disabled={isLoading} className="h-12">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button className="flex-1 h-12 text-base font-bold" size="lg" onClick={onFinalize} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A gerar...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Orçamento
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
