/**
 * Annotation canvas — draws annotations and handles pointer input.
 * No external dependencies; uses canvas 2D and store actions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState, useStartPath, useAppendPath, useEndPath, useStartShape, useResizeShape, useEndShape, useAddTextAnnotation } from '../core/store';
import { getCursorForTool } from '../core/cursors';
import type { Annotation, Point } from '../core/types';

interface AnnotationCanvasProps {
  pageIndex: number;
  widthPx: number;
  heightPx: number;
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  pageW: number,
  pageH: number
): void {
  if (ann.type === 'path') {
    const { points, color, strokeWidth, opacity = 1 } = ann;
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = Math.max(1, strokeWidth * pageW);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0]!.x * pageW, points[0]!.y * pageH);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x * pageW, points[i]!.y * pageH);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (ann.type === 'shape') {
    const { x, y, width, height, color, strokeWidth, shape } = ann;
    const nx = width >= 0 ? x : x + width;
    const ny = height >= 0 ? y : y + height;
    const nw = Math.abs(width);
    const nh = Math.abs(height);
    const px = nx * pageW;
    const py = ny * pageH;
    const pw = nw * pageW;
    const ph = nh * pageH;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, strokeWidth * pageW);
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
      const startX = (width >= 0 ? x : x + width) * pageW;
      const startY = (height >= 0 ? y : y + height) * pageH;
      const endX = (width >= 0 ? x + width : x) * pageW;
      const endY = (height >= 0 ? y + height : y) * pageH;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      const angle = Math.atan2(endY - startY, endX - startX);
      const headLen = Math.min(15, Math.hypot(endX - startX, endY - startY) * 0.2);
      ctx.lineTo(endX - headLen * Math.cos(angle - 0.4), endY - headLen * Math.sin(angle - 0.4));
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - headLen * Math.cos(angle + 0.4), endY - headLen * Math.sin(angle + 0.4));
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

function hitTest(ann: Annotation, point: Point, pageW: number, pageH: number): boolean {
  const px = point.x * pageW;
  const py = point.y * pageH;
  if (ann.type === 'path') {
    const tol = 8;
    for (let i = 0; i < ann.points.length; i++) {
      const x = ann.points[i]!.x * pageW;
      const y = ann.points[i]!.y * pageH;
      if (Math.hypot(px - x, py - y) < tol) return true;
    }
    return false;
  }
  if (ann.type === 'shape') {
    const nx = ann.width >= 0 ? ann.x : ann.x + ann.width;
    const ny = ann.height >= 0 ? ann.y : ann.y + ann.height;
    const nw = Math.abs(ann.width);
    const nh = Math.abs(ann.height);
    const x = nx * pageW;
    const y = ny * pageH;
    const w = nw * pageW;
    const h = nh * pageH;
    if (ann.shape === 'rectangle') return px >= x && px <= x + w && py >= y && py <= y + h;
    if (ann.shape === 'circle') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.sqrt(w * w + h * h) / 2;
      return Math.hypot(px - cx, py - cy) <= r;
    }
    if (ann.shape === 'arrow') {
      const tol = 10;
      const sx = (ann.width >= 0 ? ann.x : ann.x + ann.width) * pageW;
      const sy = (ann.height >= 0 ? ann.y : ann.y + ann.height) * pageH;
      const ex = (ann.width >= 0 ? ann.x + ann.width : ann.x) * pageW;
      const ey = (ann.height >= 0 ? ann.y + ann.height : ann.y) * pageH;
      const d = Math.hypot(ex - sx, ey - sy);
      if (d === 0) return Math.hypot(px - sx, py - sy) < tol;
      const t = Math.max(0, Math.min(1, ((px - sx) * (ex - sx) + (py - sy) * (ey - sy)) / (d * d)));
      const projX = sx + t * (ex - sx);
      const projY = sy + t * (ey - sy);
      return Math.hypot(px - projX, py - projY) < tol;
    }
  }
  if (ann.type === 'text') {
    const x = ann.x * pageW;
    const y = ann.y * pageH;
    const fontPx = ann.fontSize * pageH;
    const approxW = ann.text.length * fontPx * 0.6;
    return px >= x && px <= x + approxW && py >= y - fontPx && py <= y + fontPx;
  }
  return false;
}

export function AnnotationCanvas({ pageIndex, widthPx, heightPx }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<Point>({ x: 0, y: 0 });

  const { state, dispatch } = useAppState();
  const annotations = state.annotations.filter((a) => a.pageIndex === pageIndex);
  const tool = state.tool;
  const startPath = useStartPath();
  const appendPath = useAppendPath();
  const endPath = useEndPath();
  const startShape = useStartShape();
  const resizeShape = useResizeShape();
  const endShape = useEndShape();
  const addText = useAddTextAnnotation();

  const toRelative = useCallback(
    (e: React.PointerEvent): Point => ({
      x: (e.clientX - (containerRef.current?.getBoundingClientRect().left ?? 0)) / widthPx,
      y: (e.clientY - (containerRef.current?.getBoundingClientRect().top ?? 0)) / heightPx,
    }),
    [widthPx, heightPx]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || widthPx <= 0 || heightPx <= 0) return;
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, widthPx, heightPx);
    for (const ann of annotations) drawAnnotation(ctx, ann, widthPx, heightPx);
  }, [annotations, widthPx, heightPx]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const point = toRelative(e);
      if (tool === 'pen' || tool === 'highlighter') {
        startPath(pageIndex, point);
      } else if (tool === 'rectangle' || tool === 'circle' || tool === 'arrow') {
        shapeStartRef.current = point;
        startShape(pageIndex, point.x, point.y);
      } else if (tool === 'eraser') {
        const hit = [...annotations].reverse().find((a) => hitTest(a, point, widthPx, heightPx));
        if (hit) dispatch({ type: 'DELETE_ANNOTATION', payload: hit.id });
      }
    },
    [tool, pageIndex, toRelative, startPath, startShape, annotations, widthPx, heightPx, dispatch]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const point = toRelative(e);
      if (state.currentPathId) appendPath(point);
      if (state.currentShapeId) {
        const start = shapeStartRef.current;
        resizeShape(point.x - start.x, point.y - start.y);
      }
    },
    [state.currentPathId, state.currentShapeId, toRelative, appendPath, resizeShape]
  );

  const onPointerUp = useCallback(() => {
    endPath();
    endShape();
  }, [endPath, endShape]);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (tool !== 'text') return;
      const point = toRelative(e as unknown as React.PointerEvent);
      setTextInput({ x: point.x, y: point.y });
    },
    [tool, toRelative]
  );

  const submitText = useCallback(
    (text: string) => {
      if (textInput) {
        addText(pageIndex, textInput.x, textInput.y, text);
        setTextInput(null);
      }
    },
    [pageIndex, textInput, addText]
  );

  const cursor = getCursorForTool(tool);
  const pointerEvents = tool !== 'select' ? 'auto' : 'none';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: widthPx,
        height: heightPx,
        pointerEvents,
        cursor,
        userSelect: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
      {textInput && (
        <div
          style={{
            position: 'absolute',
            left: textInput.x * widthPx,
            top: textInput.y * heightPx,
            background: '#fff',
            border: '2px solid #2563eb',
            borderRadius: 6,
            padding: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10,
          }}
        >
          <input
            ref={textInputRef}
            autoFocus
            type="text"
            placeholder="Type text..."
            style={{ border: 'none', outline: 'none', fontSize: 16, minWidth: 120 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = textInputRef.current?.value?.trim();
                if (v) submitText(v);
                setTextInput(null);
              }
              if (e.key === 'Escape') setTextInput(null);
            }}
            onBlur={() => setTextInput(null)}
          />
        </div>
      )}
    </div>
  );
}
