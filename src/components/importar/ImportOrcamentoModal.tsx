import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Loader2, CheckCircle2, Sparkles, ArrowRight, ArrowLeft, FileSpreadsheet } from 'lucide-react';
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
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'processing' | 'preview' | 'confirm';

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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const f = acceptedFiles[0];
    setFile(f);
    setStep('processing');

    try {
      const parsed: ParsedExcelData = await parseExcelFile(f);

      if (parsed.rows.length === 0) {
        toast.error('O ficheiro não contém dados.');
        setStep('upload');
        return;
      }

      const { data, error } = await supabase.functions.invoke('organize-budget-import', {
        body: { rows: parsed.rows, headers: parsed.headers },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Erro ao processar o ficheiro com IA.');
        setStep('upload');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setStep('upload');
        return;
      }

      setOrganized(data as OrganizedBudget);
      setTitulo(data.titulo_sugerido || f.name.replace(/\.[^.]+$/, ''));
      setStep('preview');
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
    },
    maxFiles: 1,
    multiple: false,
  });

  const totalArtigos = organized?.capitulos.reduce((sum, c) => sum + c.artigos.length, 0) ?? 0;
  const totalValor = organized?.capitulos.reduce(
    (sum, c) => sum + c.artigos.reduce((s, a) => s + a.quantidade * a.preco_unitario, 0),
    0,
  ) ?? 0;

  const handleSave = async () => {
    if (!organized || !user) return;
    setIsSaving(true);

    try {
      // Generate budget code
      const { data: codigo } = await supabase.rpc('generate_orcamento_codigo', {
        p_user_id: user.id,
      });

      // Insert budget
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

      if (orcErr || !orcamento) {
        throw new Error(orcErr?.message || 'Erro ao criar orçamento');
      }

      // Insert chapters and articles
      for (const cap of organized.capitulos) {
        const { data: capitulo, error: capErr } = await supabase
          .from('capitulos_orcamento')
          .insert({
            orcamento_id: orcamento.id,
            numero: cap.numero,
            titulo: cap.titulo,
            ordem: cap.numero,
          })
          .select('id')
          .single();

        if (capErr || !capitulo) {
          console.error('Cap error:', capErr);
          continue;
        }

        const artigosToInsert = cap.artigos.map((art, idx) => ({
          capitulo_id: capitulo.id,
          codigo: art.codigo || `${cap.numero}.${idx + 1}`,
          descricao: art.descricao,
          unidade: art.unidade,
          quantidade: art.quantidade,
          preco_unitario: art.preco_unitario,
          preco_base: art.preco_unitario,
          margem_lucro_artigo: 0,
          valor_total: art.quantidade * art.preco_unitario,
          ordem: idx + 1,
          quantity_source: 'manual',
        }));

        if (artigosToInsert.length > 0) {
          const { error: artErr } = await supabase
            .from('artigos_orcamento')
            .insert(artigosToInsert);

          if (artErr) {
            console.error('Artigos error:', artErr);
          }
        }
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Importar Orçamento com IA
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload do seu ficheiro Excel e a IA organizará o orçamento automaticamente.'}
            {step === 'processing' && 'A IA está a analisar e organizar o seu orçamento...'}
            {step === 'preview' && 'Revise o orçamento organizado pela IA antes de confirmar.'}
            {step === 'confirm' && 'Defina o título e margem de lucro do orçamento.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
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
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">
                {isDragActive ? 'Solte o ficheiro aqui...' : 'Arraste o ficheiro ou clique para selecionar'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Formatos aceites: .xlsx, .xls, .csv — Máx. 500 linhas
              </p>
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg font-medium">A IA está a organizar o orçamento...</p>
              <p className="text-sm text-muted-foreground">
                Ficheiro: {file?.name}
              </p>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && organized && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="secondary">{organized.capitulos.length} capítulos</Badge>
                <Badge variant="secondary">{totalArtigos} artigos</Badge>
                <Badge variant="outline">
                  Total: €{totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                </Badge>
              </div>

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
                              <TableCell className="font-mono text-xs">
                                {art.codigo || `${cap.numero}.${ai + 1}`}
                              </TableCell>
                              <TableCell className="text-sm">{art.descricao}</TableCell>
                              <TableCell className="text-xs">{art.unidade}</TableCell>
                              <TableCell className="text-right text-sm">
                                {art.quantidade}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                €{art.preco_unitario.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                €{(art.quantidade * art.preco_unitario).toFixed(2)}
                              </TableCell>
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

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título do Orçamento</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Remodelação Apartamento T3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margem">Margem de Lucro (%)</Label>
                <Input
                  id="margem"
                  type="number"
                  min={0}
                  max={100}
                  value={margemLucro}
                  onChange={(e) => setMargemLucro(Number(e.target.value))}
                />
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
                <p><strong>Capítulos:</strong> {organized?.capitulos.length}</p>
                <p><strong>Artigos:</strong> {totalArtigos}</p>
                <p><strong>Valor Base:</strong> €{totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => { reset(); }}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Novo ficheiro
              </Button>
              <Button onClick={() => setStep('confirm')}>
                Continuar
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('preview')}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !titulo.trim()}>
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
