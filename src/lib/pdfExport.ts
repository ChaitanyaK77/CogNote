/**
 * Export PDF with annotations burned in using smooth rendering
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import getStroke from 'perfect-freehand';
import type { Annotation, Point } from '../core/types';

function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]!;
      acc.push(x0!, y0!, (x0! + x1!) / 2, (y0! + y1!) / 2);
      return acc;
    },
    ['M', ...stroke[0]!, 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

function getPenOptionsForExport(strokeWidth: number) {
  const size = Math.max(2, Math.min(8, 2 + strokeWidth * 1200));
  return {
    size,
    thinning: 0.5,
    smoothing: 0.6,
    streamline: 0.6,
    simulatePressure: true,
  };
}

function getHighlighterOptionsForExport(strokeWidth: number) {
  const size = Math.max(14, Math.min(42, 12 + strokeWidth * 3500));
  return {
    size,
    thinning: 0,
    smoothing: 0.7,
    streamline: 0.65,
    simulatePressure: false,
  };
}

export async function exportPdfWithAnnotations(
  pdfDoc: PDFDocumentProxy,
  annotations: Annotation[],
  fileName: string
): Promise<void> {
  // Create a temporary canvas for each page with annotations
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  let firstPage = true;
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 }); // High quality export
    
    // Create canvas for PDF page
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    const dpr = 2;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    ctx.scale(dpr, dpr);

    // Render PDF page
    await page.render({
      canvasContext: ctx,
      canvas,
      viewport,
    }).promise;

    // Draw annotations for this page
    const pageAnnotations = annotations.filter((a) => a.pageIndex === pageNum - 1);
    for (const ann of pageAnnotations) {
      drawAnnotationOnCanvas(ctx, ann, viewport.width, viewport.height);
    }

    // Convert to image and add to PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    if (!firstPage) {
      pdf.addPage();
    }
    firstPage = false;

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgAspect = viewport.width / viewport.height;
    const pdfAspect = pdfWidth / pdfHeight;

    let renderWidth = pdfWidth;
    let renderHeight = pdfHeight;
    if (imgAspect > pdfAspect) {
      renderHeight = pdfWidth / imgAspect;
    } else {
      renderWidth = pdfHeight * imgAspect;
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, renderWidth, renderHeight);
  }

  // Download
  pdf.save(fileName.replace('.pdf', '_annotated.pdf'));
}

/** Export only the current page (with annotations) as PDF */
export async function exportCurrentPageAsPdf(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number,
  annotations: Annotation[],
  fileName: string
): Promise<void> {
  const pageNum = pageIndex + 1;
  if (pageNum < 1 || pageNum > pdfDoc.numPages) return;
  const { jsPDF } = await import('jspdf');
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = 2;
  canvas.width = viewport.width * dpr;
  canvas.height = viewport.height * dpr;
  ctx.scale(dpr, dpr);
  await page.render({
    canvasContext: ctx,
    canvas,
    viewport,
  }).promise;
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);
  for (const ann of pageAnnotations) {
    drawAnnotationOnCanvas(ctx, ann, viewport.width, viewport.height);
  }
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: viewport.width > viewport.height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [viewport.width, viewport.height],
  });
  pdf.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height);
  const base = fileName.replace(/\.pdf$/i, '');
  pdf.save(`${base}_page${pageNum}.pdf`);
}

function drawAnnotationOnCanvas(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  pageW: number,
  pageH: number
): void {
  if (ann.type === 'path') {
    const { points, color, opacity = 1, tool, strokeWidth } = ann;
    if (points.length < 2) return;
    
    const inputPoints = points.map((p: Point) => [p.x * pageW, p.y * pageH, 1] as [number, number, number]);
    
    const options = tool === 'pen' ? getPenOptionsForExport(strokeWidth) : getHighlighterOptionsForExport(strokeWidth);
    const stroke = getStroke(inputPoints, options);
    const pathData = getSvgPathFromStroke(stroke);
    const path = new Path2D(pathData);
    
    ctx.fillStyle = color;
    const drawOpacity = tool === 'highlighter' ? Math.min(opacity, 0.32) : opacity;
    ctx.globalAlpha = drawOpacity;
    ctx.fill(path);
    ctx.globalAlpha = 1;
  } else if (ann.type === 'shape') {
    const { x, y, width, height, color, shape } = ann;
    const nx = width >= 0 ? x : x + width;
    const ny = height >= 0 ? y : y + height;
    const nw = Math.abs(width);
    const nh = Math.abs(height);
    const px = nx * pageW;
    const py = ny * pageH;
    const pw = nw * pageW;
    const ph = nh * pageH;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.min(4, Math.max(1.5, (pageW + pageH) / 400));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (shape === 'rectangle') {
      ctx.strokeRect(px, py, pw, ph);
    } else if (shape === 'circle') {
      const cx = px + pw / 2;
      const cy = py + ph / 2;
      const r = Math.sqrt(pw * pw + ph * ph) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape === 'arrow') {
      const startX = x * pageW;
      const startY = y * pageH;
      const endX = (x + width) * pageW;
      const endY = (y + height) * pageH;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      const angle = Math.atan2(endY - startY, endX - startX);
      const headLen = Math.min(15, Math.hypot(endX - startX, endY - startY) * 0.2);
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
  } else if (ann.type === 'text') {
    const { x, y, text, color, fontSize } = ann;
    const px = x * pageW;
    const py = y * pageH;
    const fontPx = fontSize * pageH;
    ctx.fillStyle = color;
    ctx.font = `${fontPx}px sans-serif`;
    ctx.fillText(text, px, py + fontPx);
  }
}
