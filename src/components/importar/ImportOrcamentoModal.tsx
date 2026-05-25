import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import mammoth from 'mammoth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Loader2, CheckCircle2, Sparkles, ArrowRight, ArrowLeft, FileSpreadsheet, FileText } from 'lucide-react';
import { parseExcelFile, type ParsedExcelData } from '@/lib/excel-budget-parser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OrganizedArticle {
  codigo: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
}

interface OrganizedChapter {
  numero: number;
  titulo: string;
  artigos: OrganizedArticle[];
}

interface OrganizedBudget {
  titulo_sugerido: string;
  capitulos: OrganizedChapter[];
  _meta?: {
    original_total: number;
    imported_total: number;
    difference: number;
    status: 'ok' | 'review_required';
    valid_articles: number;
    chapters_found: number;
    ignored_rows: number;
    included_rows: number;
    subtotal_rows: number;
    ref_rows: number;
    ignored_reasons: string[];
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'processing' | 'preview' | 'confirm';
type FileType = 'excel' | 'pdf' | 'docx';

const getFunctionErrorMessage = async (error: unknown) => {
  if (!error || typeof error !== 'object') return null;

  const maybeError = error as {
    message?: string;
    context?: {
      json?: () => Promise<unknown>;
      text?: () => Promise<string>;
    };
  };

  if (maybeError.context?.json) {
    try {
      const payload = await maybeError.context.json();
      if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
        return payload.error;
      }
    } catch {
      // ignore and try other fallbacks
    }
  }

  if (maybeError.context?.text) {
    try {
      const text = await maybeError.context.text();
      if (!text) return maybeError.message ?? null;
      const payload = JSON.parse(text) as { error?: string };
      return payload.error || maybeError.message || text;
    } catch {
      // ignore and fall through to default message
    }
  }

  return maybeError.message ?? null;
};

const getFileType = (file: File): FileType => {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['docx'].includes(ext)) return 'docx';
  return 'excel';
};

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      resolve(btoa(binary));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

const readDocxAsText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const formatCurrency = (value: number) => `€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ImportOrcamentoModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [organized, setOrganized] = useState<OrganizedBudget | null>(null);
  const [titulo, setTitulo] = useState('');
  const [margemLucro, setMargemLucro] = useState(15);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setOrganized(null);
    setTitulo('');
    setMargemLucro(15);
    setIsSaving(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const processWithAI = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('organize-budget-import', { body });

    if (error) {
      console.error('Edge function error:', error);
      const message = await getFunctionErrorMessage(error);
      toast.error(message || 'Erro ao processar o ficheiro com IA.');
      setStep('upload');
      return;
    }

    if (data?.error) {
      toast.error(data.error);
      setStep('upload');
      return;
    }

    console.log('AI organized budget:', JSON.stringify(data, null, 2));
    const budget = data as OrganizedBudget;
    const artigosCount = budget.capitulos?.reduce((sum, c) => sum + (c.artigos?.length || 0), 0) ?? 0;
    if (artigosCount === 0) {
      toast.warning('A IA não encontrou artigos no ficheiro. Verifique se o ficheiro contém dados de orçamento.');
    }
    setOrganized(budget);
    setTitulo(data.titulo_sugerido || file?.name.replace(/\.[^.]+$/, '') || 'Orçamento Importado');
    setStep('preview');
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const f = acceptedFiles[0];
    setFile(f);
    setStep('processing');

    try {
      const fileType = getFileType(f);

      if (fileType === 'pdf') {
        const base64 = await readFileAsBase64(f);
        await processWithAI({ pdfBase64: base64, fileName: f.name });
      } else if (fileType === 'docx') {
        const rawText = await readDocxAsText(f);
        if (!rawText.trim()) {
          toast.error('O ficheiro DOCX não contém texto.');
          setStep('upload');
          return;
        }
        await processWithAI({ rawText, fileName: f.name });
      } else {
        const parsed: ParsedExcelData = await parseExcelFile(f);
        if (parsed.rows.length === 0) {
          toast.error('O ficheiro não contém dados.');
          setStep('upload');
          return;
        }
        await processWithAI({ rows: parsed.rows, headers: parsed.headers, fileName: f.name });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ler o ficheiro.');
      setStep('upload');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const totalArtigos = organized?.capitulos.reduce((sum, c) => sum + c.artigos.length, 0) ?? 0;
  const totalValor = organized?.capitulos.reduce(
    (sum, c) => sum + c.artigos.reduce((s, a) => s + Number(a.quantidade || 0) * Number(a.preco_unitario || 0), 0),
    0,
  ) ?? 0;
  const validation = organized?._meta;
  const isImportBlocked = validation?.status === 'review_required';

  const parseNumeric = (value: unknown, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return fallback;
    const cleaned = value.trim().replace(/\s/g, '').replace(/€|eur/gi, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const normalizeUnit = (unit: unknown) => {
    const raw = String(unit ?? '').trim().toLowerCase();
    if (!raw) return 'un';
    if (['un', 'uni', 'unid', 'unidade', 'unidades'].includes(raw)) return 'un';
    if (['m', 'metro', 'metros'].includes(raw)) return 'm';
    if (['m2', 'm²', 'mq'].includes(raw)) return 'm2';
    if (['m3', 'm³'].includes(raw)) return 'm3';
    if (['ml', 'm.l.', 'metro linear', 'metros lineares'].includes(raw)) return 'ml';
    if (['kg', 'quilo', 'quilos'].includes(raw)) return 'kg';
    if (['l', 'lt', 'litro', 'litros'].includes(raw)) return 'l';
    if (['vg', 'verba'].includes(raw)) return 'vg';
    return raw.slice(0, 12);
  };

  const handleSave = async () => {
    if (!organized || !user) return;
    if (isImportBlocked) {
      toast.error('A importação está bloqueada até o total coincidir com o ficheiro original.');
      return;
    }
    setIsSaving(true);

    try {
      const { data: codigo } = await supabase.rpc('generate_orcamento_codigo', { p_user_id: user.id });

      const { data: orcamento, error: orcErr } = await supabase
        .from('orcamentos')
        .insert({
          user_id: user.id,
          titulo: titulo || 'Orçamento Importado',
          codigo: codigo || null,
          status: 'rascunho' as const,
          valor_total: 0,
          margem_lucro: margemLucro,
          custos_indiretos: { estaleiro: 0, seguros: 0, licenciamento: 0 },
        })
        .select('id')
        .single();

      if (orcErr || !orcamento) throw new Error(orcErr?.message || 'Erro ao criar orçamento');

      let totalArtigosInseridos = 0;
      for (let i = 0; i < organized.capitulos.length; i++) {
        const cap = organized.capitulos[i];
        const capNumero = Math.round(Number(cap.numero) || (i + 1));
        const { data: capitulo, error: capErr } = await supabase
          .from('capitulos_orcamento')
          .insert({
            orcamento_id: orcamento.id,
            numero: capNumero,
            titulo: String(cap.titulo || `Capítulo ${capNumero}`),
            ordem: capNumero,
          })
          .select('id')
          .single();

        if (capErr || !capitulo) {
          console.error('Cap error:', capErr?.message);
          toast.error(`Erro ao criar capítulo "${cap.titulo}": ${capErr?.message || 'Erro desconhecido'}`);
          continue;
        }

        const artigosNormalizados = cap.artigos
          .map((art, idx) => {
            const descricao = String(art.descricao ?? '').trim();
            if (!descricao) return null;
            const quantidade = parseNumeric(art.quantidade, 1);
            const precoUnitario = parseNumeric(art.preco_unitario, 0);
            const unidade = normalizeUnit(art.unidade);
            return {
              capitulo_id: capitulo.id,
              codigo: (art.codigo && String(art.codigo).trim()) || `${capNumero}.${idx + 1}`,
              descricao,
              unidade,
              quantidade,
              preco_unitario: precoUnitario,
              preco_base: precoUnitario,
              margem_lucro_artigo: 0,
              ordem: idx + 1,
              quantity_source: 'manual' as const,
            };
          })
          .filter((art): art is NonNullable<typeof art> => art !== null);

        if (artigosNormalizados.length === 0) continue;

        const { error: artErr } = await supabase.from('artigos_orcamento').insert(artigosNormalizados);
        if (artErr) {
          console.error('Artigos error for cap', cap.titulo, ':', artErr);
          toast.error(`Erro ao inserir artigos do capítulo "${cap.titulo}": ${artErr.message}`);
        } else {
          totalArtigosInseridos += artigosNormalizados.length;
        }
      }

      if (totalArtigosInseridos === 0) {
        toast.warning('Orçamento criado mas sem artigos. Verifique o ficheiro.');
      }

      toast.success('Orçamento importado com sucesso!');
      handleClose(false);
      navigate(`/orcamentos/${orcamento.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao guardar orçamento');
    } finally {
      setIsSaving(false);
    }
  };

  const fileType = file ? getFileType(file) : null;
  const FileIcon = fileType === 'excel' ? FileSpreadsheet : FileText;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Importar Orçamento com IA
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload do seu ficheiro e a IA organizará o orçamento automaticamente.'}
            {step === 'processing' && 'A IA está a analisar e organizar o seu orçamento...'}
            {step === 'preview' && 'Revise o orçamento organizado pela IA antes de confirmar.'}
            {step === 'confirm' && 'Defina o título e margem de lucro do orçamento.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">
                {isDragActive ? 'Solte o ficheiro aqui...' : 'Arraste o ficheiro ou clique para selecionar'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Formatos aceites: .xlsx, .xls, .csv, .pdf, .docx
              </p>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg font-medium">A IA está a organizar o orçamento...</p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <FileIcon className="w-4 h-4" />
                {file?.name}
              </p>
            </div>
          )}

          {step === 'preview' && organized && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="secondary">{validation?.chapters_found ?? organized.capitulos.length} capítulos</Badge>
                <Badge variant="secondary">{validation?.valid_articles ?? totalArtigos} artigos válidos</Badge>
                <Badge variant="outline">Total importado: {formatCurrency(validation?.imported_total ?? totalValor)}</Badge>
                {validation?.original_total ? (
                  <Badge variant="outline">Total original: {formatCurrency(validation.original_total)}</Badge>
                ) : null}
                {validation ? (
                  <Badge variant={validation.status === 'ok' ? 'secondary' : 'destructive'}>
                    Diferença: {formatCurrency(validation.difference)}
                  </Badge>
                ) : null}
              </div>

              {validation && (
                <div className={`rounded-lg border p-4 text-sm space-y-2 ${validation.status === 'ok' ? 'border-border bg-muted/40' : 'border-destructive/40 bg-destructive/10'}`}>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span><strong>Estado:</strong> {validation.status === 'ok' ? 'OK' : 'Revisão obrigatória'}</span>
                    <span><strong>Ignoradas:</strong> {validation.ignored_rows}</span>
                    <span><strong>Subtotais/totais:</strong> {validation.subtotal_rows}</span>
                    <span><strong>Incluído no artigo:</strong> {validation.included_rows}</span>
                    <span><strong>#REF!:</strong> {validation.ref_rows}</span>
                  </div>
                  {validation.ignored_reasons.length > 0 ? (
                    <p className="text-muted-foreground">
                      <strong>Linhas excluídas:</strong> {validation.ignored_reasons.join(', ')}.
                    </p>
                  ) : null}
                  {validation.status === 'review_required' ? (
                    <p className="text-destructive font-medium">
                      Atenção: o total importado não coincide com o total original do ficheiro. Possível duplicação de capítulos, subtotais ou linhas informativas.
                    </p>
                  ) : null}
                </div>
              )}

              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="p-3 space-y-4">
                  {organized.capitulos.map((cap, ci) => (
                    <div key={ci}>
                      <div className="font-semibold text-sm bg-muted/50 px-3 py-2 rounded-md mb-1">
                        {cap.numero}. {cap.titulo}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-[60px]">Un.</TableHead>
                            <TableHead className="w-[80px] text-right">Qtd.</TableHead>
                            <TableHead className="w-[100px] text-right">Preço Un.</TableHead>
                            <TableHead className="w-[100px] text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cap.artigos.map((art, ai) => (
                            <TableRow key={ai}>
                              <TableCell className="font-mono text-xs">{art.codigo || `${cap.numero}.${ai + 1}`}</TableCell>
                              <TableCell className="text-sm">{art.descricao}</TableCell>
                              <TableCell className="text-xs">{art.unidade}</TableCell>
                              <TableCell className="text-right text-sm">{art.quantidade}</TableCell>
                              <TableCell className="text-right text-sm">€{art.preco_unitario.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-sm font-medium">€{(art.quantidade * art.preco_unitario).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título do Orçamento</Label>
                <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Remodelação Apartamento T3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margem">Margem de Lucro (%)</Label>
                <Input id="margem" type="number" min={0} max={100} value={margemLucro} onChange={(e) => setMargemLucro(Number(e.target.value))} />
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
                <p><strong>Capítulos:</strong> {organized?.capitulos.length}</p>
                <p><strong>Artigos:</strong> {totalArtigos}</p>
                <p><strong>Valor Base:</strong> {formatCurrency(validation?.imported_total ?? totalValor)}</p>
                {validation?.original_total ? <p><strong>Total original:</strong> {formatCurrency(validation.original_total)}</p> : null}
                {validation ? <p><strong>Diferença:</strong> {formatCurrency(validation.difference)}</p> : null}
              </div>
              {isImportBlocked ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  A importação está bloqueada porque o total importado não coincide com o total original do ficheiro.
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => { reset(); }}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Novo ficheiro
              </Button>
              <Button onClick={() => setStep('confirm')} disabled={isImportBlocked}>
                Continuar <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('preview')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !titulo.trim() || isImportBlocked}>
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> A guardar...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-1" /> Importar Orçamento</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
