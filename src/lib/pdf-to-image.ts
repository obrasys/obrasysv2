import * as pdfjs from 'pdfjs-dist';

// Ensure worker is configured (same CDN as usePdfRenderer)
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
}

/**
 * Renders the first page of a PDF File into a PNG Blob.
 * Used to convert architectural plans uploaded as PDF into images that the
 * Axia vision gateway (Gemini) can consume.
 */
export async function renderPdfFirstPageToPngBlob(file: File, scale = 2): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível criar canvas para renderizar o PDF.');
    (ctx as any).imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) throw new Error('Falha ao converter PDF para PNG.');
    return blob;
  } finally {
    try { await doc.destroy(); } catch { /* ignore */ }
  }
}
