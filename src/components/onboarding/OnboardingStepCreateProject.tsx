import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, ChevronRight, MapPin, User, Tag, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useObras } from '@/hooks/useObras';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

export function OnboardingStepCreateProject({ onComplete, onBack }: Props) {
  const navigate = useNavigate();
  const { createObra } = useObras();
  const [created, setCreated] = useState(false);

  const [form, setForm] = useState({
    nome: '',
    cliente: '',
    endereco: '',
    tipo: '',
    data_inicio: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Nome da obra é obrigatório';
    if (!form.cliente.trim()) e.cliente = 'Cliente é obrigatório';
    if (!form.endereco.trim()) e.endereco = 'Localização é obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createObra.mutateAsync({
        nome: form.nome,
        cliente: form.cliente,
        endereco: form.endereco,
        data_inicio: form.data_inicio || null,
        status: 'planeamento',
        valor_previsto: 0,
      });
      setCreated(true);
    } catch {
      // error handled by useObras toast
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="flex flex-col items-center text-center px-2">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Excelente. A sua primeira obra já está criada.
        </h2>
        <p className="text-muted-foreground mt-3 max-w-md leading-relaxed">
          Agora já pode começar a estruturar orçamento, equipa e acompanhamento num único lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-sm">
          <Button size="lg" onClick={onComplete} className="flex-1 text-base font-semibold">
            Ir para o dashboard
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              onComplete();
              navigate('/orcamentos/essencial/novo');
            }}
            className="flex-1"
          >
            Criar orçamento agora
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-2">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Building2 className="w-6 h-6 text-primary" />
      </div>
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground text-center">
        Crie a sua primeira obra
      </h2>
      <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
        Basta o essencial para começar. Pode completar os detalhes depois.
      </p>

      <div className="w-full max-w-md mt-8 space-y-4">
        {/* Nome */}
        <div className="space-y-1.5">
          <Label htmlFor="ob-nome" className="text-sm font-medium flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            Nome da obra <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ob-nome"
            placeholder="Moradia Vale Verde"
            value={form.nome}
            onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
            className={errors.nome ? 'border-destructive' : ''}
          />
          {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
        </div>

        {/* Cliente */}
        <div className="space-y-1.5">
          <Label htmlFor="ob-cliente" className="text-sm font-medium flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            Cliente <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ob-cliente"
            placeholder="João Ferreira"
            value={form.cliente}
            onChange={(e) => setForm(f => ({ ...f, cliente: e.target.value }))}
            className={errors.cliente ? 'border-destructive' : ''}
          />
          {errors.cliente && <p className="text-xs text-destructive">{errors.cliente}</p>}
        </div>

        {/* Localização */}
        <div className="space-y-1.5">
          <Label htmlFor="ob-local" className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            Localização <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ob-local"
            placeholder="Lisboa"
            value={form.endereco}
            onChange={(e) => setForm(f => ({ ...f, endereco: e.target.value }))}
            className={errors.endereco ? 'border-destructive' : ''}
          />
          {errors.endereco && <p className="text-xs text-destructive">{errors.endereco}</p>}
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="ob-tipo" className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
              <Tag className="w-3.5 h-3.5" />
              Tipo de obra
            </Label>
            <Input
              id="ob-tipo"
              placeholder="Remodelação"
              value={form.tipo}
              onChange={(e) => setForm(f => ({ ...f, tipo: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-data" className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" />
              Data de início
            </Label>
            <Input
              id="ob-data"
              type="date"
              value={form.data_inicio}
              onChange={(e) => setForm(f => ({ ...f, data_inicio: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8 w-full max-w-xs">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
          {submitting ? 'A criar...' : 'Criar obra'}
        </Button>
      </div>
    </div>
  );
}
