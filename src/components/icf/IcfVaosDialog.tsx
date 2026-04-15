import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { useIcfVaos, useCreateIcfVao, useDeleteIcfVao } from '@/hooks/useIcfData';

interface Props {
  panoId: string | null;
  onClose: () => void;
}

export function IcfVaosDialog({ panoId, onClose }: Props) {
  const { data: vaos } = useIcfVaos(panoId ?? undefined);
  const createVao = useCreateIcfVao();
  const deleteVao = useDeleteIcfVao();
  const [form, setForm] = useState({ tipo_vao: 'janela', largura: 1.2, altura: 1.2, quantidade: 1 });

  const handleAdd = () => {
    if (!panoId) return;
    createVao.mutate({ pano_id: panoId, ...form } as any, {
      onSuccess: () => setForm({ tipo_vao: 'janela', largura: 1.2, altura: 1.2, quantidade: 1 }),
    });
  };

  return (
    <Dialog open={!!panoId} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Vãos do Pano</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Larg.</TableHead>
                <TableHead className="text-right">Alt.</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Área</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaos?.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="text-sm">{v.tipo_vao}</TableCell>
                  <TableCell className="text-right">{v.largura.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{v.altura.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{v.quantidade}</TableCell>
                  <TableCell className="text-right font-medium">{v.area_total?.toFixed(2)}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => deleteVao.mutate(v.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {(!vaos || vaos.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">Sem vãos</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          <div className="border-t pt-3 space-y-3">
            <p className="text-sm font-medium">Adicionar Vão</p>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo_vao} onValueChange={v => setForm(f => ({ ...f, tipo_vao: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="janela">Janela</SelectItem>
                    <SelectItem value="porta">Porta</SelectItem>
                    <SelectItem value="portada">Portada</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Larg. (m)</Label><Input className="h-8 text-xs" type="number" step="0.01" value={form.largura} onChange={e => setForm(f => ({ ...f, largura: +e.target.value }))} /></div>
              <div><Label className="text-xs">Alt. (m)</Label><Input className="h-8 text-xs" type="number" step="0.01" value={form.altura} onChange={e => setForm(f => ({ ...f, altura: +e.target.value }))} /></div>
              <div><Label className="text-xs">Qtd</Label><Input className="h-8 text-xs" type="number" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: +e.target.value }))} /></div>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={createVao.isPending} className="w-full">
              <Plus className="h-3 w-3 mr-1" />Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
