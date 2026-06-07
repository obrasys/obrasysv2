import * as pdfjs from 'pdfjs-dist';

// Ensure worker is configured (same CDN as usePdfRenderer)
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
}

async function renderPageToBlob(doc: any, pageNum: number, scale: number): Promise<Blob> {
  const page = await doc.getPage(pageNum);
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
}

/**
 * Renders the first page of a PDF File into a PNG Blob.
 */
export async function renderPdfFirstPageToPngBlob(file: File, scale = 2): Promise<Blob> {
  return renderPdfPageToPngBlob(file, 1, scale);
}

/**
 * Renders a specific page (1-indexed) of a PDF File into a PNG Blob.
 */
export async function renderPdfPageToPngBlob(file: File, pageNum: number, scale = 2): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  try {
    return await renderPageToBlob(doc, pageNum, scale);
  } finally {
    try { await doc.destroy(); } catch { /* ignore */ }
  }
}

/**
 * Returns the number of pages in a PDF File.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  try {
    return doc.numPages;
  } finally {
    try { await doc.destroy(); } catch { /* ignore */ }
  }
}

/**
 * Renders thumbnails for all (or selected) pages of a PDF File.
 * Returns array of { pageNum, dataUrl } for quick previews.
 */
export async function renderPdfThumbnails(
  file: File,
  opts: { scale?: number; pages?: number[] } = {},
): Promise<Array<{ pageNum: number; dataUrl: string }>> {
  const { scale = 0.4, pages } = opts;
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  try {
    const list = pages ?? Array.from({ length: doc.numPages }, (_, i) => i + 1);
    const out: Array<{ pageNum: number; dataUrl: string }> = [];
    for (const n of list) {
      const blob = await renderPageToBlob(doc, n, scale);
      const dataUrl = await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.readAsDataURL(blob);
      });
      out.push({ pageNum: n, dataUrl });
    }
    return out;
  } finally {
    try { await doc.destroy(); } catch { /* ignore */ }
  }
}
