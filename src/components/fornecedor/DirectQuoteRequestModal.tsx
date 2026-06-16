import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Send, FileEdit } from 'lucide-react';
import { useFornecedores } from '@/hooks/useFinanceiro';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { supabase } from '@/integrations/supabase/client';
import {
  useCreateDirectQuoteRequest,
  type DirectQuoteItemInput,
} from '@/hooks/useFornecedorQuoteRequests';
import type { Fornecedor } from '@/types/financeiro';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fornecedor?: Fornecedor | null;
  orcamentoId?: string;
}

const emptyItem = (): DirectQuoteItemInput => ({
  descricao: '',
  unidade: 'un',
  quantidade: 1,
});

export function DirectQuoteRequestModal({
  open,
  onOpenChange,
  fornecedor: fixedFornecedor,
  orcamentoId,
}: Props) {
  const { fornecedores } = useFornecedores();
  const { orcamentos } = useOrcamentos();
  const create = useCreateDirectQuoteRequest();

  const [fornecedorId, setFornecedorId] = useState<string>('');
  const [budgetId, setBudgetId] = useState<string>(orcamentoId || '');
  const [deadline, setDeadline] = useState('');
  const [message, setMessage] = useState('');
  const [terms, setTerms] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [items, setItems] = useState<DirectQuoteItemInput[]>([emptyItem()]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFornecedorId(fixedFornecedor?.id || '');
    setBudgetId(orcamentoId || '');
    setDeadline('');
    setMessage('');
    setTerms('');
    setDeliveryLocation('');
    setItems([emptyItem()]);
  }, [open, fixedFornecedor?.id, orcamentoId]);

  const updateItem = (idx: number, patch: Partial<DirectQuoteItemInput>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const importFromBudget = async () => {
    if (!budgetId) return;
    setImporting(true);
    try {
      const { data, error } = await supabase
        .from('capitulos_orcamento')
        .select(`
          nome,
          artigos_orcamento(id, codigo, descricao, unidade, quantidade)
        `)
        .eq('orcamento_id', budgetId)
        .order('ordem');
      if (error) throw error;
      const imported: DirectQuoteItemInput[] = [];
      (data || []).forEach((cap: any) => {
        (cap.artigos_orcamento || []).forEach((art: any) => {
          imported.push({
            descricao: art.descricao,
            unidade: art.unidade || 'un',
            quantidade: Number(art.quantidade) || 0,
            codigo: art.codigo || null,
            capitulo: cap.nome || null,
            artigo_orcamento_id: art.id,
          });
        });
      });
      if (imported.length > 0) {
        setItems((prev) => {
          const filtered = prev.filter((p) => p.descricao.trim());
          return [...filtered, ...imported];
        });
      }
    } finally {
      setImporting(false);
    }
  };

  const canSubmit =
    !!fornecedorId &&
    items.length > 0 &&
    items.every((i) => i.descricao.trim() && i.quantidade > 0) &&
    !create.isPending;

  const submit = (sendNow: boolean) => {
    create.mutate(
      {
        fornecedor_id: fornecedorId,
        orcamento_id: budgetId || null,
        requested_deadline: deadline || null,
        message_to_suppliers: message || null,
        terms: terms || null,
        delivery_location: deliveryLocation || null,
        items: items.filter((i) => i.descricao.trim()),
        send_now: sendNow,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const activeFornecedores = fornecedores?.filter((f) => f.ativo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> Pedido de cotação direto
          </DialogTitle>
          <DialogDescription>
            Envie um pedido a um fornecedor da sua empresa. Pode importar artigos de um orçamento ou
            inserir manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-5 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Fornecedor *</Label>
              <Select
                value={fornecedorId}
                onValueChange={setFornecedorId}
                disabled={!!fixedFornecedor}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolher fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {activeFornecedores?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                      {f.email ? '' : ' (sem email)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orçamento (opcional)</Label>
              <Select
                value={budgetId || 'none'}
                onValueChange={(v) => setBudgetId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem orçamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem orçamento</SelectItem>
                  {orcamentos?.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo para resposta</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div>
              <Label>Local de entrega</Label>
              <Input
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="Ex: Obra Av. da Liberdade, Lisboa"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Mensagem ao fornecedor</Label>
              <Textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Informações adicionais sobre o pedido..."
              />
            </div>
            <div className="md:col-span-2">
              <Label>Condições / observações</Label>
              <Textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Condições de pagamento, garantias, etc."
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Itens a cotar ({items.length})</div>
            <div className="flex gap-2">
              {budgetId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={importFromBudget}
                  disabled={importing}
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FileEdit className="h-4 w-4 mr-1" />
                  )}
                  Importar do orçamento
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Linha
              </Button>
            </div>
          </div>

          <ScrollArea className="border rounded-lg max-h-[40vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Descrição *</TableHead>
                  <TableHead className="w-[140px]">Capítulo</TableHead>
                  <TableHead className="w-[80px]">Unid.</TableHead>
                  <TableHead className="w-[100px]">Qtd *</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        value={it.codigo || ''}
                        onChange={(e) => updateItem(idx, { codigo: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={1}
                        value={it.descricao}
                        onChange={(e) => updateItem(idx, { descricao: e.target.value })}
                        className="min-h-8 resize-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={it.capitulo || ''}
                        onChange={(e) => updateItem(idx, { capitulo: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={it.unidade || ''}
                        onChange={(e) => updateItem(idx, { unidade: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.quantidade}
                        onChange={(e) =>
                          updateItem(idx, { quantidade: parseFloat(e.target.value) || 0 })
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={() => submit(false)} disabled={!canSubmit}>
            Guardar rascunho
          </Button>
          <Button onClick={() => submit(true)} disabled={!canSubmit}>
            {create.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A enviar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Enviar agora
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
