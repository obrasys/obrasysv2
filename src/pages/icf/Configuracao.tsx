import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Lock, Copy } from 'lucide-react';
import { useIcfConfiguracao, useUpdateIcfConfig, useCreateIcfConfig } from '@/hooks/useIcfData';
import { useState, useEffect } from 'react';

const IcfConfiguracao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: config, isLoading } = useIcfConfiguracao(id);
  const updateConfig = useUpdateIcfConfig();
  const createConfig = useCreateIcfConfig();

  const [form, setForm] = useState({
    nome: '',
    espessura_nucleo: 0.15,
    classe_betao: 'C30/37',
    classe_aco: 'A500',
    recobrimento_mm: 25,
    altura_piso_padrao: 2.90,
    tipologia_fundacao: 'sapata_continua',
    tipologia_laje: 'vigotas_in_situ',
    fator_perdas: 0.05,
    fator_transpasse: 0.10,
    notas_tecnicas: '',
    status: 'rascunho' as string,
  });

  useEffect(() => {
    if (config) {
      setForm({
        nome: config.nome,
        espessura_nucleo: config.espessura_nucleo,
        classe_betao: config.classe_betao,
        classe_aco: config.classe_aco,
        recobrimento_mm: config.recobrimento_mm ?? 25,
        altura_piso_padrao: config.altura_piso_padrao ?? 2.90,
        tipologia_fundacao: config.tipologia_fundacao ?? 'sapata_continua',
        tipologia_laje: config.tipologia_laje ?? 'vigotas_in_situ',
        fator_perdas: config.fator_perdas,
        fator_transpasse: config.fator_transpasse,
        notas_tecnicas: config.notas_tecnicas ?? '',
        status: config.status,
      });
    }
  }, [config]);

  const handleSave = () => {
    if (!id) return;
    updateConfig.mutate({ id, ...form } as any);
  };

  const handleFreeze = () => {
    if (!id) return;
    updateConfig.mutate({ id, status: 'congelado' } as any);
  };

  const handleDuplicate = () => {
    if (!config) return;
    createConfig.mutate({
      obra_id: config.obra_id,
      nome: `${config.nome} (cópia)`,
      espessura_nucleo: config.espessura_nucleo,
      classe_betao: config.classe_betao,
      classe_aco: config.classe_aco,
      versao: config.versao + 1,
    } as any);
  };

  const isLocked = form.status === 'congelado';

  return (
    <AppLayout title="Configuração ICF" subtitle={config?.nome}>
      <div className="p-4 md:p-6 space-y-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/icf')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parâmetros do Sistema Construtivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} disabled={isLocked} /></div>
              <div><Label>Espessura Núcleo (m)</Label><Input type="number" step="0.01" value={form.espessura_nucleo} onChange={e => setForm(f => ({ ...f, espessura_nucleo: +e.target.value }))} disabled={isLocked} /></div>
              <div>
                <Label>Classe Betão</Label>
                <Select value={form.classe_betao} onValueChange={v => setForm(f => ({ ...f, classe_betao: v }))} disabled={isLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['C20/25', 'C25/30', 'C30/37', 'C35/45'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Classe Aço</Label>
                <Select value={form.classe_aco} onValueChange={v => setForm(f => ({ ...f, classe_aco: v }))} disabled={isLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['A400', 'A500', 'A500NR'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Recobrimento (mm)</Label><Input type="number" value={form.recobrimento_mm} onChange={e => setForm(f => ({ ...f, recobrimento_mm: +e.target.value }))} disabled={isLocked} /></div>
              <div><Label>Altura Piso Padrão (m)</Label><Input type="number" step="0.01" value={form.altura_piso_padrao} onChange={e => setForm(f => ({ ...f, altura_piso_padrao: +e.target.value }))} disabled={isLocked} /></div>
              <div><Label>Fator Perdas (%)</Label><Input type="number" step="0.01" value={form.fator_perdas} onChange={e => setForm(f => ({ ...f, fator_perdas: +e.target.value }))} disabled={isLocked} /></div>
              <div><Label>Fator de Amarração (%)</Label><Input type="number" step="0.01" value={form.fator_transpasse} onChange={e => setForm(f => ({ ...f, fator_transpasse: +e.target.value }))} disabled={isLocked} /></div>
            </div>
            <div><Label>Notas Técnicas</Label><Textarea value={form.notas_tecnicas} onChange={e => setForm(f => ({ ...f, notas_tecnicas: e.target.value }))} disabled={isLocked} rows={3} /></div>

            <div className="flex gap-2 pt-2">
              {!isLocked && (
                <>
                  <Button onClick={handleSave} disabled={updateConfig.isPending}><Save className="h-4 w-4 mr-1" />Guardar</Button>
                  <Button variant="outline" onClick={handleFreeze}><Lock className="h-4 w-4 mr-1" />Congelar</Button>
                </>
              )}
              <Button variant="outline" onClick={handleDuplicate}><Copy className="h-4 w-4 mr-1" />Duplicar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default IcfConfiguracao;
