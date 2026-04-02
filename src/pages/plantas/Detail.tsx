import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { PlanViewer } from "@/components/plantas/PlanViewer";
import { PlanCalibrationTool } from "@/components/plantas/PlanCalibrationTool";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Image, Loader2 } from "lucide-react";
import { usePlanImports } from "@/hooks/usePlanImports";
import { usePlanCalibration } from "@/hooks/usePlanCalibration";
import { usePdfRenderer } from "@/hooks/usePdfRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function PlanDetail() {
  const { id: obraId, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();

  // Get plan data
  const { plans, isLoading: plansLoading } = usePlanImports(obraId);
  const plan = plans.find((p) => p.id === planId);

  // Get file URL
  const fileUrlQuery = useQuery({
    queryKey: ["plan-file-url", plan?.file_path],
    queryFn: async () => {
      if (!plan?.file_path) return null;
      const { data } = await supabase.storage
        .from("plan-files")
        .createSignedUrl(plan.file_path, 3600);
      return data?.signedUrl ?? null;
    },
    enabled: !!plan?.file_path,
  });

  // PDF renderer (only for PDFs)
  const isPdf = plan?.file_type === "pdf";
  const { dimensions, isRendering, imageDataUrl } = usePdfRenderer({
    url: isPdf ? fileUrlQuery.data ?? null : null,
  });

  // For images, use URL directly
  const imageUrl = !isPdf ? fileUrlQuery.data : null;
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Load image dimensions for non-PDF
  const imageQuery = useQuery({
    queryKey: ["plan-image-dim", imageUrl],
    queryFn: () =>
      new Promise<{ width: number; height: number; dataUrl: string }>((resolve) => {
        if (!imageUrl) return resolve({ width: 0, height: 0, dataUrl: "" });
        const img = new window.Image();
        img.onload = () => resolve({ width: img.width, height: img.height, dataUrl: imageUrl });
        img.src = imageUrl;
      }),
    enabled: !!imageUrl,
  });

  const effectiveImageUrl = isPdf ? imageDataUrl : imageQuery.data?.dataUrl ?? null;
  const effectiveDimensions = isPdf
    ? dimensions
    : { width: imageQuery.data?.width ?? 0, height: imageQuery.data?.height ?? 0 };

  // Calibration
  const { calibration, saveCalibration } = usePlanCalibration(planId);
  const [mode, setMode] = useState<"view" | "calibrate">("view");
  const [calibrationPoints, setCalibrationPoints] = useState<Array<{ x: number; y: number }>>([]);

  const handleCalibrationClick = useCallback(
    (point: { x: number; y: number }) => {
      if (calibrationPoints.length < 2) {
        setCalibrationPoints((prev) => [...prev, point]);
      }
    },
    [calibrationPoints.length]
  );

  const handleStartCalibration = () => {
    setMode("calibrate");
    setCalibrationPoints([]);
  };

  const handleResetCalibration = () => {
    setMode("view");
    setCalibrationPoints([]);
  };

  const handleSaveCalibration = async (realDistance: number, unidade: string) => {
    if (calibrationPoints.length !== 2) return;
    await saveCalibration.mutateAsync({
      point1: calibrationPoints[0],
      point2: calibrationPoints[1],
      realDistance,
      unidade,
    });
    setMode("view");
    setCalibrationPoints([]);
  };

  if (plansLoading || fileUrlQuery.isLoading) {
    return (
      <AppLayout title="Planta">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!plan) {
    return (
      <AppLayout title="Planta não encontrada">
        <div className="text-center py-16">
          <p className="text-muted-foreground">Planta não encontrada.</p>
          <Button className="mt-4" onClick={() => navigate(`/obras/${obraId}/plantas`)}>
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={plan.nome_ficheiro} subtitle={`Rev. ${plan.revision_number}`}>
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/obras/${obraId}/plantas`)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Plantas
            </Button>
            <div className="flex items-center gap-2">
              {isPdf ? <FileText className="w-4 h-4 text-destructive" /> : <Image className="w-4 h-4 text-primary" />}
              <span className="text-sm font-medium">{plan.nome_ficheiro}</span>
              <Badge variant="secondary" className="text-[10px]">Rev. {plan.revision_number}</Badge>
            </div>
          </div>
        </div>

        {/* Main content: Viewer + Side panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          {/* Viewer */}
          <PlanViewer
            imageDataUrl={effectiveImageUrl}
            dimensions={effectiveDimensions}
            isRendering={isRendering || imageQuery.isLoading}
            mode={mode}
            calibrationPoints={calibrationPoints}
            onCalibrationClick={handleCalibrationClick}
            pixelsPerMeter={calibration?.pixels_per_meter}
          />

          {/* Side panel */}
          <div className="space-y-4">
            <PlanCalibrationTool
              points={calibrationPoints}
              isCalibrating={mode === "calibrate"}
              onStartCalibration={handleStartCalibration}
              onSaveCalibration={handleSaveCalibration}
              onReset={handleResetCalibration}
              currentCalibration={calibration}
              isSaving={saveCalibration.isPending}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
