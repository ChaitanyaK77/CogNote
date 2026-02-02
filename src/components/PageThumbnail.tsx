/**
 * Renders a small PDF page thumbnail or blank placeholder.
 */

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

const THUMB_MAX_W = 120;
const THUMB_MAX_H = 156;

interface PageThumbnailProps {
  pdfDoc: PDFDocumentProxy | null;
  pageNumber: number | null;
  isBlank: boolean;
  index: number;
  aspectRatio: string;
}

export function PageThumbnail({ pdfDoc, pageNumber, isBlank, index, aspectRatio }: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(!isBlank && !!pdfDoc);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isBlank || !pdfDoc || pageNumber == null) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => { setLoading(true); setError(false); });
    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;
        const fullViewport = page.getViewport({ scale: 1 });
        const thumbScale = Math.min(THUMB_MAX_W / fullViewport.width, THUMB_MAX_H / fullViewport.height, 0.28);
        const thumbViewport = page.getViewport({ scale: thumbScale });
        const w = Math.round(thumbViewport.width);
        const h = Math.round(thumbViewport.height);
        const canvas = canvasRef.current;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({
          canvasContext: ctx,
          canvas,
          viewport: thumbViewport,
        }).promise;
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNumber, isBlank]);

  if (isBlank) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio,
          maxHeight: THUMB_MAX_H,
          background: 'rgba(30,41,59,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: '#64748b',
        }}
      >
        Blank
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        aspectRatio,
        maxHeight: THUMB_MAX_H,
        background: 'rgba(15,52,96,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {loading && !error && (
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>…</span>
      )}
      {error && (
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{index + 1}</span>
      )}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.15s',
        }}
      />
    </div>
  );
}
