import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, FileText, X, CheckCircle2, Loader2, Send, Sparkles, Eye } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
};

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'uploading' | 'done' | 'error';
}

interface ExtractedItem {
  item_code?: string;
  item_name: string;
  description?: string;
  unit: string;
  base_price: number;
  vat_rate?: number;
  min_qty?: number;
  lead_time_days?: number;
  notes?: string;
}

export function PriceListUploadCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [summary, setSummary] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user?.id) return;

    for (const file of acceptedFiles) {
      const entry: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
      };
      setFiles(prev => [...prev, entry]);

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('supplier-pricelists')
        .upload(filePath, file);

      if (error) {
        setFiles(prev =>
          prev.map(f => f.name === file.name && f.status === 'uploading'
            ? { ...f, status: 'error' } : f)
        );
        toast({ title: 'Erro ao carregar ficheiro', description: error.message, variant: 'destructive' });
      } else {
        setFiles(prev =>
          prev.map(f => f.name === file.name && f.status === 'uploading'
            ? { ...f, status: 'done', url: filePath } : f)
        );
        toast({ title: `${file.name} carregado com sucesso` });
      }
    }
  }, [user?.id, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const doneFiles = files.filter(f => f.status === 'done');
  const hasUploading = files.some(f => f.status === 'uploading');

  const handleAnalyze = async () => {
    if (!user?.id || doneFiles.length === 0) return;

    setAnalyzing(true);
    try {
      const { data: profile } = await supabase
        .from('supplier_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil de fornecedor não encontrado');

      const filePaths = doneFiles.map(f => f.url!);

      const { data, error } = await supabase.functions.invoke('parse-supplier-pricelist', {
        body: { file_paths: filePaths, supplier_id: profile.id },
      });

      if (error) throw new Error(error.message || 'Erro na análise');
      if (data?.error) throw new Error(data.error);

      setExtractedItems(data.items || []);
      setSummary(data.summary || '');
      setShowPreview(true);

      toast({
        title: `Axia™ encontrou ${data.total || 0} itens`,
        description: 'Reveja os itens antes de guardar na base.',
      });
    } catch (err: any) {
      toast({ title: 'Erro na análise Axia™', description: err.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!user?.id || extractedItems.length === 0) return;

    setSubmitting(true);
    try {
      const { data: profile } = await supabase
        .from('supplier_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      // Create pricebook
      const fileName = doneFiles.map(f => f.name).join(', ');
      const { data: pricebook, error: pbErr } = await supabase
        .from('supplier_pricebooks')
        .insert({
          supplier_id: profile.id,
          name: `Tabela - ${fileName}`,
          status: 'draft' as const,
          currency: 'EUR',
        })
        .select()
        .single();

      if (pbErr || !pricebook) throw new Error(pbErr?.message || 'Erro ao criar tabela');

      // Insert items in batches
      const batchSize = 50;
      for (let i = 0; i < extractedItems.length; i += batchSize) {
        const batch = extractedItems.slice(i, i + batchSize).map(item => ({
          pricebook_id: pricebook.id,
          item_code: item.item_code || null,
          item_name: item.item_name,
          description: item.description || null,
          unit: item.unit || 'un',
          base_price: item.base_price || 0,
          vat_rate: item.vat_rate || 23,
          min_qty: item.min_qty || 1,
          lead_time_days: item.lead_time_days || null,
          notes: item.notes || null,
        }));

        const { error: insertErr } = await supabase
          .from('supplier_pricebook_items')
          .insert(batch);

        if (insertErr) {
          console.error('Batch insert error:', insertErr);
          throw new Error(insertErr.message);
        }
      }

      setSubmitted(true);
      setShowPreview(false);
      toast({
        title: 'Base de preços criada com sucesso!',
        description: `${extractedItems.length} itens organizados pela Axia™ e guardados.`,
      });
    } catch (err: any) {
      toast({ title: 'Erro ao guardar', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const removeExtractedItem = (index: number) => {
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Carregar Tabela de Preços
            <Badge variant="secondary" className="text-[10px] bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/20">
              <Sparkles className="h-3 w-3 mr-1" />
              Axia™
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Envie a sua tabela de preços — a Axia™ organiza automaticamente os itens na sua base.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <div>
                <p className="font-medium text-foreground">Tabela organizada e guardada!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {extractedItems.length} itens processados pela Axia™.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFiles([]);
                  setSubmitted(false);
                  setExtractedItems([]);
                  setSummary('');
                }}
              >
                Carregar mais ficheiros
              </Button>
            </div>
          ) : (
            <>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                  ${isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30'
                  }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">
                  {isDragActive ? 'Largue aqui...' : 'Arraste ficheiros ou clique para selecionar'}
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">PDF</Badge>
                  <Badge variant="secondary" className="text-xs">XLS</Badge>
                  <Badge variant="secondary" className="text-xs">XLSX</Badge>
                  <Badge variant="secondary" className="text-xs">CSV</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Máximo 20MB por ficheiro</p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div key={file.name} className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm">
                      {getFileIcon(file.type)}
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                      {file.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {file.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {file.status === 'error' && <Badge variant="destructive" className="text-xs">Erro</Badge>}
                      <button onClick={() => removeFile(file.name)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {doneFiles.length > 0 && !hasUploading && (
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Axia™ a analisar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analisar com Axia™ e organizar
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate('/fornecedor/precos')}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Gerir tabelas de preços manualmente
          </Button>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[hsl(var(--chart-4))]" />
              Itens extraídos pela Axia™
            </DialogTitle>
            <DialogDescription>
              {summary || `${extractedItems.length} itens encontrados. Reveja antes de guardar na base.`}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh]">
            {extractedItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-[60px]">Un.</TableHead>
                    <TableHead className="w-[100px] text-right">Preço (€)</TableHead>
                    <TableHead className="w-[60px] text-right">IVA</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {item.item_code || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{item.item_name}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {item.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{item.unit}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {item.base_price?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {item.vat_rate || 23}%
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => removeExtractedItem(idx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum item extraído.
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2">
            <div className="flex-1 text-sm text-muted-foreground">
              {extractedItems.length} itens prontos para guardar
            </div>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveToDatabase}
              disabled={submitting || extractedItems.length === 0}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Guardar {extractedItems.length} itens na base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
