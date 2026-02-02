/**
 * Application state — React Context + useReducer, no external state library.
 */
/* eslint-disable react-refresh/only-export-components -- store exports provider + hooks */
import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type {
  Annotation,
  PageItem,
  PathAnnotation,
  Point,
  ShapeAnnotation,
  TextAnnotation,
  ToolId,
} from './types';

const DEFAULT_TEXT_FONT_SIZE = 0.025;

const STROKE_PEN = 0.004;
const STROKE_SHAPE = 0.005;
const STROKE_MIN = 0.0015;
const STROKE_MAX = 0.008;
const OPACITY_HIGHLIGHT = 0.32;
const DEFAULT_BLANK_PX = { w: 612, h: 792 };

const TOOL_COLORS: Record<string, string> = {
  pen: '#1a1a1a',
  highlighter: '#f7e066',
  text: '#1a1a1a',
  rectangle: '#2563eb',
  circle: '#2563eb',
  arrow: '#2563eb',
};

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export type PageLayout = 'default' | 'ruled' | 'sepia';

export interface AppState {
  blobUrl: string | null;
  docId: string | null;
  fileName: string | null;
  pages: PageItem[];
  pageBoxesPx: { width: number; height: number }[];
  currentPage: number;
  zoom: number;
  tool: ToolId;
  color: string;
  strokeWidth: number;
  textFontSize: number; // normalized 0.015–0.06 (≈12–48px at 800px height)
  pageLayout: PageLayout;
  annotations: Annotation[];
  annotationHistory: {
    past: Annotation[][];
    future: Annotation[][];
  };
  currentPathId: string | null;
  currentShapeId: string | null;
  selectedAnnotationIds: string[];
  clipboard: Annotation[];
}

type Action =
  | { type: 'SET_DOC'; payload: { blobUrl: string; docId: string; fileName: string; pages: PageItem[]; pageBoxesPx: { width: number; height: number }[] } }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_TOOL'; payload: ToolId }
  | { type: 'SET_STROKE_WIDTH'; payload: number }
  | { type: 'SET_PAGE_LAYOUT'; payload: PageLayout }
  | { type: 'SET_COLOR'; payload: string }
  | { type: 'SET_ANNOTATIONS'; payload: Annotation[] }
  | { type: 'START_PATH'; payload: { pageIndex: number; point: Point } }
  | { type: 'APPEND_PATH'; payload: Point }
  | { type: 'END_PATH' }
  | { type: 'START_SHAPE'; payload: { pageIndex: number; x: number; y: number } }
  | { type: 'RESIZE_SHAPE'; payload: { width: number; height: number } }
  | { type: 'END_SHAPE' }
  | { type: 'ADD_TEXT'; payload: { pageIndex: number; x: number; y: number; text: string; fontSize?: number } }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<Pick<TextAnnotation, 'text' | 'fontSize' | 'color' | 'x' | 'y'> & Pick<ShapeAnnotation, 'x' | 'y' | 'width' | 'height' | 'color'>> } }
  | { type: 'MOVE_ANNOTATION'; payload: { id: string; dx: number; dy: number } }
  | { type: 'MOVE_ANNOTATIONS'; payload: { ids: string[]; dx: number; dy: number } }
  | { type: 'SCALE_ANNOTATIONS'; payload: { ids: string[]; centerX: number; centerY: number; scaleX: number; scaleY: number } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'DELETE_ANNOTATIONS'; payload: string[] }
  | { type: 'SET_SELECTED_ANNOTATION'; payload: string | null }
  | { type: 'SET_SELECTED_ANNOTATIONS'; payload: string[] }
  | { type: 'COPY_SELECTED' }
  | { type: 'PASTE_ANNOTATIONS'; payload: { pageIndex: number; offsetX: number; offsetY: number } }
  | { type: 'SET_TEXT_FONT_SIZE'; payload: number }
  | { type: 'INSERT_PAGE'; payload: { afterIndex: number } }
  | { type: 'SET_PAGES'; payload: { pages: PageItem[]; pageBoxesPx?: { width: number; height: number }[] } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_ANNOTATION_HISTORY'; payload: { past: Annotation[][]; future: Annotation[][] } }
  | { type: 'CLEAR_DOC' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DOC': {
      const { blobUrl, docId, fileName, pages, pageBoxesPx } = action.payload;
      return { ...state, blobUrl, docId, fileName, pages, pageBoxesPx, currentPage: 1, annotations: [], annotationHistory: { past: [], future: [] }, selectedAnnotationIds: [] };
    }
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };
    case 'SET_TOOL': {
      const tool = action.payload;
      const color = TOOL_COLORS[tool] ?? state.color;
      let strokeWidth = state.strokeWidth;
      if (['rectangle', 'circle', 'arrow'].includes(tool)) strokeWidth = STROKE_SHAPE;
      if (tool === 'pen' || tool === 'highlighter') strokeWidth = state.strokeWidth;
      return { ...state, tool, color, strokeWidth };
    }
    case 'SET_STROKE_WIDTH':
      return { ...state, strokeWidth: action.payload };
    case 'SET_PAGE_LAYOUT':
      return { ...state, pageLayout: action.payload };
    case 'SET_COLOR':
      return { ...state, color: action.payload };
    case 'SET_ANNOTATIONS':
      return { ...state, annotations: action.payload };
    case 'START_PATH': {
      const { pageIndex, point } = action.payload;
      const { tool, color, strokeWidth } = state;
      if (tool !== 'pen' && tool !== 'highlighter') return state;
      const pathAnn: PathAnnotation = {
        id: genId(),
        type: 'path',
        pageIndex,
        tool,
        points: [point],
        color,
        strokeWidth,
        opacity: tool === 'highlighter' ? OPACITY_HIGHLIGHT : 1,
        createdAt: Date.now(),
      };
      return {
        ...state,
        annotations: [...state.annotations, pathAnn],
        currentPathId: pathAnn.id,
        currentShapeId: null,
      };
    }
    case 'APPEND_PATH': {
      const id = state.currentPathId;
      if (!id) return state;
      const point = action.payload;
      return {
        ...state,
        annotations: state.annotations.map((a) => {
          if (a.id !== id || a.type !== 'path') return a;
          return { ...a, points: [...a.points, point] };
        }),
      };
    }
    case 'END_PATH': {
      // Push to history when path is complete
      if (state.currentPathId) {
        return {
          ...state,
          currentPathId: null,
          annotationHistory: {
            past: [...state.annotationHistory.past, state.annotations.slice(0, -1)],
            future: [],
          },
        };
      }
      return { ...state, currentPathId: null };
    }
    case 'START_SHAPE': {
      const { pageIndex, x, y } = action.payload;
      const { tool, color, strokeWidth } = state;
      if (!['rectangle', 'circle', 'arrow'].includes(tool)) return state;
      const shapeAnn: ShapeAnnotation = {
        id: genId(),
        type: 'shape',
        pageIndex,
        shape: tool as 'rectangle' | 'circle' | 'arrow',
        x,
        y,
        width: 0,
        height: 0,
        color,
        strokeWidth,
        createdAt: Date.now(),
      };
      return {
        ...state,
        annotations: [...state.annotations, shapeAnn],
        currentPathId: null,
        currentShapeId: shapeAnn.id,
      };
    }
    case 'RESIZE_SHAPE': {
      const id = state.currentShapeId;
      if (!id) return state;
      const { width, height } = action.payload;
      return {
        ...state,
        annotations: state.annotations.map((a) => {
          if (a.id !== id || a.type !== 'shape') return a;
          return { ...a, width, height };
        }),
      };
    }
    case 'END_SHAPE': {
      // Push to history when shape is complete
      if (state.currentShapeId) {
        return {
          ...state,
          currentShapeId: null,
          annotationHistory: {
            past: [...state.annotationHistory.past, state.annotations.slice(0, -1)],
            future: [],
          },
        };
      }
      return { ...state, currentShapeId: null };
    }
    case 'ADD_TEXT': {
      const { pageIndex, x, y, text, fontSize } = action.payload;
      const textAnn: TextAnnotation = {
        id: genId(),
        type: 'text',
        pageIndex,
        x,
        y,
        text,
        color: state.color,
        fontSize: fontSize ?? state.textFontSize,
        createdAt: Date.now(),
      };
      return {
        ...state,
        annotations: [...state.annotations, textAnn],
        annotationHistory: {
          past: [...state.annotationHistory.past, state.annotations],
          future: [],
        },
      };
    }
    case 'UPDATE_ANNOTATION': {
      const { id, updates } = action.payload;
      const idx = state.annotations.findIndex((a) => a.id === id);
      if (idx === -1) return state;
      const ann = state.annotations[idx]!;
      if (ann.type === 'text') {
        const next = { ...ann, ...updates } as TextAnnotation;
        const nextAnnotations = state.annotations.slice();
        nextAnnotations[idx] = next;
        return {
          ...state,
          annotations: nextAnnotations,
          annotationHistory: { past: [...state.annotationHistory.past, state.annotations], future: [] },
        };
      }
      if (ann.type === 'shape') {
        const next = { ...ann, ...updates } as ShapeAnnotation;
        const nextAnnotations = state.annotations.slice();
        nextAnnotations[idx] = next;
        return {
          ...state,
          annotations: nextAnnotations,
          annotationHistory: { past: [...state.annotationHistory.past, state.annotations], future: [] },
        };
      }
      return state;
    }
    case 'MOVE_ANNOTATION': {
      const { id, dx, dy } = action.payload;
      const idx = state.annotations.findIndex((a) => a.id === id);
      if (idx === -1) return state;
      const ann = state.annotations[idx]!;
      if (ann.type === 'path') {
        const next = { ...ann, points: ann.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
        const nextAnnotations = state.annotations.slice();
        nextAnnotations[idx] = next;
        return {
          ...state,
          annotations: nextAnnotations,
          annotationHistory: { past: [...state.annotationHistory.past, state.annotations], future: [] },
        };
      }
      if (ann.type === 'shape') {
        const next = { ...ann, x: ann.x + dx, y: ann.y + dy };
        const nextAnnotations = state.annotations.slice();
        nextAnnotations[idx] = next;
        return {
          ...state,
          annotations: nextAnnotations,
          annotationHistory: { past: [...state.annotationHistory.past, state.annotations], future: [] },
        };
      }
      if (ann.type === 'text') {
        const next = { ...ann, x: ann.x + dx, y: ann.y + dy };
        const nextAnnotations = state.annotations.slice();
        nextAnnotations[idx] = next;
        return {
          ...state,
          annotations: nextAnnotations,
          annotationHistory: { past: [...state.annotationHistory.past, state.annotations], future: [] },
        };
      }
      return state;
    }
    case 'MOVE_ANNOTATIONS': {
      const { ids, dx, dy } = action.payload;
      if (ids.length === 0) return state;
      const idSet = new Set(ids);
      const nextAnnotations = state.annotations.map((a) => {
        if (!idSet.has(a.id)) return a;
        if (a.type === 'path') {
          return { ...a, points: a.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
        }
        if (a.type === 'shape' || a.type === 'text') {
          return { ...a, x: a.x + dx, y: a.y + dy };
        }
        return a;
      });
      return {
        ...state,
        annotations: nextAnnotations,
        annotationHistory: { past: [...state.annotationHistory.past, state.annotations], future: [] },
      };
    }
    case 'SCALE_ANNOTATIONS': {
      const { ids, centerX, centerY, scaleX, scaleY } = action.payload;
      if (ids.length === 0) return state;
      const idSet = new Set(ids);
      const nextAnnotations = state.annotations.map((a) => {
        if (!idSet.has(a.id)) return a;
        if (a.type === 'path') {
          return {
            ...a,
            points: a.points.map((p) => ({
              x: centerX + (p.x - centerX) * scaleX,
              y: centerY + (p.y - centerY) * scaleY,
            })),
          };
        }
        if (a.type === 'shape') {
          const nx = centerX + (a.x - centerX) * scaleX;
          const ny = centerY + (a.y - centerY) * scaleY;
          const nw = a.width * scaleX;
          const nh = a.height * scaleY;
          return { ...a, x: nx, y: ny, width: nw, height: nh };
        }
        if (a.type === 'text') {
          const nx = centerX + (a.x - centerX) * scaleX;
          const ny = centerY + (a.y - centerY) * scaleY;
          const nFontSize = a.fontSize * (scaleX + scaleY) / 2;
          return { ...a, x: nx, y: ny, fontSize: nFontSize };
        }
        return a;
      });
      return {
        ...state,
        annotations: nextAnnotations,
        annotationHistory: { past: [...state.annotationHistory.past, state.annotations], future: [] },
      };
    }
    case 'DELETE_ANNOTATION': {
      const id = action.payload;
      const newAnnotations = state.annotations.filter((a) => a.id !== id);
      return {
        ...state,
        annotations: newAnnotations,
        selectedAnnotationIds: state.selectedAnnotationIds.filter((x) => x !== id),
        annotationHistory: {
          past: [...state.annotationHistory.past, state.annotations],
          future: [],
        },
      };
    }
    case 'DELETE_ANNOTATIONS': {
      const ids = action.payload;
      if (ids.length === 0) return state;
      const idSet = new Set(ids);
      const newAnnotations = state.annotations.filter((a) => !idSet.has(a.id));
      return {
        ...state,
        annotations: newAnnotations,
        selectedAnnotationIds: [],
        annotationHistory: { past: [...state.annotationHistory.past, state.annotations], future: [] },
      };
    }
    case 'SET_SELECTED_ANNOTATION':
      return { ...state, selectedAnnotationIds: action.payload ? [action.payload] : [] };
    case 'SET_SELECTED_ANNOTATIONS':
      return { ...state, selectedAnnotationIds: action.payload };
    case 'COPY_SELECTED': {
      const selected = state.annotations.filter((a) => state.selectedAnnotationIds.includes(a.id));
      if (selected.length === 0) return state;
      const clipboard = selected.map((a) => ({ ...a, id: genId() }));
      return { ...state, clipboard };
    }
    case 'PASTE_ANNOTATIONS': {
      const { pageIndex, offsetX, offsetY } = action.payload;
      if (state.clipboard.length === 0) return state;
      const newAnnotations: Annotation[] = state.clipboard.map((a) => {
        const id = genId();
        if (a.type === 'text') {
          return { ...a, id, pageIndex, x: a.x + offsetX, y: a.y + offsetY };
        }
        if (a.type === 'shape') {
          return { ...a, id, pageIndex, x: a.x + offsetX, y: a.y + offsetY };
        }
        return { ...a, id, pageIndex, points: a.points.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY })) };
      });
      return {
        ...state,
        annotations: [...state.annotations, ...newAnnotations],
        annotationHistory: { past: [...state.annotationHistory.past, state.annotations], future: [] },
      };
    }
    case 'SET_TEXT_FONT_SIZE':
      return { ...state, textFontSize: action.payload };
    case 'INSERT_PAGE': {
      const afterIndex = action.payload.afterIndex;
      const newPage: PageItem = { type: 'blank', id: genId() };
      const nextPages = [...state.pages];
      nextPages.splice(afterIndex + 1, 0, newPage);
      const nextBoxes = [...state.pageBoxesPx];
      nextBoxes.splice(afterIndex + 1, 0, { width: DEFAULT_BLANK_PX.w, height: DEFAULT_BLANK_PX.h });
      const shifted = state.annotations.map((a) =>
        a.pageIndex > afterIndex ? { ...a, pageIndex: a.pageIndex + 1 } : a
      );
      return { ...state, pages: nextPages, pageBoxesPx: nextBoxes, annotations: shifted };
    }
    case 'SET_PAGES': {
      const { pages, pageBoxesPx } = action.payload;
      return pageBoxesPx ? { ...state, pages, pageBoxesPx } : { ...state, pages };
    }
    case 'SET_ANNOTATION_HISTORY':
      return { ...state, annotationHistory: action.payload };
    case 'UNDO': {
      const past = state.annotationHistory.past;
      if (past.length === 0) return state;
      const previous = past[past.length - 1]!;
      const newPast = past.slice(0, -1);
      const newFuture = [state.annotations, ...state.annotationHistory.future];
      return {
        ...state,
        annotations: previous,
        annotationHistory: { past: newPast, future: newFuture },
      };
    }
    case 'REDO': {
      const future = state.annotationHistory.future;
      if (future.length === 0) return state;
      const next = future[0]!;
      const newFuture = future.slice(1);
      const newPast = [...state.annotationHistory.past, state.annotations];
      return {
        ...state,
        annotations: next,
        annotationHistory: { past: newPast, future: newFuture },
      };
    }
    case 'CLEAR_DOC':
      return { ...getInitialState(), clipboard: state.clipboard };
    default:
      return state;
  }
}

const COGNOTE_STROKE_KEY = 'cognote-strokeWidth';

function getInitialState(): AppState {
  let strokeWidth = STROKE_PEN;
  try {
    const stored = localStorage.getItem(COGNOTE_STROKE_KEY);
    if (stored != null) {
      const n = parseFloat(stored);
      if (Number.isFinite(n) && n >= STROKE_MIN && n <= STROKE_MAX) strokeWidth = n;
    }
  } catch { /* ignore */ }
  return {
    blobUrl: null,
    docId: null,
    fileName: null,
    pages: [],
    pageBoxesPx: [],
    currentPage: 1,
    zoom: 1.2,
    tool: 'pen',
    color: TOOL_COLORS.pen,
    strokeWidth,
    textFontSize: DEFAULT_TEXT_FONT_SIZE,
    pageLayout: 'default',
    annotations: [],
    annotationHistory: { past: [], future: [] },
    currentPathId: null,
    currentShapeId: null,
    selectedAnnotationIds: [],
    clipboard: [],
  };
}

const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useAppState(): { state: AppState; dispatch: Dispatch<Action> } {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useAppState must be used within StoreProvider');
  return ctx;
}

export function useStartPath(): (pageIndex: number, point: Point) => void {
  const { dispatch } = useAppState();
  return useCallback((pageIndex, point) => {
    dispatch({ type: 'START_PATH', payload: { pageIndex, point } });
  }, [dispatch]);
}

export function useAppendPath(): (point: Point) => void {
  const { dispatch } = useAppState();
  return useCallback((point) => dispatch({ type: 'APPEND_PATH', payload: point }), [dispatch]);
}

export function useEndPath(): () => void {
  const { dispatch } = useAppState();
  return useCallback(() => dispatch({ type: 'END_PATH' }), [dispatch]);
}

export function useStartShape(): (pageIndex: number, x: number, y: number) => void {
  const { dispatch } = useAppState();
  return useCallback((pageIndex, x, y) => {
    dispatch({ type: 'START_SHAPE', payload: { pageIndex, x, y } });
  }, [dispatch]);
}

export function useResizeShape(): (width: number, height: number) => void {
  const { dispatch } = useAppState();
  return useCallback((width, height) => {
    dispatch({ type: 'RESIZE_SHAPE', payload: { width, height } });
  }, [dispatch]);
}

export function useEndShape(): () => void {
  const { dispatch } = useAppState();
  return useCallback(() => dispatch({ type: 'END_SHAPE' }), [dispatch]);
}

export function useAddTextAnnotation(): (pageIndex: number, x: number, y: number, text: string) => void {
  const { dispatch } = useAppState();
  return useCallback((pageIndex, x, y, text) => {
    dispatch({ type: 'ADD_TEXT', payload: { pageIndex, x, y, text } });
  }, [dispatch]);
}

export function useHashBuffer(): (buffer: ArrayBuffer) => string {
  return useCallback((buffer: ArrayBuffer) => {
    const view = new Uint8Array(buffer);
    let h = 0;
    for (let i = 0; i < Math.min(view.length, 8192); i++) {
      h = ((h << 5) - h + view[i]!) | 0;
    }
    return `pdf-${h >>> 0}`;
  }, []);
}
