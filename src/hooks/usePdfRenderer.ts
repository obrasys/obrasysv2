import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface UsePdfRendererOptions {
  url: string | null;
  page?: number;
  /**
   * Base scale. Will be multiplied by devicePixelRatio (clamped 1..4) for retina sharpness.
   * Default raised to 2.5 (from 1.5) to deliver visibly sharper plans on the canvas.
   */
  scale?: number;
}

export function usePdfRenderer({ url, page = 1, scale = 2.5 }: UsePdfRendererOptions) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [totalPages, setTotalPages] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  const renderPage = useCallback(async (pageNum: number, baseScale: number) => {
    if (!pdfDocRef.current) return;
    setIsRendering(true);
    try {
      const dpr = typeof window !== "undefined" ? Math.min(Math.max(window.devicePixelRatio || 1, 1), 2) : 1;
      const effectiveScale = Math.min(baseScale * dpr, 4);

      const pdfPage = await pdfDocRef.current.getPage(pageNum);
      const viewport = pdfPage.getViewport({ scale: effectiveScale });

      // Use an offscreen canvas — no DOM element needed
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Maximize quality of any internal smoothing during rasterization
      (ctx as any).imageSmoothingEnabled = true;
      (ctx as any).imageSmoothingQuality = "high";

      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      setDimensions({ width: viewport.width, height: viewport.height });
      // PNG = lossless; ideal for Axia visual analysis
      setImageDataUrl(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("PDF render error:", err);
    } finally {
      setIsRendering(false);
    }
  }, []);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;

    const loadPdf = async () => {
      setIsRendering(true);
      try {
        const doc = await pdfjs.getDocument(url).promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        await renderPage(page, scale);
      } catch (err) {
        console.error("PDF load error:", err);
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [url, page, scale, renderPage]);

  return {
    dimensions,
    totalPages,
    isRendering,
    imageDataUrl,
    renderPage,
  };
}
