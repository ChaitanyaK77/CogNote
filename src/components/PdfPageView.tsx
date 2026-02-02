/**
 * Single page view — PDF.js canvas render + annotation overlay.
 */

import { memo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';
import { SmoothAnnotationCanvas } from './SmoothAnnotationCanvas';
import { PageLayoutOverlay } from './PageLayoutOverlay';
import type { PageLayout } from '../core/store';

interface PdfPageViewProps {
  pdfDoc: PDFDocumentProxy | null;
  pageNumber: number;
  widthPx: number;
  heightPx: number;
  pageIndex: number;
  zoom: number;
  pageLayout: PageLayout;
}

function PdfPageViewInner({
  pdfDoc,
  pageNumber,
  widthPx,
  heightPx,
  pageIndex,
  zoom,
  pageLayout,
}: PdfPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const w = Math.round(widthPx * zoom);
  const h = Math.round(heightPx * zoom);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => { setLoading(true); setError(null); });
    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        const scale = zoom;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Render at device pixel ratio for crisp display
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        ctx.scale(dpr, dpr);
        
        await page.render({
          canvasContext: ctx,
          canvas,
          viewport,
        }).promise;
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to render page');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, zoom]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        width: w,
        height: h,
        marginBottom: 24,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,169,98,0.08)',
        background: '#fff',
        borderRadius: 4,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: w,
          height: h,
          pointerEvents: 'none',
        }}
      />
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10,10,10,0.7)',
            fontSize: 14,
            fontWeight: 600,
            color: '#a3a3a3',
          }}
        >
          Loading…
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(180,80,80,0.2)',
            fontSize: 14,
            fontWeight: 600,
            color: '#e88',
          }}
        >
          {error}
        </div>
      )}
      <PageLayoutOverlay layout={pageLayout} widthPx={w} heightPx={h} />
      <SmoothAnnotationCanvas pageIndex={pageIndex} widthPx={w} heightPx={h} />
    </div>
  );
}

export const PdfPageView = memo(PdfPageViewInner);
