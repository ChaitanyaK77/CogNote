/**
 * PDF loading via pdfjs-dist — reliable open and page dimensions.
 */

import * as pdfjsLib from 'pdfjs-dist';
const POINTS_TO_PX = 96 / 72;

export interface PageBox {
  widthPt: number;
  heightPt: number;
  widthPx: number;
  heightPx: number;
}

export interface PDFLoadResult {
  doc: pdfjsLib.PDFDocumentProxy;
  pageCount: number;
  pageBoxes: PageBox[];
}

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(pdfjsLib as { version?: string }).version ?? '5'}/build/pdf.worker.min.mjs`;

export async function loadPdfFromArrayBuffer(buffer: ArrayBuffer): Promise<PDFLoadResult> {
  // Use a copy so pdfjs never receives a detached ArrayBuffer (e.g. after transfer)
  let data: ArrayBuffer;
  try {
    if (buffer.byteLength === 0) {
      data = buffer;
    } else {
      data = new ArrayBuffer(buffer.byteLength);
      new Uint8Array(data).set(new Uint8Array(buffer));
    }
  } catch {
    data = buffer;
  }
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  const pageBoxes: PageBox[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const widthPt = viewport.width;
    const heightPt = viewport.height;
    pageBoxes.push({
      widthPt,
      heightPt,
      widthPx: Math.round(widthPt * POINTS_TO_PX),
      heightPx: Math.round(heightPt * POINTS_TO_PX),
    });
  }

  return { doc, pageCount, pageBoxes };
}
