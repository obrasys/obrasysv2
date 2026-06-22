import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, MapPin, Home, Wrench, Link2 } from 'lucide-react';
import { useBudgetLibraries } from '@/hooks/useBudgetLibraries';

export default function BibliotecaOrcamentosPage() {
  const lib = useBudgetLibraries();
  const [newZone, setNewZone] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newType, setNewType] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Biblioteca de Orçamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure Zonas, Áreas e Tipos de Serviço reutilizáveis nos seus orçamentos.
          Todos os campos são opcionais — só aparecem nos artigos quando os escolher.
        </p>
      </div>

      <Tabs defaultValue="zonas">
        <TabsList>
          <TabsTrigger value="zonas"><MapPin className="w-4 h-4 mr-1.5" />Zonas</TabsTrigger>
          <TabsTrigger value="areas"><Home className="w-4 h-4 mr-1.5" />Áreas</TabsTrigger>
          <TabsTrigger value="tipos"><Wrench className="w-4 h-4 mr-1.5" />Tipos de Serviço</TabsTrigger>
          <TabsTrigger value="ligacoes"><Link2 className="w-4 h-4 mr-1.5" />Sugestões</TabsTrigger>
        </TabsList>

        {/* ZONAS */}
        <TabsContent value="zonas" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Nova Zona</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input placeholder="Ex: Apartamento, Moradia, Loja…" value={newZone} onChange={e => setNewZone(e.target.value)} />
              <Button onClick={() => { if (newZone.trim()) { lib.createZone.mutate({ nome: newZone }); setNewZone(''); }}}>
                <Plus className="w-4 h-4 mr-1" />Adicionar
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-2">
            {(lib.zones.data || []).map(z => (
              <div key={z.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <Switch checked={z.ativo} onCheckedChange={() => lib.toggleZone.mutate(z)} />
                  <span className={z.ativo ? '' : 'opacity-50 line-through'}>{z.nome}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => lib.deleteZone.mutate(z.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ÁREAS */}
        <TabsContent value="areas" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Nova Área</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input placeholder="Ex: Sala, Cozinha, Quarto, WC…" value={newArea} onChange={e => setNewArea(e.target.value)} />
              <Button onClick={() => { if (newArea.trim()) { lib.createArea.mutate({ nome: newArea }); setNewArea(''); }}}>
                <Plus className="w-4 h-4 mr-1" />Adicionar
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-2">
            {(lib.areas.data || []).map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <Switch checked={a.ativo} onCheckedChange={() => lib.toggleArea.mutate(a)} />
                  <span className={a.ativo ? '' : 'opacity-50 line-through'}>{a.nome}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => lib.deleteArea.mutate(a.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TIPOS */}
        <TabsContent value="tipos" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Novo Tipo de Serviço</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input placeholder="Ex: Pintura, Pavimentos, Cerâmica…" value={newType} onChange={e => setNewType(e.target.value)} />
              <Button onClick={() => { if (newType.trim()) { lib.createType.mutate({ nome: newType }); setNewType(''); }}}>
                <Plus className="w-4 h-4 mr-1" />Adicionar
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-2">
            {(lib.types.data || []).map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <Switch checked={t.ativo} onCheckedChange={() => lib.toggleType.mutate(t)} />
                  <span className={t.ativo ? '' : 'opacity-50 line-through'}>{t.nome}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => lib.deleteType.mutate(t.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* LIGAÇÕES */}
        <TabsContent value="ligacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Áreas sugeridas por Zona</CardTitle>
              <p className="text-xs text-muted-foreground">Ao escolher uma Zona num artigo, estas áreas aparecem como sugestões.</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {(lib.zones.data || []).filter(z => z.ativo).map(z => (
                  <Badge key={z.id} variant={selectedZoneId === z.id ? 'default' : 'outline'}
                    className="cursor-pointer" onClick={() => setSelectedZoneId(z.id)}>
                    {z.nome}
                  </Badge>
                ))}
              </div>
              {selectedZoneId && (
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  {(lib.areas.data || []).filter(a => a.ativo).map(a => {
                    const link = (lib.zoneAreaLinks.data || []).find(l => l.zone_id === selectedZoneId && l.area_id === a.id);
                    return (
                      <Badge key={a.id} variant={link ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => lib.toggleZoneAreaLink.mutate({ zone_id: selectedZoneId, area_id: a.id, existingId: link?.id })}>
                        {a.nome}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipos de Serviço sugeridos por Área</CardTitle>
              <p className="text-xs text-muted-foreground">Ao escolher uma Área, estes Tipos de Serviço aparecem como sugestões.</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {(lib.areas.data || []).filter(a => a.ativo).map(a => (
                  <Badge key={a.id} variant={selectedAreaId === a.id ? 'default' : 'outline'}
                    className="cursor-pointer" onClick={() => setSelectedAreaId(a.id)}>
                    {a.nome}
                  </Badge>
                ))}
              </div>
              {selectedAreaId && (
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  {(lib.types.data || []).filter(t => t.ativo).map(t => {
                    const link = (lib.areaTypeLinks.data || []).find(l => l.area_id === selectedAreaId && l.service_type_id === t.id);
                    return (
                      <Badge key={t.id} variant={link ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => lib.toggleAreaTypeLink.mutate({ area_id: selectedAreaId, service_type_id: t.id, existingId: link?.id })}>
                        {t.nome}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
