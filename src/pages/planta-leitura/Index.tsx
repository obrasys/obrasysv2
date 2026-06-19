import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Wand2,
  Upload as UploadIcon,
  Send,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useObras } from "@/hooks/useObras";
import {
  usePlantFiles,
  usePlantUploadAndProcess,
  usePlantSheets,
  usePlantElements,
  useAllPlantElements,
  useSignedImageUrl,
  usePlantHistory,
  analyzeSheet,
  autoFixSheet,
  approveAllPendingForSheet,
} from "@/hooks/usePlantLeitura";
import { PlantUploadZone } from "@/components/planta-leitura/PlantUploadZone";
import { PlantSummaryCards } from "@/components/planta-leitura/PlantSummaryCards";
import { PlantViewer } from "@/components/planta-leitura/PlantViewer";
import { PlantViewerToolbar } from "@/components/planta-leitura/PlantViewerToolbar";
import { PlantElementsList } from "@/components/planta-leitura/PlantElementsList";
import { PlantPackagesList } from "@/components/planta-leitura/PlantPackagesList";
import { PlantHistoryList } from "@/components/planta-leitura/PlantHistoryList";
import { PlantExportToBudgetModal } from "@/components/planta-leitura/PlantExportToBudgetModal";

export default function PlantaLeituraIndexPage() {
  const { obraId } = useParams<{ obraId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { obras } = useObras();
  const { profile } = useAuth();
  const obra = obras.find((o) => o.id === obraId);

  const { files, refresh: refreshFiles } = usePlantFiles(obraId);
  const { upload, uploading, progress } = usePlantUploadAndProcess(obraId);

  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  useEffect(() => {
    if (!activeFileId && files.length > 0) setActiveFileId(files[0].id);
  }, [files, activeFileId]);

  const activeFile = files.find((f) => f.id === activeFileId);
  const { sheets, refresh: refreshSheets } = usePlantSheets(activeFileId || undefined);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  useEffect(() => {
    if (sheets.length > 0 && (!activeSheetId || !sheets.find((s) => s.id === activeSheetId))) {
      setActiveSheetId(sheets[0].id);
    }
  }, [sheets, activeSheetId]);
  const activeSheet = sheets.find((s) => s.id === activeSheetId);

  const { elements: sheetElements, refresh: refreshElements } = usePlantElements(
    activeFileId || undefined,
    activeSheetId || undefined
  );
  const { elements: allElements } = useAllPlantElements(activeFileId || undefined);
  const { logs, reviews, refresh: refreshHistory } = usePlantHistory(activeFileId || undefined);

  const imageUrl = useSignedImageUrl(activeSheet?.image_path || null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const handleSelectObra = (id: string) => {
    if (id) navigate(`/planta-leitura/${id}`);
    else navigate("/planta-leitura");
  };

  const handleUpload = async (file: File) => {
    const pf = await upload(file);
    if (pf) {
      await refreshFiles();
      setActiveFileId(pf.id);
    }
  };

  const handleAnalyze = async (sheetId: string) => {
    setAnalyzing(true);
    try {
      await analyzeSheet(sheetId);
      toast({ title: "Folha analisada", description: "Elementos extraídos pela Axia." });
      await Promise.all([refreshSheets(), refreshElements(), refreshHistory()]);
    } catch (e: any) {
      toast({
        title: "Erro na análise",
        description: e?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeAll = async () => {
    for (const s of sheets) {
      if (s.image_path && s.status !== "approved") {
        await handleAnalyze(s.id);
      }
    }
  };

  const handleAutoFix = async () => {
    if (!activeSheetId) return;
    setAnalyzing(true);
    try {
      const res = await autoFixSheet(activeSheetId);
      toast({ title: "Auto-fix aplicado", description: `${res.fixed} correções.` });
      await refreshElements();
    } catch (e: any) {
      toast({ title: "Erro no Auto-fix", description: e?.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApproveAll = async () => {
    if (!activeSheetId) return;
    const n = await approveAllPendingForSheet(activeSheetId);
    toast({ title: "Aprovados", description: `${n} elementos aprovados.` });
    await refreshElements();
  };

  const approvedCount = allElements.filter((e) => e.status === "approved").length;
  const canExport = approvedCount > 0;

  // Selector view when no obra is chosen
  if (!obraId) {
    return (
      <AppLayout title="Planta & Quantitativos" subtitle="Leitura assistida pela Axia">
        <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Planta & Quantitativos</h1>
              <p className="text-sm text-muted-foreground">
                Selecione uma obra para carregar plantas, extrair quantitativos e enviar para orçamento.
              </p>
            </div>
          </div>

          <Card className="rounded-xl p-6 md:p-8 max-w-xl">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Selecionar obra
                </label>
                <Select value={obraId || ""} onValueChange={handleSelectObra}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha uma obra..." />
                  </SelectTrigger>
                  <SelectContent>
                    {obras?.length === 0 && (
                      <SelectItem value="__empty__" disabled>
                        Nenhuma obra disponível
                      </SelectItem>
                    )}
                    {obras?.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={() => navigate("/obras")}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Ir para Obras
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Planta & Quantitativos"
      subtitle={`Obra: ${obra?.nome || "—"} · Leitura assistida pela Axia`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/planta-leitura")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Mudar obra
          </Button>
          {obra && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/obras/${obraId}`)}>
              <Building2 className="h-4 w-4 mr-1" /> Ver obra
            </Button>
          )}
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> Planta & Quantitativos
            </h1>
            <p className="text-sm text-muted-foreground">
              Obra: <strong>{obra?.nome || "—"}</strong> · Leitura assistida pela Axia
            </p>
          </div>
          {files.length > 0 && (
            <select
              value={activeFileId || ""}
              onChange={(e) => {
                setActiveFileId(e.target.value);
                setActiveSheetId(null);
              }}
              className="text-sm border rounded-md px-3 py-2 bg-background"
            >
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.file_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {!activeFile ? (
          <PlantUploadZone onFile={handleUpload} uploading={uploading} progress={progress} />
        ) : (
          <>
            <PlantSummaryCards sheets={sheets} elements={allElements} />

            {/* Sheet selector */}
            <div className="flex flex-wrap gap-2">
              {sheets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSheetId(s.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    s.id === activeSheetId
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-muted"
                  }`}
                >
                  Folha {s.sheet_index} · {s.discipline || "?"} ·{" "}
                  {s.status === "pending"
                    ? "Por analisar"
                    : s.status === "processing"
                    ? "A analisar..."
                    : s.status === "low_confidence"
                    ? "Baixa confiança"
                    : s.status === "error"
                    ? "Erro"
                    : "OK"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
              {/* Viewer */}
              <Card className="rounded-xl overflow-hidden flex flex-col h-[calc(100vh-360px)] min-h-[500px]">
                <PlantViewerToolbar
                  fileName={activeFile.file_name}
                  sheetIndex={activeSheet?.sheet_index || 1}
                  totalSheets={activeFile.total_sheets}
                  scale={activeSheet?.scale || null}
                  syncing={analyzing || activeSheet?.status === "processing"}
                  showGrid={showGrid}
                  showPins={showPins}
                  onToggleGrid={() => setShowGrid((v) => !v)}
                  onTogglePins={() => setShowPins((v) => !v)}
                />
                <div className="flex-1">
                  <PlantViewer
                    imageUrl={imageUrl}
                    elements={sheetElements}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    showGrid={showGrid}
                    showPins={showPins}
                  />
                </div>
              </Card>

              {/* Review panel */}
              <Card className="rounded-xl flex flex-col h-[calc(100vh-360px)] min-h-[500px]">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Extração assistida</div>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        IA + Humano
                      </Badge>
                    </div>
                    {activeSheet?.confidence !== null && activeSheet?.confidence !== undefined && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Confiança</div>
                        <div className="text-lg font-semibold text-primary">
                          {Math.round((activeSheet.confidence || 0) * 100)}%
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    <div>{activeFile.file_name}</div>
                    <div>{format(new Date(activeFile.created_at), "dd MMM yyyy HH:mm", { locale: pt })}</div>
                    <div>
                      Folha {activeSheet?.sheet_index} · {activeSheet?.discipline || "—"} ·{" "}
                      {activeSheet?.floor_level || "—"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={handleApproveAll}>
                      Aprovar todos
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleAutoFix} disabled={analyzing}>
                      <Wand2 className="h-3.5 w-3.5 mr-1" /> Auto-fix
                    </Button>
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.dxf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(f);
                        }}
                      />
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <span>
                          <UploadIcon className="h-3.5 w-3.5 mr-1" /> Substituir
                        </span>
                      </Button>
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activeSheetId && handleAnalyze(activeSheetId)}
                      disabled={analyzing || !activeSheet?.image_path}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />{" "}
                      {sheetElements.length === 0 ? "Analisar" : "Reprocessar"}
                    </Button>
                    <Button size="sm" variant="ghost" className="col-span-2" onClick={handleAnalyzeAll} disabled={analyzing}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reprocessar todas as folhas
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="elements" className="flex-1 flex flex-col min-h-0">
                  <TabsList className="mx-3 mt-2">
                    <TabsTrigger value="elements">Elementos</TabsTrigger>
                    <TabsTrigger value="packages">Pacotes</TabsTrigger>
                    <TabsTrigger value="history">Histórico</TabsTrigger>
                  </TabsList>
                  <div className="flex-1 overflow-y-auto p-3">
                    <TabsContent value="elements" className="m-0">
                      <PlantElementsList
                        elements={sheetElements}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onChanged={refreshElements}
                      />
                    </TabsContent>
                    <TabsContent value="packages" className="m-0">
                      <PlantPackagesList elements={allElements} onChanged={refreshElements} />
                    </TabsContent>
                    <TabsContent value="history" className="m-0">
                      <PlantHistoryList logs={logs} reviews={reviews} />
                    </TabsContent>
                  </div>
                </Tabs>

                <div className="p-3 border-t">
                  <Button className="w-full" disabled={!canExport} onClick={() => setExportOpen(true)}>
                    <Send className="h-4 w-4 mr-2" /> Enviar para Orçamento ({approvedCount})
                  </Button>
                </div>
              </Card>
            </div>

            {exportOpen && (
              <PlantExportToBudgetModal
                open={exportOpen}
                onOpenChange={setExportOpen}
                file={activeFile}
                elements={allElements}
                onExported={(bid) => navigate(`/orcamentos/${bid}/ver`)}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
