import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Save, BookOpen } from 'lucide-react';

interface Term {
  id: string;
  title: string;
  content: string;
  is_default: boolean;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function BudgetTermsCard({ value, onChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('organization_budget_terms')
        .select('id,title,content,is_default')
        .order('is_default', { ascending: false })
        .order('last_used_at', { ascending: false, nullsFirst: false });
      const list = (data || []) as Term[];
      setTerms(list);
      // Apply default if value is empty and a default exists
      if (!value && list.length > 0) {
        const def = list.find((t) => t.is_default) || list[0];
        if (def) {
          onChange(def.content);
          setSelectedId(def.id);
        }
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const t = terms.find((x) => x.id === id);
    if (t) onChange(t.content);
  };

  const handleSave = async () => {
    if (!user || !value.trim() || !saveTitle.trim()) {
      toast({ title: 'Indique um título e conteúdo.', variant: 'destructive' });
      return;
    }
    const { data: prof } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();
    if (!prof?.organization_id) {
      toast({ title: 'Sem organização', variant: 'destructive' });
      return;
    }
    if (saveAsDefault) {
      await supabase
        .from('organization_budget_terms')
        .update({ is_default: false })
        .eq('organization_id', prof.organization_id);
    }
    const { data, error } = await supabase
      .from('organization_budget_terms')
      .insert({
        organization_id: prof.organization_id,
        title: saveTitle.trim(),
        content: value,
        is_default: saveAsDefault,
        created_by: user.id,
        last_used_at: new Date().toISOString(),
      })
      .select('id,title,content,is_default')
      .single();
    if (error) {
      toast({ title: 'Erro ao guardar', description: error.message, variant: 'destructive' });
      return;
    }
    setTerms((prev) => [data as Term, ...prev.map((t) => (saveAsDefault ? { ...t, is_default: false } : t))]);
    setSelectedId((data as Term).id);
    setSaveTitle('');
    setSaveAsDefault(false);
    toast({ title: 'Condições comerciais guardadas' });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Condições Comerciais
          </Label>
          {terms.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Modelo:</span>
              <Select value={selectedId} onValueChange={handleSelect}>
                <SelectTrigger className="h-8 w-[240px] text-xs">
                  <SelectValue placeholder="Carregar modelo guardado" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.title} {t.is_default ? '(padrão)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder={
            loaded
              ? 'Prazo de validade da proposta: 30 dias\nCondições de pagamento: 30% à adjudicação, 70% por autos de medição\nPrazo de execução: a definir\nGarantia: 2 anos sobre mão-de-obra'
              : 'A carregar…'
          }
        />

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center pt-1 border-t">
          <Input
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            placeholder="Título do modelo (ex: Padrão remodelações)"
            className="h-9 text-xs"
          />
          <label className="flex items-center gap-2 text-xs whitespace-nowrap">
            <Checkbox checked={saveAsDefault} onCheckedChange={(v) => setSaveAsDefault(!!v)} />
            Definir como padrão
          </label>
          <Button onClick={handleSave} size="sm" variant="outline" type="button">
            <Save className="w-3.5 h-3.5 mr-1" /> Guardar modelo
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Estas condições serão incluídas no PDF e podem ser reutilizadas em próximos orçamentos.
        </p>
      </CardContent>
    </Card>
  );
}
