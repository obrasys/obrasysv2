import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface UsePdfRendererOptions {
  url: string | null;
  page?: number;
  scale?: number;
}

export function usePdfRenderer({ url, page = 1, scale = 1.5 }: UsePdfRendererOptions) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [totalPages, setTotalPages] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  const renderPage = useCallback(async (pageNum: number, renderScale: number) => {
    if (!pdfDocRef.current) return;
    setIsRendering(true);
    try {
      const pdfPage = await pdfDocRef.current.getPage(pageNum);
      const viewport = pdfPage.getViewport({ scale: renderScale });

      // Use an offscreen canvas — no DOM element needed
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      setDimensions({ width: viewport.width, height: viewport.height });
      setImageDataUrl(canvas.toDataURL());
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
