/**
 * Core types for PDF annotator — no external dependencies.
 */

export type ToolId =
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'text'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  pageIndex: number;
  createdAt: number;
}

export interface PathAnnotation extends BaseAnnotation {
  type: 'path';
  tool: 'pen' | 'highlighter';
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'shape';
  shape: 'rectangle' | 'circle' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
}

export type Annotation = PathAnnotation | TextAnnotation | ShapeAnnotation;

export type PageItem =
  | { type: 'pdf'; pdfPageIndex: number }
  | { type: 'blank'; id: string };

export interface PageBox {
  widthPt: number;
  heightPt: number;
  widthPx: number;
  heightPx: number;
}
