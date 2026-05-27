import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useIcfAnalysis,
  useIcfDocuments,
  useUploadIcfDocument,
  useDeleteIcfDocument,
  useClassifyIcfDocuments,
  useIcfChecklist,
  useUpdateChecklistItem,
  useIcfIssues,
  useResolveIssue,
  useUpdateIcfAnalysis,
} from '@/hooks/useIcfDossier';
import type { IcfDocumentCategory } from '@/types/icf-dossier';
import { supabase } from '@/integrations/supabase/client';

const CATEGORY_LABELS: Record<IcfDocumentCategory, string> = {
  planta: 'Planta',
  corte: 'Corte',
  alcado: 'Alçado',
  detalhe: 'Detalhe',
  mapa_vaos: 'Mapa de vãos',
  fundacao: 'Fundação',
  memoria_descritiva: 'Memória descritiva',
  outro: 'Outro',
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  rascunho: { label: 'Rascunho', tone: 'bg-muted text-muted-foreground' },
  em_classificacao: { label: 'A classificar', tone: 'bg-blue-100 text-blue-700' },
  em_revisao: { label: 'Em revisão', tone: 'bg-amber-100 text-amber-700' },
  validado: { label: 'Validado', tone: 'bg-emerald-100 text-emerald-700' },
  enviado_orcamento: { label: 'Enviado p/ orçamento', tone: 'bg-primary/10 text-primary' },
  arquivado: { label: 'Arquivado', tone: 'bg-muted text-muted-foreground' },
};

export default function IcfDossier() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCat, setUploadCat] = useState<IcfDocumentCategory>('planta');

  const { data: analysis, isLoading } = useIcfAnalysis(id);
  const { data: docs = [] } = useIcfDocuments(id);
  const { data: checklist = [] } = useIcfChecklist(id);
  const { data: issues = [] } = useIcfIssues(id);
  const upload = useUploadIcfDocument();
  const del = useDeleteIcfDocument();
  const classify = useClassifyIcfDocuments();
  const updateCheck = useUpdateChecklistItem();
  const resolveIssue = useResolveIssue();
  const updateAnalysis = useUpdateIcfAnalysis();

  if (isLoading || !analysis) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const openItems = issues.filter(i => i.status === 'open');
  const presentItems = checklist.filter(c => c.status === 'present').length;
  const checklistProgress = checklist.length ? Math.round((presentItems / checklist.length) * 100) : 0;
  const statusInfo = STATUS_LABELS[analysis.status] ?? STATUS_LABELS.rascunho;

  const handleFiles = async (files: FileList | null) => {
    if (!files || !id) return;
    for (const f of Array.from(files)) {
      await upload.mutateAsync({ analysisId: id, file: f, userCategory: uploadCat });
    }
  };

  const handlePreview = async (path: string) => {
    const { data } = await supabase.storage.from('plan-files').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/icf')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{analysis.titulo}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={statusInfo.tone}>{statusInfo.label}</Badge>
              {analysis.sistema_icf && (
                <Badge variant="outline" className="text-xs">
                  {analysis.sistema_icf} · núcleo {analysis.espessura_nucleo_mm ?? 150} mm
                </Badge>
              )}
              {openItems.length > 0 && (
                <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {openItems.length} pendência{openItems.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={() => classify.mutate({ analysisId: id! })}
          disabled={classify.isPending || docs.length === 0}
        >
          {classify.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Classificar com Axia
        </Button>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="documentos">Documentos ({docs.length})</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="panos">Panos</TabsTrigger>
          <TabsTrigger value="composicao">Composição</TabsTrigger>
          <TabsTrigger value="isometrico">Isométrico</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
        </TabsList>

        {/* Resumo */}
        <TabsContent value="resumo" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{docs.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {docs.filter(d => d.status === 'classified').length} classificados
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{checklistProgress}%</p>
                <Progress value={checklistProgress} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pendências abertas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{openItems.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {issues.filter(i => i.severity === 'critical' || i.severity === 'error').length} críticas
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Identificação do dossiê</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Título</label>
                <Input
                  defaultValue={analysis.titulo}
                  onBlur={e =>
                    e.target.value !== analysis.titulo &&
                    updateAnalysis.mutate({ id: analysis.id, patch: { titulo: e.target.value } })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Descrição</label>
                <Textarea
                  defaultValue={analysis.descricao ?? ''}
                  rows={3}
                  onBlur={e =>
                    e.target.value !== (analysis.descricao ?? '') &&
                    updateAnalysis.mutate({ id: analysis.id, patch: { descricao: e.target.value } })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground italic">
                Todas as classificações são assistidas pela Axia e devem ser revistas por técnico responsável.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos" className="space-y-4 mt-4">
          <Card className="rounded-xl">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs text-muted-foreground">Categoria sugerida</label>
                  <Select value={uploadCat} onValueChange={(v: IcfDocumentCategory) => setUploadCat(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} disabled={upload.isPending}>
                  {upload.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Carregar ficheiros
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
                />
              </div>

              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum documento carregado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card/50"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {doc.user_category && (
                            <Badge variant="outline" className="text-[10px]">
                              {CATEGORY_LABELS[doc.user_category]}
                            </Badge>
                          )}
                          {doc.axia_category && (
                            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30">
                              <Sparkles className="h-2.5 w-2.5 mr-1" />
                              Axia: {CATEGORY_LABELS[doc.axia_category]}
                              {doc.axia_confidence != null && ` (${Math.round(doc.axia_confidence * 100)}%)`}
                            </Badge>
                          )}
                        </div>
                        {doc.axia_summary && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{doc.axia_summary}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handlePreview(doc.file_path)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => del.mutate({ doc })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist */}
        <TabsContent value="checklist" className="space-y-2 mt-4">
          <Card className="rounded-xl">
            <CardContent className="pt-4 space-y-2">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                  <CheckCircle2
                    className={`h-5 w-5 ${item.status === 'present' ? 'text-emerald-500' : 'text-muted-foreground/40'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.item_label}</p>
                    {item.required && <p className="text-[10px] text-muted-foreground">Obrigatório</p>}
                  </div>
                  <Select
                    value={item.status}
                    onValueChange={v => updateCheck.mutate({ id: item.id, patch: { status: v as any } })}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="present">Presente</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="missing">Em falta</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          {openItems.length > 0 && (
            <Card className="rounded-xl border-amber-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Pendências da Axia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {openItems.map(issue => (
                  <div key={issue.id} className="flex items-start gap-3 p-2 rounded-lg border bg-amber-50/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{issue.title}</p>
                      {issue.message && <p className="text-xs text-muted-foreground mt-0.5">{issue.message}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resolveIssue.mutate({ id: issue.id, status: 'resolved' })}
                    >
                      Resolver
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Panos */}
        <TabsContent value="panos" className="mt-4">
          <Card className="rounded-xl">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              A geração de panos a partir do dossiê será ligada na Fase 3.
              <br />
              Entretanto, use o assistente arquitetónico para gerar panos individuais.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Placeholders F3 */}
        {(['composicao', 'isometrico', 'manual', 'orcamento'] as const).map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card className="rounded-xl">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Esta secção será ativada na Fase 3 (Composição HOMEBLOCK, modelo isométrico, manual técnico
                e envio para orçamento).
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
