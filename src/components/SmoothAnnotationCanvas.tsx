/**
 * Professional smooth annotation canvas with perfect-freehand
 * Notability-quality pen strokes and tools
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import getStroke from 'perfect-freehand';
import { useAppState, useStartPath, useAppendPath, useEndPath, useStartShape, useResizeShape, useEndShape } from '../core/store';
import { getCursorForTool } from '../core/cursors';
import { useTheme } from '../theme';
import type { Annotation, Point, ShapeAnnotation } from '../core/types';

function selectionBarBtn(theme: { text: { secondary: string } }): CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: theme.text.secondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}
function EraserIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H7L3 16a2 2 0 0 1 0-2.83L14.17 2a2 2 0 0 1 2.83 0L21 6.17a2 2 0 0 1 0 2.83L12 18" />
      <path d="M12 18l6-6" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function PasteIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}
function getAnnotationBounds(ann: Annotation, pageW: number, pageH: number): { x: number; y: number; w: number; h: number } {
  if (ann.type === 'path') {
    if (ann.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
    let minX = ann.points[0]!.x * pageW, maxX = minX, minY = ann.points[0]!.y * pageH, maxY = minY;
    for (const p of ann.points) {
      const px = p.x * pageW, py = p.y * pageH;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
    const pad = 8;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }
  if (ann.type === 'shape') {
    const nx = ann.width >= 0 ? ann.x : ann.x + ann.width;
    const ny = ann.height >= 0 ? ann.y : ann.y + ann.height;
    const nw = Math.abs(ann.width), nh = Math.abs(ann.height);
    const pad = 8;
    return { x: nx * pageW - pad, y: ny * pageH - pad, w: nw * pageW + pad * 2, h: nh * pageH + pad * 2 };
  }
  if (ann.type === 'text') {
    const fontPx = ann.fontSize * pageH;
    const approxW = ann.text.length * fontPx * 0.6;
    const pad = 6;
    return { x: ann.x * pageW - pad, y: ann.y * pageH - fontPx - pad, w: approxW + pad * 2, h: fontPx + pad * 2 };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

/** Bounds in normalized 0–1 coords for marquee intersection. */
function getAnnotationBoundsNorm(ann: Annotation): { x: number; y: number; w: number; h: number } {
  if (ann.type === 'path') {
    if (ann.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
    let minX = ann.points[0]!.x, maxX = minX, minY = ann.points[0]!.y, maxY = minY;
    for (const p of ann.points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const pad = 0.01;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }
  if (ann.type === 'shape') {
    const nx = ann.width >= 0 ? ann.x : ann.x + ann.width;
    const ny = ann.height >= 0 ? ann.y : ann.y + ann.height;
    const nw = Math.abs(ann.width), nh = Math.abs(ann.height);
    const pad = 0.01;
    return { x: nx - pad, y: ny - pad, w: nw + pad * 2, h: nh + pad * 2 };
  }
  if (ann.type === 'text') {
    const approxW = ann.text.length * ann.fontSize * 0.6;
    const pad = 0.008;
    return { x: ann.x - pad, y: ann.y - ann.fontSize - pad, w: approxW + pad * 2, h: ann.fontSize + pad * 2 };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

/** Union of annotation bounds in px. */
function getGroupBounds(anns: Annotation[], pageW: number, pageH: number): { x: number; y: number; w: number; h: number } {
  if (anns.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const first = getAnnotationBounds(anns[0]!, pageW, pageH);
  let minX = first.x, minY = first.y, maxX = first.x + first.w, maxY = first.y + first.h;
  for (let i = 1; i < anns.length; i++) {
    const b = getAnnotationBounds(anns[i]!, pageW, pageH);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function hitTestGroupHandle(
  point: Point,
  groupPx: { x: number; y: number; w: number; h: number },
  widthPx: number,
  heightPx: number,
  handleSizePx: number
): ResizeHandle | null {
  const px = point.x * widthPx;
  const py = point.y * heightPx;
  const hs = handleSizePx / 2;
  const corners: { handle: ResizeHandle; x: number; y: number }[] = [
    { handle: 'nw', x: groupPx.x, y: groupPx.y },
    { handle: 'ne', x: groupPx.x + groupPx.w, y: groupPx.y },
    { handle: 'sw', x: groupPx.x, y: groupPx.y + groupPx.h },
    { handle: 'se', x: groupPx.x + groupPx.w, y: groupPx.y + groupPx.h },
  ];
  for (const { handle, x, y } of corners) {
    if (Math.abs(px - x) <= hs && Math.abs(py - y) <= hs) return handle;
  }
  return null;
}

function getShapeCorners(shape: ShapeAnnotation): { nw: Point; ne: Point; sw: Point; se: Point } {
  const left = Math.min(shape.x, shape.x + shape.width);
  const right = Math.max(shape.x, shape.x + shape.width);
  const top = Math.min(shape.y, shape.y + shape.height);
  const bottom = Math.max(shape.y, shape.y + shape.height);
  return {
    nw: { x: left, y: top },
    ne: { x: right, y: top },
    sw: { x: left, y: bottom },
    se: { x: right, y: bottom },
  };
}

function hitResizeHandle(
  point: Point,
  shape: ShapeAnnotation,
  widthPx: number,
  heightPx: number,
  handleSizePx: number
): ResizeHandle | null {
  const corners = getShapeCorners(shape);
  const th = handleSizePx / widthPx;
  const tv = handleSizePx / heightPx;
  for (const [handle, corner] of Object.entries(corners) as [ResizeHandle, Point][]) {
    if (Math.abs(point.x - corner.x) <= th && Math.abs(point.y - corner.y) <= tv) return handle;
  }
  return null;
}

interface SmoothAnnotationCanvasProps {
  pageIndex: number;
  widthPx: number;
  heightPx: number;
}

// Convert perfect-freehand stroke to SVG path
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

// Pen — uniform stroke, no taper or pressure (dots and short strokes work)
function getPenOptions(strokeWidth: number) {
  const size = Math.max(2, Math.min(8, 2 + strokeWidth * 1200));
  return {
    size,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
    simulatePressure: false,
  };
}

// Highlighter — uniform stroke, no pointed ends
function getHighlighterOptions(strokeWidth: number) {
  const size = Math.max(14, Math.min(42, 12 + strokeWidth * 3500));
  return {
    size,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
    simulatePressure: false,
  };
}

// Highlighter drawn with this max opacity so underlying text stays readable
const HIGHLIGHTER_DRAW_OPACITY = 0.32;

function drawSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  opacity: number,
  isPen: boolean,
  strokeWidth: number,
  pageW: number,
  pageH: number
): void {
  if (points.length < 2) return;

  const inputPoints = points.map((p) => [p.x * pageW, p.y * pageH, 1] as [number, number, number]);

  const options = isPen ? getPenOptions(strokeWidth) : getHighlighterOptions(strokeWidth);
  const stroke = getStroke(inputPoints, options);
  const pathData = getSvgPathFromStroke(stroke);

  // Draw using Path2D for smooth rendering
  const path = new Path2D(pathData);
  ctx.fillStyle = color;
  // Highlighter: cap opacity so background text stays visible; pen uses full opacity
  const drawOpacity = isPen ? opacity : Math.min(opacity, HIGHLIGHTER_DRAW_OPACITY);
  ctx.globalAlpha = drawOpacity;
  ctx.fill(path);
  ctx.globalAlpha = 1;
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  pageW: number,
  pageH: number
): void {
  if (ann.type === 'path') {
    const { points, color, opacity = 1, tool, strokeWidth } = ann;
    drawSmoothPath(ctx, points, color, opacity, tool === 'pen', strokeWidth, pageW, pageH);
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
    ctx.setLineDash([]);
    
    if (shape === 'rectangle') {
      ctx.strokeRect(px, py, pw, ph);
    } else if (shape === 'circle') {
      const cx = px + pw / 2;
      const cy = py + ph / 2;
      const rx = Math.abs(pw) / 2;
      const ry = Math.abs(ph) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape === 'arrow') {
      // Always: start = click point (x,y), end = release point (x+width, y+height). Tip at end.
      const startX = x * pageW;
      const startY = y * pageH;
      const endX = (x + width) * pageW;
      const endY = (y + height) * pageH;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      const angle = Math.atan2(endY - startY, endX - startX);
      const headLen = Math.min(20, Math.hypot(endX - startX, endY - startY) * 0.3);
      
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLen * Math.cos(angle - Math.PI / 6),
        endY - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLen * Math.cos(angle + Math.PI / 6),
        endY - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
  } else if (ann.type === 'text') {
    const { x, y, text, color, fontSize } = ann;
    const px = x * pageW;
    const py = y * pageH;
    const fontPx = fontSize * pageH;
    ctx.fillStyle = color;
    ctx.font = `${fontPx}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(text, px, py + fontPx);
  }
}

// Distance from point (px,py) to line segment (x1,y1)-(x2,y2)
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / (len * len);
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function hitTest(ann: Annotation, point: Point, pageW: number, pageH: number): boolean {
  const px = point.x * pageW;
  const py = point.y * pageH;
  const baseTolerance = 16;

  if (ann.type === 'path') {
    const pts = ann.points;
    if (pts.length === 0) return false;
    const strokeTolerance = Math.max(baseTolerance, (ann.strokeWidth * Math.max(pageW, pageH)) + 8);
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i]!.x * pageW;
      const y = pts[i]!.y * pageH;
      if (Math.hypot(px - x, py - y) < strokeTolerance) return true;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = pts[i]!.x * pageW;
      const y1 = pts[i]!.y * pageH;
      const x2 = pts[i + 1]!.x * pageW;
      const y2 = pts[i + 1]!.y * pageH;
      if (distToSegment(px, py, x1, y1, x2, y2) <= strokeTolerance) return true;
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
    
    if (ann.shape === 'rectangle') {
      return px >= x - baseTolerance && px <= x + w + baseTolerance &&
             py >= y - baseTolerance && py <= y + h + baseTolerance;
    }
    if (ann.shape === 'circle') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.sqrt(w * w + h * h) / 2;
      return Math.hypot(px - cx, py - cy) <= r + baseTolerance;
    }
    if (ann.shape === 'arrow') {
      const x1 = ann.x * pageW;
      const y1 = ann.y * pageH;
      const x2 = (ann.x + ann.width) * pageW;
      const y2 = (ann.y + ann.height) * pageH;
      const lineTolerance = Math.max(baseTolerance, 22);
      if (distToSegment(px, py, x1, y1, x2, y2) <= lineTolerance) return true;
      // Hit test arrow head (tip at x2,y2)
      const headLen = Math.min(20, Math.hypot(x2 - x1, y2 - y1) * 0.3);
      if (Math.hypot(px - x2, py - y2) <= headLen + baseTolerance) return true;
      return false;
    }
  }

  if (ann.type === 'text') {
    const x = ann.x * pageW;
    const y = ann.y * pageH;
    const fontPx = ann.fontSize * pageH;
    const approxW = ann.text.length * fontPx * 0.6;
    return px >= x - baseTolerance && px <= x + approxW + baseTolerance &&
           py >= y - fontPx - baseTolerance && py <= y + fontPx + baseTolerance;
  }
  
  return false;
}

export function SmoothAnnotationCanvas({ pageIndex, widthPx, heightPx }: SmoothAnnotationCanvasProps) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shapeStartRef = useRef<Point>({ x: 0, y: 0 });
  const dragStartRef = useRef<Point | null>(null);
  const resizeRef = useRef<{
    annId: string;
    handle: ResizeHandle;
    startPoint: Point;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const groupResizeRef = useRef<{
    handle: ResizeHandle;
    startPoint: Point;
    startBoundsNorm: { x: number; y: number; w: number; h: number };
    centerX: number;
    centerY: number;
    ids: string[];
  } | null>(null);
  const [erasing, setErasing] = useState(false);
  const [marquee, setMarquee] = useState<{ start: Point; current: Point } | null>(null);

  const HANDLE_SIZE_PX = 10;

  const { state, dispatch } = useAppState();
  const annotations = state.annotations.filter((a) => a.pageIndex === pageIndex);
  const tool = state.tool;
  const selectedIds = state.selectedAnnotationIds;
  const selectedAnns = state.annotations.filter(
    (a) => a.pageIndex === pageIndex && selectedIds.includes(a.id)
  );
  const selectedAnn = selectedAnns.length === 1 ? selectedAnns[0]! : null;
  const clipboard = state.clipboard;
  const startPath = useStartPath();
  const appendPath = useAppendPath();
  const endPath = useEndPath();
  const startShape = useStartShape();
  const resizeShape = useResizeShape();
  const endShape = useEndShape();

  const toRelative = useCallback(
    (e: React.PointerEvent): Point => ({
      x: (e.clientX - (containerRef.current?.getBoundingClientRect().left ?? 0)) / widthPx,
      y: (e.clientY - (containerRef.current?.getBoundingClientRect().top ?? 0)) / heightPx,
    }),
    [widthPx, heightPx]
  );

  // Render all annotations + selection outlines + marquee (batched with rAF for smoothness)
  const drawRafRef = useRef<number | null>(null);
  useEffect(() => {
    if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    drawRafRef.current = requestAnimationFrame(() => {
      drawRafRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas || widthPx <= 0 || heightPx <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = widthPx * dpr;
      canvas.height = heightPx * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, widthPx, heightPx);

      for (const ann of annotations) {
        drawAnnotation(ctx, ann, widthPx, heightPx);
      }
    
    if (selectedAnns.length > 1) {
      const groupPx = getGroupBounds(selectedAnns, widthPx, heightPx);
      const { x, y, w, h } = groupPx;
      const r = 6;
      const hs = HANDLE_SIZE_PX / 2;
      ctx.save();
      ctx.shadowColor = theme.accent.glow;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = theme.accent.main;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);
      ctx.fillStyle = theme.bg.elevated;
      ctx.strokeStyle = theme.accent.main;
      ctx.lineWidth = 1.5;
      const corners = [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ];
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx - hs, cy - hs, HANDLE_SIZE_PX, HANDLE_SIZE_PX);
        ctx.strokeRect(cx - hs, cy - hs, HANDLE_SIZE_PX, HANDLE_SIZE_PX);
      }
    } else {
      for (const ann of selectedAnns) {
        const { x, y, w, h } = getAnnotationBounds(ann, widthPx, heightPx);
        const r = 6;
        ctx.save();
        ctx.shadowColor = theme.accent.glow;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = theme.accent.main;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);
      }
    }
    
    if (marquee) {
      const x0 = Math.min(marquee.start.x, marquee.current.x) * widthPx;
      const y0 = Math.min(marquee.start.y, marquee.current.y) * heightPx;
      const x1 = Math.max(marquee.start.x, marquee.current.x) * widthPx;
      const y1 = Math.max(marquee.start.y, marquee.current.y) * heightPx;
      ctx.save();
      ctx.strokeStyle = theme.accent.main;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = theme.accent.muted;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
    }
    // Resize handles for single selected shape
    if (selectedAnn?.type === 'shape') {
      const corners = getShapeCorners(selectedAnn);
      const hs = HANDLE_SIZE_PX / 2;
      ctx.fillStyle = theme.bg.elevated;
      ctx.strokeStyle = theme.accent.main;
      ctx.lineWidth = 1.5;
      for (const corner of Object.values(corners)) {
        const hx = corner.x * widthPx;
        const hy = corner.y * heightPx;
        ctx.fillRect(hx - hs, hy - hs, HANDLE_SIZE_PX, HANDLE_SIZE_PX);
        ctx.strokeRect(hx - hs, hy - hs, HANDLE_SIZE_PX, HANDLE_SIZE_PX);
      }
    }
    });
    return () => {
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    };
  }, [annotations, selectedAnns, selectedAnn, marquee, widthPx, heightPx, theme]);

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
        setErasing(true);
        const hit = [...annotations].reverse().find((a) => hitTest(a, point, widthPx, heightPx));
        if (hit) {
          dispatch({ type: 'DELETE_ANNOTATION', payload: hit.id });
        }
      } else if (tool === 'select') {
        if (selectedAnns.length > 1) {
          const groupPx = getGroupBounds(selectedAnns, widthPx, heightPx);
          const groupHandle = hitTestGroupHandle(point, groupPx, widthPx, heightPx, HANDLE_SIZE_PX);
          if (groupHandle) {
            const groupNorm = {
              x: groupPx.x / widthPx,
              y: groupPx.y / heightPx,
              w: groupPx.w / widthPx,
              h: groupPx.h / heightPx,
            };
            let centerX: number, centerY: number;
            if (groupHandle === 'se') {
              centerX = groupNorm.x;
              centerY = groupNorm.y;
            } else if (groupHandle === 'sw') {
              centerX = groupNorm.x + groupNorm.w;
              centerY = groupNorm.y;
            } else if (groupHandle === 'ne') {
              centerX = groupNorm.x;
              centerY = groupNorm.y + groupNorm.h;
            } else {
              centerX = groupNorm.x + groupNorm.w;
              centerY = groupNorm.y + groupNorm.h;
            }
            groupResizeRef.current = {
              handle: groupHandle,
              startPoint: point,
              startBoundsNorm: { ...groupNorm },
              centerX,
              centerY,
              ids: selectedAnns.map((a) => a.id),
            };
            return;
          }
        }
        if (selectedAnn?.type === 'shape') {
          const handle = hitResizeHandle(point, selectedAnn, widthPx, heightPx, HANDLE_SIZE_PX);
          if (handle) {
            const left = Math.min(selectedAnn.x, selectedAnn.x + selectedAnn.width);
            const top = Math.min(selectedAnn.y, selectedAnn.y + selectedAnn.height);
            const w = Math.abs(selectedAnn.width);
            const h = Math.abs(selectedAnn.height);
            resizeRef.current = {
              annId: selectedAnn.id,
              handle,
              startPoint: point,
              startX: left,
              startY: top,
              startW: w,
              startH: h,
            };
            return;
          }
        }
        const hit = [...annotations].reverse().find((a) => hitTest(a, point, widthPx, heightPx));
        if (hit) {
          if (selectedIds.includes(hit.id)) {
            dragStartRef.current = point;
          } else {
            dispatch({ type: 'SET_SELECTED_ANNOTATIONS', payload: [hit.id] });
            dragStartRef.current = point;
          }
        } else {
          setMarquee({ start: point, current: point });
          dragStartRef.current = null;
        }
      }
    },
    [tool, pageIndex, toRelative, startPath, startShape, annotations, selectedAnn, selectedAnns, selectedIds, widthPx, heightPx, dispatch]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const point = toRelative(e);
      
      if (state.currentPathId) {
        appendPath(point);
      }
      
      if (state.currentShapeId) {
        const start = shapeStartRef.current;
        resizeShape(point.x - start.x, point.y - start.y);
      }
      
      if (erasing && tool === 'eraser') {
        const hit = [...annotations].reverse().find((a) => hitTest(a, point, widthPx, heightPx));
        if (hit) {
          dispatch({ type: 'DELETE_ANNOTATION', payload: hit.id });
        }
      }
      
      if (groupResizeRef.current) {
        const { handle, startPoint, startBoundsNorm, centerX, centerY, ids } = groupResizeRef.current;
        const dx = point.x - startPoint.x;
        const dy = point.y - startPoint.y;
        const minSize = 0.02;
        let newW = Math.max(minSize, startBoundsNorm.w);
        let newH = Math.max(minSize, startBoundsNorm.h);
        let newX = startBoundsNorm.x;
        let newY = startBoundsNorm.y;
        if (handle === 'se') {
          newW = Math.max(minSize, startBoundsNorm.w + dx);
          newH = Math.max(minSize, startBoundsNorm.h + dy);
          newX = startBoundsNorm.x;
          newY = startBoundsNorm.y;
        } else if (handle === 'sw') {
          newX = startBoundsNorm.x + dx;
          newW = Math.max(minSize, startBoundsNorm.w - dx);
          newH = Math.max(minSize, startBoundsNorm.h + dy);
          newY = startBoundsNorm.y;
        } else if (handle === 'ne') {
          newY = startBoundsNorm.y + dy;
          newW = Math.max(minSize, startBoundsNorm.w + dx);
          newH = Math.max(minSize, startBoundsNorm.h - dy);
          newX = startBoundsNorm.x;
        } else if (handle === 'nw') {
          newX = startBoundsNorm.x + dx;
          newY = startBoundsNorm.y + dy;
          newW = Math.max(minSize, startBoundsNorm.w - dx);
          newH = Math.max(minSize, startBoundsNorm.h - dy);
        }
        const scaleX = newW / startBoundsNorm.w;
        const scaleY = newH / startBoundsNorm.h;
        dispatch({
          type: 'SCALE_ANNOTATIONS',
          payload: { ids, centerX, centerY, scaleX, scaleY },
        });
        groupResizeRef.current = {
          handle,
          startPoint: point,
          startBoundsNorm: { x: newX, y: newY, w: newW, h: newH },
          centerX,
          centerY,
          ids,
        };
        return;
      }
      if (resizeRef.current) {
        const { annId, handle, startX, startY, startW, startH } = resizeRef.current;
        const dx = point.x - resizeRef.current.startPoint.x;
        const dy = point.y - resizeRef.current.startPoint.y;
        const minSize = 0.02;
        let nx = startX;
        let ny = startY;
        let nw = Math.max(minSize, startW);
        let nh = Math.max(minSize, startH);
        if (handle === 'se') {
          nw = Math.max(minSize, startW + dx);
          nh = Math.max(minSize, startH + dy);
        } else if (handle === 'sw') {
          nx = startX + dx;
          nw = Math.max(minSize, startW - dx);
          nh = Math.max(minSize, startH + dy);
          ny = startY;
        } else if (handle === 'ne') {
          ny = startY + dy;
          nw = Math.max(minSize, startW + dx);
          nh = Math.max(minSize, startH - dy);
        } else if (handle === 'nw') {
          nx = startX + dx;
          ny = startY + dy;
          nw = Math.max(minSize, startW - dx);
          nh = Math.max(minSize, startH - dy);
        }
        dispatch({
          type: 'UPDATE_ANNOTATION',
          payload: { id: annId, updates: { x: nx, y: ny, width: nw, height: nh } },
        });
        resizeRef.current = { ...resizeRef.current, startX: nx, startY: ny, startW: nw, startH: nh, startPoint: point };
        return;
      }
      if (tool === 'select' && marquee) {
        setMarquee((prev) => (prev ? { ...prev, current: point } : null));
      }
      if (tool === 'select' && selectedIds.length > 0 && dragStartRef.current) {
        const start = dragStartRef.current;
        const dx = point.x - start.x;
        const dy = point.y - start.y;
        if (Math.abs(dx) > 0.0005 || Math.abs(dy) > 0.0005) {
          const pageSelectedIds = selectedIds.filter((id) =>
            state.annotations.some((a) => a.id === id && a.pageIndex === pageIndex)
          );
          if (pageSelectedIds.length > 0) {
            dispatch({ type: 'MOVE_ANNOTATIONS', payload: { ids: pageSelectedIds, dx, dy } });
          }
          dragStartRef.current = point;
        }
      }
    },
    [state.currentPathId, state.currentShapeId, erasing, tool, selectedIds, state.annotations, pageIndex, marquee, toRelative, appendPath, resizeShape, annotations, widthPx, heightPx, dispatch]
  );

  const onPointerUp = useCallback(() => {
    if (marquee) {
      const x0 = Math.min(marquee.start.x, marquee.current.x);
      const y0 = Math.min(marquee.start.y, marquee.current.y);
      const x1 = Math.max(marquee.start.x, marquee.current.x);
      const y1 = Math.max(marquee.start.y, marquee.current.y);
      const w = Math.max(0.005, x1 - x0);
      const h = Math.max(0.005, y1 - y0);
      const selRect = { x: x0, y: y0, w, h };
      const inRect = annotations.filter((a) => {
        const b = getAnnotationBoundsNorm(a);
        return rectsIntersect(b, selRect);
      });
      dispatch({ type: 'SET_SELECTED_ANNOTATIONS', payload: inRect.map((a) => a.id) });
      setMarquee(null);
    }
    endPath();
    endShape();
    setErasing(false);
    dragStartRef.current = null;
    resizeRef.current = null;
    groupResizeRef.current = null;
  }, [endPath, endShape, marquee, annotations, dispatch]);

  const cursor = getCursorForTool(tool);

  return (
    <div
      className="annotation-layer"
      ref={containerRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: widthPx,
        height: heightPx,
        pointerEvents: 'auto',
        cursor,
        userSelect: 'none',
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: 'absolute', 
          left: 0, 
          top: 0, 
          width: widthPx,
          height: heightPx,
          pointerEvents: 'none' 
        }} 
      />
      {selectedAnns.length > 0 && (
        <>
          <div
            style={{
              position: 'absolute',
              left: (() => {
                if (selectedAnns.length === 1) {
                  const a = selectedAnns[0]!;
                  const b = getAnnotationBounds(a, widthPx, heightPx);
                  const cx = a.type === 'text' ? a.x * widthPx + 40 : b.x + b.w / 2;
                  return Math.max(8, Math.min(widthPx - 140, cx - 70));
                }
                const boxes = selectedAnns.map((a) => getAnnotationBounds(a, widthPx, heightPx));
                const minX = Math.min(...boxes.map((b) => b.x));
                const maxX = Math.max(...boxes.map((b) => b.x + b.w));
                const cx = (minX + maxX) / 2;
                return Math.max(8, Math.min(widthPx - 140, cx - 70));
              })(),
              top: (() => {
                if (selectedAnns.length === 1) {
                  const a = selectedAnns[0]!;
                  if (a.type === 'text') return a.y * heightPx - 44;
                  const b = getAnnotationBounds(a, widthPx, heightPx);
                  return b.y - 44;
                }
                const boxes = selectedAnns.map((a) => getAnnotationBounds(a, widthPx, heightPx));
                const minY = Math.min(...boxes.map((b) => b.y));
                return minY - 44;
              })(),
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              padding: '4px 6px',
              maxWidth: Math.max(120, widthPx - 16),
              background: theme.bg.elevated,
              border: `1px solid ${theme.border.strong}`,
              borderRadius: 12,
              boxShadow: theme.navbarShadow,
              zIndex: 11,
              backdropFilter: 'blur(10px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              title="Delete"
              onClick={() => {
                if (selectedAnns.length === 1) {
                  dispatch({ type: 'DELETE_ANNOTATION', payload: selectedAnns[0]!.id });
                } else {
                  dispatch({ type: 'DELETE_ANNOTATIONS', payload: selectedAnns.map((a) => a.id) });
                }
                dispatch({ type: 'SET_SELECTED_ANNOTATIONS', payload: [] });
              }}
              style={selectionBarBtn(theme)}
            >
              <EraserIcon />
            </button>
            <button
              type="button"
              title="Copy"
              onClick={() => dispatch({ type: 'COPY_SELECTED' })}
              style={selectionBarBtn(theme)}
            >
              <CopyIcon />
            </button>
            {clipboard.length > 0 && (
              <button
                type="button"
                title="Paste"
                onClick={() => dispatch({ type: 'PASTE_ANNOTATIONS', payload: { pageIndex, offsetX: 0.02, offsetY: 0.02 } })}
                style={{ ...selectionBarBtn(theme), color: theme.accent.bright }}
              >
                <PasteIcon />
              </button>
            )}
            {selectedAnns.length > 1 && (
              <button
                type="button"
                title="Deselect"
                onClick={() => dispatch({ type: 'SET_SELECTED_ANNOTATIONS', payload: [] })}
                style={selectionBarBtn(theme)}
              >
                ✕
            </button>
          )}
          </div>
        </>
      )}
    </div>
  );
}
