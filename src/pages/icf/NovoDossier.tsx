import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateIcfAnalysis } from '@/hooks/useIcfDossier';
import { useObras } from '@/hooks/useObras';

export default function NovoDossierIcf() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialObra = params.get('obra') ?? undefined;
  const create = useCreateIcfAnalysis();
  const { obras = [] } = useObras();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [obraId, setObraId] = useState<string | undefined>(initialObra);
  const [espessura, setEspessura] = useState<number>(150);

  const handleCreate = async () => {
    if (!titulo.trim()) return;
    const res = await create.mutateAsync({
      titulo: titulo.trim(),
      descricao,
      obra_id: obraId ?? null,
      espessura_nucleo_mm: espessura,
    });
    navigate(`/icf/dossier/${res.id}`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/icf')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Novo Dossiê ICF Completo</h1>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Identificação</CardTitle>
          <CardDescription>
            Use quando possui projeto técnico ICF com plantas, cortes, alçados, detalhes, mapa de vãos e/ou
            fundações. Após criar, faça upload dos documentos para classificação assistida pela Axia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium">Título *</label>
            <Input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Moradia Costa - Dossiê ICF"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Obra associada</label>
            <Select value={obraId ?? '__none__'} onValueChange={v => setObraId(v === '__none__' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Sem obra" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem obra</SelectItem>
                {obras.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Espessura do núcleo (mm)</label>
            <Select value={String(espessura)} onValueChange={v => setEspessura(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="150">150 mm (HB-BLOCO-220)</SelectItem>
                <SelectItem value="220">220 mm (HB-BLOCO-300)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Notas / contexto</label>
            <Textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={!titulo.trim() || create.isPending}>
            Criar dossiê
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
