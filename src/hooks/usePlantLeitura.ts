import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import * as pdfjs from "pdfjs-dist";
import type {
  PlantFile,
  PlantSheet,
  PlantElement,
  PlantReviewLog,
  PlantProcessingLog,
  PlantElementStatus,
  PlantReviewAction,
} from "@/types/planta-leitura";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export const MAX_PLANT_FILE_BYTES = 20 * 1024 * 1024;
export const ALLOWED_PLANT_EXTENSIONS = ["pdf", "dxf", "png", "jpg", "jpeg"];

export function validatePlantFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_PLANT_EXTENSIONS.includes(ext)) {
    return `Formato não suportado. Aceites: ${ALLOWED_PLANT_EXTENSIONS.join(", ").toUpperCase()}.`;
  }
  if (file.size > MAX_PLANT_FILE_BYTES) {
    return "O ficheiro excede o limite máximo de 20MB. Por favor, reduza o tamanho da planta ou carregue uma versão otimizada.";
  }
  return null;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function renderPdfPageToPngBlob(doc: pdfjs.PDFDocumentProxy, pageNum: number): Promise<Blob> {
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

export function usePlantFiles(obraId: string | undefined) {
  const [files, setFiles] = useState<PlantFile[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const { data } = await supabase
      .from("plant_files" as any)
      .select("*")
      .eq("obra_id", obraId)
      .order("created_at", { ascending: false });
    setFiles((data as any) || []);
    setLoading(false);
  }, [obraId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { files, loading, refresh };
}

export function usePlantUploadAndProcess(obraId: string | undefined) {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const upload = useCallback(
    async (file: File): Promise<PlantFile | null> => {
      const err = validatePlantFile(file);
      if (err) {
        toast({ title: "Ficheiro inválido", description: err, variant: "destructive" });
        return null;
      }
      if (!user || !organization?.id || !obraId) {
        toast({ title: "Erro", description: "Sessão inválida.", variant: "destructive" });
        return null;
      }
      setUploading(true);
      try {
        const orgId = organization.id;
        const ext = file.name.split(".").pop()!.toLowerCase();
        setProgress("A carregar ficheiro...");
        const baseId = crypto.randomUUID();
        const storagePath = `${orgId}/${baseId}/${file.name}`;
        const up = await supabase.storage.from("plant-files").upload(storagePath, file, { upsert: false });
        if (up.error) throw up.error;

        // Insert plant_file row
        const { data: pf, error: pfErr } = await supabase
          .from("plant_files" as any)
          .insert({
            organization_id: orgId,
            obra_id: obraId,
            uploaded_by: user.id,
            file_name: file.name,
            file_type: ext,
            file_size: file.size,
            storage_path: storagePath,
            status: "processing",
            total_sheets: 0,
          })
          .select()
          .single();
        if (pfErr) throw pfErr;
        const plantFile = pf as any as PlantFile;

        // Determine sheets
        if (ext === "pdf") {
          setProgress("A separar páginas do PDF...");
          const buf = await file.arrayBuffer();
          const doc = await pdfjs.getDocument({ data: buf }).promise;
          const totalPages = doc.numPages;
          await supabase
            .from("plant_files" as any)
            .update({ total_sheets: totalPages })
            .eq("id", plantFile.id);

          for (let i = 1; i <= totalPages; i++) {
            setProgress(`A processar folha ${i} de ${totalPages}...`);
            const blob = await renderPdfPageToPngBlob(doc, i);
            const imgPath = `${orgId}/${baseId}/page-${i}.png`;
            await supabase.storage.from("plant-files").upload(imgPath, blob, {
              contentType: "image/png",
              upsert: true,
            });
            await supabase.from("plant_sheets" as any).insert({
              plant_file_id: plantFile.id,
              organization_id: orgId,
              obra_id: obraId,
              sheet_index: i,
              sheet_name: `Folha ${i}`,
              image_path: imgPath,
              status: "pending",
            });
          }
        } else if (["png", "jpg", "jpeg"].includes(ext)) {
          await supabase
            .from("plant_files" as any)
            .update({ total_sheets: 1 })
            .eq("id", plantFile.id);
          await supabase.from("plant_sheets" as any).insert({
            plant_file_id: plantFile.id,
            organization_id: orgId,
            obra_id: obraId,
            sheet_index: 1,
            sheet_name: file.name,
            image_path: storagePath,
            status: "pending",
          });
        } else {
          // DXF - no image render in this phase
          await supabase
            .from("plant_files" as any)
            .update({ total_sheets: 1 })
            .eq("id", plantFile.id);
          await supabase.from("plant_sheets" as any).insert({
            plant_file_id: plantFile.id,
            organization_id: orgId,
            obra_id: obraId,
            sheet_index: 1,
            sheet_name: file.name,
            image_path: null,
            status: "pending",
          });
        }

        await supabase
          .from("plant_files" as any)
          .update({ status: "ready" })
          .eq("id", plantFile.id);

        toast({ title: "Ficheiro carregado", description: "Pronto para análise pela Axia." });
        setProgress("");
        return plantFile;
      } catch (e: any) {
        console.error(e);
        toast({ title: "Erro ao carregar", description: e.message || "Falha no upload.", variant: "destructive" });
        return null;
      } finally {
        setUploading(false);
      }
    },
    [user, organization, obraId, toast],
  );

  return { upload, uploading, progress };
}

export function usePlantSheets(plantFileId: string | undefined) {
  const [sheets, setSheets] = useState<PlantSheet[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!plantFileId) return;
    setLoading(true);
    const { data } = await supabase
      .from("plant_sheets" as any)
      .select("*")
      .eq("plant_file_id", plantFileId)
      .order("sheet_index");
    setSheets((data as any) || []);
    setLoading(false);
  }, [plantFileId]);

  useEffect(() => {
    refresh();
    if (!plantFileId) return;
    const ch = supabase
      .channel(`plant_sheets_${plantFileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plant_sheets", filter: `plant_file_id=eq.${plantFileId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [plantFileId, refresh]);

  return { sheets, loading, refresh };
}

export function usePlantElements(plantFileId: string | undefined, sheetId: string | undefined) {
  const [elements, setElements] = useState<PlantElement[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!plantFileId) return;
    setLoading(true);
    let q = supabase.from("plant_elements" as any).select("*").eq("plant_file_id", plantFileId);
    if (sheetId) q = q.eq("plant_sheet_id", sheetId);
    const { data } = await q.order("created_at");
    setElements((data as any) || []);
    setLoading(false);
  }, [plantFileId, sheetId]);

  useEffect(() => {
    refresh();
    if (!plantFileId) return;
    const ch = supabase
      .channel(`plant_elements_${plantFileId}_${sheetId || "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plant_elements", filter: `plant_file_id=eq.${plantFileId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [plantFileId, sheetId, refresh]);

  return { elements, loading, refresh };
}

export function useAllPlantElements(plantFileId: string | undefined) {
  return usePlantElements(plantFileId, undefined);
}

export function useSignedImageUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage
      .from("plant-files")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl || null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

export async function analyzeSheet(sheetId: string) {
  const { data, error } = await supabase.functions.invoke("plant-leitura-analyze", {
    body: { plant_sheet_id: sheetId },
  });
  if (error) throw error;
  return data;
}

export async function autoFixSheet(sheetId: string) {
  const { data, error } = await supabase.functions.invoke("plant-leitura-autofix", {
    body: { plant_sheet_id: sheetId },
  });
  if (error) throw error;
  return data;
}

export async function reviewElement(
  elementId: string,
  action: PlantReviewAction,
  newValues?: Partial<PlantElement>,
  notes?: string,
) {
  const { data: cur } = await supabase
    .from("plant_elements" as any)
    .select("*")
    .eq("id", elementId)
    .single();
  if (!cur) throw new Error("Elemento não encontrado.");

  const newStatus: PlantElementStatus =
    action === "approve" ? "approved" : action === "ignore" ? "ignored" : action === "reset" ? "ok" : "edited";

  const update: any = { status: newStatus };
  if (action === "approve") {
    const { data: u } = await supabase.auth.getUser();
    update.approved_by = u.user?.id;
    update.approved_at = new Date().toISOString();
  }
  if (newValues) Object.assign(update, newValues);

  await supabase.from("plant_elements" as any).update(update).eq("id", elementId);
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("plant_element_reviews" as any).insert({
    plant_element_id: elementId,
    organization_id: (cur as any).organization_id,
    reviewed_by: u.user!.id,
    action,
    old_value_json: cur,
    new_value_json: { ...(cur as any), ...update },
    notes: notes || null,
  });
}

export async function approveAllPendingForSheet(sheetId: string) {
  const { data } = await supabase
    .from("plant_elements" as any)
    .select("id")
    .eq("plant_sheet_id", sheetId)
    .in("status", ["ok", "review"]);
  const ids = ((data as any) || []).map((r: any) => r.id);
  for (const id of ids) await reviewElement(id, "approve");
  return ids.length;
}

export function usePlantHistory(plantFileId: string | undefined) {
  const [logs, setLogs] = useState<PlantProcessingLog[]>([]);
  const [reviews, setReviews] = useState<PlantReviewLog[]>([]);

  const refresh = useCallback(async () => {
    if (!plantFileId) return;
    const [{ data: l }, { data: r }] = await Promise.all([
      supabase
        .from("plant_processing_logs" as any)
        .select("*")
        .eq("plant_file_id", plantFileId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("plant_element_reviews" as any)
        .select("*, plant_elements!inner(plant_file_id)")
        .eq("plant_elements.plant_file_id", plantFileId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setLogs((l as any) || []);
    setReviews((r as any) || []);
  }, [plantFileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logs, reviews, refresh };
}

export async function exportToBudget(args: {
  plant_file_id: string;
  obra_id: string;
  target: "new" | "existing";
  budget_id?: string;
  budget_name?: string;
  cliente_id?: string;
}) {
  const { data, error } = await supabase.functions.invoke("plant-leitura-export-budget", { body: args });
  if (error) throw error;
  return data;
}
