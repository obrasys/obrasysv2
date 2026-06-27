import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Upload,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Plus,
  X,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  useCreatePricebook,
  type PricebookItemDraft,
} from '@/hooks/useTenantSupplierPricebooks';
import type { Fornecedor } from '@/types/financeiro';

const ACCEPTED: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
};

type Step = 'upload' | 'preview';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor: Fornecedor | null;
}

export function ImportPricebookModal({ open, onOpenChange, fornecedor }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createPb = useCreatePricebook();

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<PricebookItemDraft[]>([]);
  const [summary, setSummary] = useState('');
  const [name, setName] = useState('');
  const [categoria, setCategoria] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setStep('upload');
    setFile(null);
    setFilePath(null);
    setItems([]);
    setSummary('');
    setName('');
    setCategoria('');
    setValidFrom('');
    setValidTo('');
    setNotes('');
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length || !user?.id || !fornecedor) return;
      const f = accepted[0];
      setFile(f);
      setUploading(true);
      try {
        const { data: forn, error: fornErr } = await supabase
          .from('fornecedores')
          .select('organization_id')
          .eq('id', fornecedor.id)
          .maybeSingle();
        if (fornErr) throw fornErr;
        const orgId = forn?.organization_id;
        if (!orgId) throw new Error('Fornecedor sem organização');
        const path = `orgs/${orgId}/${fornecedor.id}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage
          .from('supplier-pricelists')
          .upload(path, f, { upsert: false });
        if (error) throw error;
        setFilePath(path);
        if (!name) setName(`Tabela ${f.name.replace(/\.[^.]+$/, '')}`);
      } catch (e: any) {
        toast({
          title: 'Erro ao carregar ficheiro',
          description: e.message,
          variant: 'destructive',
        });
        setFile(null);
      } finally {
        setUploading(false);
      }
    },
    [user?.id, fornecedor, toast, name]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 20 * 1024 * 1024,
    multiple: false,
    disabled: uploading || !fornecedor,
  });

  const analyze = async () => {
    if (!filePath || !fornecedor) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-supplier-pricelist', {
        body: { file_paths: [filePath], supplier_id: fornecedor.id },
      });
      if (error) throw error;
      const parsed: PricebookItemDraft[] = (data?.items || []).map((it: any) => ({
        codigo_artigo: it.item_code || null,
        descricao: [it.item_name, it.description].filter(Boolean).join(' — '),
        unidade: it.unit || null,
        preco_unitario: Number(it.base_price) || 0,
        iva: it.vat_rate ?? null,
        lead_time_days: it.lead_time_days ?? null,
        observacoes: it.notes || null,
        categoria: null,
      }));
      setItems(parsed);
      setSummary(data?.summary || '');
      setStep('preview');
      if (parsed.length === 0) {
        toast({
          title: 'Nenhum item extraído',
          description: 'Adicione os itens manualmente ou tente outro ficheiro.',
        });
      }
    } catch (e: any) {
      toast({
        title: 'Erro na análise',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const skipParsing = () => {
    setItems([emptyItem()]);
    setStep('preview');
  };

  const emptyItem = (): PricebookItemDraft => ({
    descricao: '',
    unidade: 'un',
    preco_unitario: 0,
  });

  const updateItem = (idx: number, patch: Partial<PricebookItemDraft>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const valid = items.length > 0 && items.every((i) => i.descricao.trim() && i.preco_unitario >= 0);

  const save = () => {
    if (!fornecedor || !valid) return;
    createPb.mutate(
      {
        fornecedor_id: fornecedor.id,
        name: name.trim() || `Tabela ${new Date().toLocaleDateString('pt-PT')}`,
        categoria: categoria || null,
        notes: notes || null,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        file_path: filePath,
        file_name: file?.name,
        file_type: file?.type,
        file_size_bytes: file?.size,
        items,
        origem_importacao: filePath ? 'import_ai' : 'manual',
      },
      {
        onSuccess: () => close(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Importar tabela de preços
            {fornecedor && (
              <span className="text-muted-foreground font-normal"> — {fornecedor.nome}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            Carregue Excel/CSV/PDF do fornecedor. A Axia™ extrai os artigos e pode editar antes de
            guardar.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 flex-1 overflow-auto">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              {uploading ? (
                <p className="flex items-center justify-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> A carregar...
                </p>
              ) : file ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    {file.type === 'application/pdf' ? (
                      <FileText className="w-4 h-4 text-red-500" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="text-sm font-medium">{file.name}</span>
                    <Badge variant="secondary">{(file.size / 1024).toFixed(0)} KB</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setFilePath(null);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pronto. Avance para análise.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium">Arraste ou clique para escolher um ficheiro</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Excel (.xlsx, .xls) ou CSV — máx. 20MB
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={skipParsing}>
                <Plus className="w-4 h-4 mr-2" /> Inserir manualmente
              </Button>
              <Button onClick={analyze} disabled={!filePath || analyzing}>
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> A analisar com Axia™...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Analisar e pré-visualizar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {summary && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{summary}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pb-name">Nome da tabela *</Label>
                <Input
                  id="pb-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Tarifário Q1 2026"
                />
              </div>
              <div>
                <Label htmlFor="pb-cat">Categoria</Label>
                <Input
                  id="pb-cat"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ex: Material elétrico"
                />
              </div>
              <div>
                <Label htmlFor="pb-from">Válido desde</Label>
                <Input
                  id="pb-from"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pb-to">Válido até</Label>
                <Input
                  id="pb-to"
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {items.length} item{items.length === 1 ? '' : 's'} — edite antes de guardar
              </div>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar linha
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[110px]">Código</TableHead>
                    <TableHead className="min-w-[260px]">Descrição *</TableHead>
                    <TableHead className="w-[80px]">Unid.</TableHead>
                    <TableHead className="w-[110px]">Preço (€) *</TableHead>
                    <TableHead className="w-[80px]">IVA %</TableHead>
                    <TableHead className="w-[90px]">Prazo (d)</TableHead>
                    <TableHead className="w-[160px]">Categoria</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={it.codigo_artigo || ''}
                          onChange={(e) => updateItem(idx, { codigo_artigo: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={it.descricao}
                          onChange={(e) => updateItem(idx, { descricao: e.target.value })}
                          rows={1}
                          className="min-h-8 resize-none"
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
                          step="0.01"
                          value={it.preco_unitario}
                          onChange={(e) =>
                            updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          value={it.iva ?? ''}
                          onChange={(e) =>
                            updateItem(idx, {
                              iva: e.target.value === '' ? null : parseFloat(e.target.value),
                            })
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={it.lead_time_days ?? ''}
                          onChange={(e) =>
                            updateItem(idx, {
                              lead_time_days:
                                e.target.value === '' ? null : parseInt(e.target.value),
                            })
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.categoria || ''}
                          onChange={(e) => updateItem(idx, { categoria: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum item. Clique em "Adicionar linha".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'preview' && (
            <Button variant="outline" onClick={() => setStep('upload')}>
              Voltar
            </Button>
          )}
          <Button variant="ghost" onClick={() => close(false)}>
            Cancelar
          </Button>
          {step === 'preview' && (
            <Button onClick={save} disabled={!valid || createPb.isPending}>
              {createPb.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> A guardar...
                </>
              ) : (
                <>Guardar tabela ({items.length})</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
