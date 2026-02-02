/**
 * Cognote — Toolbar. Blue accent, light/dark theme toggle.
 */
/* eslint-disable react-refresh/only-export-components -- TOOLBAR_OFFSET shared with App */
import { useState, useEffect } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useAppState } from '../core/store';
import { exportPdfWithAnnotations, exportCurrentPageAsPdf } from '../lib/pdfExport';
import { useTheme, APP_NAME } from '../theme';
import type { ToolId } from '../core/types';
import type { OpenDocument } from '../App';

function ZoomInIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
function ZoomOutIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function ExportIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function PagesIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  );
}

interface FunkyToolbarProps {
  pdfDoc?: PDFDocumentProxy | null;
  fileName?: string | null;
  openDocuments?: OpenDocument[];
  activeIndex?: number;
  onSwitchDocument?: (index: number) => void;
  onOpenDocument?: () => void;
  onCloseDocument?: (docIndex: number) => void;
  showDocTabs?: boolean;
  toolbarVisible?: boolean;
  onToggleToolbar?: () => void;
  pageSidebarOpen?: boolean;
  onTogglePageSidebar?: () => void;
}

const TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '◎' },
  { id: 'pen', label: 'Pen', icon: '✎' },
  { id: 'highlighter', label: 'Highlighter', icon: '▬' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
  { id: 'rectangle', label: 'Box', icon: '▢' },
  { id: 'circle', label: 'Circle', icon: '○' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
];

const COLORS = [
  '#1a1a1a', '#f5f5f5', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
];

const LAYOUTS: { id: 'default' | 'ruled' | 'sepia'; label: string }[] = [
  { id: 'default', label: 'Plain' },
  { id: 'ruled', label: 'Ruled' },
  { id: 'sepia', label: 'Sepia' },
];

const STROKE_MIN = 0.0015;
const STROKE_MAX = 0.008;
const strokeToSlider = (v: number) => Math.round(((v - STROKE_MIN) / (STROKE_MAX - STROKE_MIN)) * 100);
const sliderToStroke = (v: number) => STROKE_MIN + (v / 100) * (STROKE_MAX - STROKE_MIN);

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;

function shortenName(name: string, maxLen: number = 14): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 3) + '…';
}

export function FunkyToolbar({
  pdfDoc,
  fileName,
  openDocuments = [],
  activeIndex = 0,
  onSwitchDocument,
  onOpenDocument,
  onCloseDocument,
  showDocTabs = true,
  toolbarVisible = true,
  onToggleToolbar,
  pageSidebarOpen = true,
  onTogglePageSidebar,
}: FunkyToolbarProps) {
  const { theme, mode, toggleMode } = useTheme();
  const { state, dispatch } = useAppState();
  const { tool, color, zoom, strokeWidth, pageLayout, annotationHistory, annotations, currentPage } = state;
  const canUndo = annotationHistory.past.length > 0;
  const canRedo = annotationHistory.future.length > 0;
  const showThickness = tool === 'pen' || tool === 'highlighter';
  const thicknessSlider = Math.min(100, Math.max(0, strokeToSlider(strokeWidth)));
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  const handleExport = async () => {
    if (!pdfDoc || !fileName) return;
    try {
      await exportPdfWithAnnotations(pdfDoc, annotations, fileName);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export PDF.');
    }
  };

  const handleExportCurrentPage = async () => {
    if (!pdfDoc || !fileName) return;
    try {
      await exportCurrentPageAsPdf(pdfDoc, currentPage - 1, annotations, fileName);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export page.');
    }
  };

  useEffect(() => {
    if (!shortcutsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShortcutsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcutsOpen]);

  return (
    <>
      <header
        className="cognote-toolbar"
        style={{
          position: 'relative',
          height: theme.topBarHeight,
          minHeight: theme.topBarHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px 0 0',
          background: theme.bg.bar,
          borderBottom: `1px solid ${theme.border.subtle}`,
          boxShadow: theme.navbarShadow,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '0.18em',
              color: theme.accent.main,
              textShadow: `0 0 24px ${theme.accent.glow}, 0 2px 4px rgba(0,0,0,0.15)`,
              marginRight: 16,
              lineHeight: 1,
              display: 'inline-block',
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {APP_NAME}
          </span>
          {onOpenDocument && (
            <button
              type="button"
              title="Add PDF"
              onClick={onOpenDocument}
              style={{
                padding: '6px 14px',
                borderRadius: theme.inputRadius,
                border: `1px solid ${theme.accent.main}`,
                background: theme.hover.accent,
                color: theme.accent.bright,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              <span>Add PDF</span>
            </button>
          )}
          {showDocTabs && openDocuments.length > 0 && (
            <>
              {openDocuments.map((doc, i) => {
                const isActive = i === activeIndex;
                return (
                  <div
                    key={doc.docId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 4px 4px 12px',
                      borderRadius: theme.inputRadius,
                      border: `1px solid ${isActive ? theme.accent.main : theme.border.subtle}`,
                      background: isActive ? theme.hover.accent : theme.bg.input,
                      maxWidth: 200,
                    }}
                  >
                    <button
                      type="button"
                      title={doc.fileName}
                      onClick={() => onSwitchDocument?.(i)}
                      style={{
                        padding: '4px 0',
                        border: 'none',
                        background: 'transparent',
                        color: isActive ? theme.accent.bright : theme.text.secondary,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                        textAlign: 'left',
                      }}
                    >
                      {shortenName(doc.fileName)}
                    </button>
                    {onCloseDocument && (
                      <button
                        type="button"
                        title="Close"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseDocument(i);
                        }}
                        style={{
                          width: 24,
                          height: 24,
                          padding: 0,
                          border: 'none',
                          borderRadius: 4,
                          background: 'transparent',
                          color: theme.text.muted,
                          cursor: 'pointer',
                          fontSize: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <button
            type="button"
            title="Undo"
            disabled={!canUndo}
            onClick={() => dispatch({ type: 'UNDO' })}
            style={{
              width: 34,
              height: 34,
              borderRadius: theme.inputRadius,
              border: `1px solid ${theme.border.subtle}`,
              background: canUndo ? theme.hover.accent : theme.bg.input,
              color: canUndo ? theme.accent.main : theme.text.muted,
              cursor: canUndo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            title="Redo"
            disabled={!canRedo}
            onClick={() => dispatch({ type: 'REDO' })}
            style={{
              width: 34,
              height: 34,
              borderRadius: theme.inputRadius,
              border: `1px solid ${theme.border.subtle}`,
              background: canRedo ? theme.hover.accent : theme.bg.input,
              color: canRedo ? theme.accent.main : theme.text.muted,
              cursor: canRedo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RedoIcon />
          </button>
          <span style={{ width: 1, height: 24, background: theme.border.default }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              type="button"
              title="Zoom out"
              onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.max(ZOOM_MIN, zoom - 0.1) })}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: `1px solid ${theme.border.subtle}`,
                background: theme.bg.input,
                color: theme.text.primary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ZoomOutIcon />
            </button>
            <span style={{ minWidth: 48, textAlign: 'center', fontSize: 12, fontWeight: 600, color: theme.text.secondary }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              title="Zoom in"
              onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.min(ZOOM_MAX, zoom + 0.1) })}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: `1px solid ${theme.border.subtle}`,
                background: theme.bg.input,
                color: theme.text.primary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ZoomInIcon />
            </button>
          </div>
          <button
            type="button"
            title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
            onClick={toggleMode}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: `1px solid ${theme.border.subtle}`,
              background: theme.bg.input,
              color: theme.accent.main,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          {pdfDoc && (
            <>
              <button
                type="button"
                title="Export current page as PDF"
                onClick={handleExportCurrentPage}
                style={{
                  padding: '6px 12px',
                  borderRadius: theme.inputRadius,
                  border: `1px solid ${theme.border.strong}`,
                  background: theme.bg.input,
                  color: theme.text.secondary,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>Page</span>
              </button>
              <button
                type="button"
                title="Export full PDF"
                onClick={handleExport}
                style={{
                  padding: '8px 16px',
                  borderRadius: theme.inputRadius,
                  border: `1px solid ${theme.accent.main}`,
                  background: theme.hover.accent,
                  color: theme.accent.bright,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  boxShadow: `0 2px 12px ${theme.accent.glow}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ExportIcon />
                <span>Export</span>
              </button>
            </>
          )}
          <button
            type="button"
            title="Keyboard shortcuts"
            onClick={() => setShortcutsOpen((v) => !v)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: `1px solid ${theme.border.subtle}`,
              background: shortcutsOpen ? theme.hover.accent : theme.bg.input,
              color: theme.accent.main,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ?
          </button>
          {shortcutsOpen && (
            <div
              role="dialog"
              aria-label="Keyboard shortcuts"
              style={{
                position: 'absolute',
                top: theme.topBarHeight + 8,
                right: 16,
                minWidth: 260,
                padding: 16,
                background: theme.bg.elevated,
                border: `1px solid ${theme.border.strong}`,
                borderRadius: 12,
                boxShadow: theme.navbarShadow,
                zIndex: 1000,
                fontSize: 12,
                color: theme.text.primary,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13, color: theme.accent.main }}>Shortcuts</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={{ padding: '4px 8px 4px 0', color: theme.text.muted }}>Undo</td><td style={{ padding: 4, fontFamily: 'monospace' }}>{mod}+Z</td></tr>
                  <tr><td style={{ padding: '4px 8px 4px 0', color: theme.text.muted }}>Redo</td><td style={{ padding: 4, fontFamily: 'monospace' }}>{mod}+⇧Z</td></tr>
                  <tr><td style={{ padding: '4px 8px 4px 0', color: theme.text.muted }}>Copy</td><td style={{ padding: 4, fontFamily: 'monospace' }}>{mod}+C</td></tr>
                  <tr><td style={{ padding: '4px 8px 4px 0', color: theme.text.muted }}>Paste</td><td style={{ padding: 4, fontFamily: 'monospace' }}>{mod}+V</td></tr>
                  <tr><td style={{ padding: '4px 8px 4px 0', color: theme.text.muted }}>Delete selected</td><td style={{ padding: 4, fontFamily: 'monospace' }}>Del / ⌫</td></tr>
                  <tr><td style={{ padding: '4px 8px 4px 0', color: theme.text.muted }}>Zoom in</td><td style={{ padding: 4, fontFamily: 'monospace' }}>{mod}++</td></tr>
                  <tr><td style={{ padding: '4px 8px 4px 0', color: theme.text.muted }}>Zoom out</td><td style={{ padding: 4, fontFamily: 'monospace' }}>{mod}+-</td></tr>
                  <tr><td style={{ padding: '4px 8px 4px 0', color: theme.text.muted }}>Toggle All Pages</td><td style={{ padding: 4, fontFamily: 'monospace' }}>{mod}+⇧P</td></tr>
                </tbody>
              </table>
            </div>
          )}
          {onTogglePageSidebar && (
            <button
              type="button"
              title={pageSidebarOpen ? 'Hide All Pages' : 'Show All Pages'}
              onClick={onTogglePageSidebar}
              style={{
                width: 32,
                height: 32,
                borderRadius: theme.inputRadius,
                border: `1px solid ${theme.border.subtle}`,
                background: pageSidebarOpen ? theme.hover.accent : theme.bg.input,
                color: theme.accent.main,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PagesIcon />
            </button>
          )}
        </div>
      </header>

      {onToggleToolbar && (
        <button
          type="button"
          title={toolbarVisible ? 'Hide tools' : 'Show tools'}
          onClick={onToggleToolbar}
          aria-label={toolbarVisible ? 'Hide tools panel' : 'Show tools panel'}
          style={{
            position: 'fixed',
            left: toolbarVisible ? theme.sidebarWidth - 14 : 0,
            top: `calc(${theme.topBarHeight}px + (100dvh - ${theme.topBarHeight}px) / 2 - 28px)`,
            width: 28,
            height: 56,
            border: `1px solid ${theme.border.default}`,
            borderLeft: toolbarVisible ? undefined : 'none',
            borderRadius: '0 10px 10px 0',
            background: theme.bg.panel,
            color: theme.accent.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 101,
            boxShadow: theme.navbarShadow,
            transition: 'left 0.2s ease, color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.hover.accent;
            e.currentTarget.style.color = theme.accent.bright;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme.bg.panel;
            e.currentTarget.style.color = theme.accent.muted;
          }}
        >
          {toolbarVisible ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </button>
      )}

      {toolbarVisible && (
      <aside
        className="cognote-toolbar"
        style={{
          position: 'fixed',
          left: 0,
          top: theme.topBarHeight,
          bottom: 0,
          width: theme.sidebarWidth,
          background: theme.bg.panel,
          borderRight: `1px solid ${theme.border.default}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 16,
          gap: 4,
          zIndex: 100,
        }}
      >
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            onClick={() => dispatch({ type: 'SET_TOOL', payload: t.id })}
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              border: `1px solid ${tool === t.id ? theme.accent.main : theme.border.subtle}`,
              background: tool === t.id ? theme.hover.accent : theme.bg.input,
              color: tool === t.id ? theme.accent.bright : theme.text.secondary,
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: tool === t.id ? `0 0 16px ${theme.accent.glow}` : 'none',
            }}
          >
            {t.icon}
          </button>
        ))}
        {showThickness && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12, paddingBottom: 8, width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: theme.accent.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Thickness
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={thicknessSlider}
              onChange={(e) => {
                const v = sliderToStroke(Number(e.target.value));
                dispatch({ type: 'SET_STROKE_WIDTH', payload: v });
                try {
                  localStorage.setItem('cognote-strokeWidth', String(v));
                } catch { /* ignore */ }
              }}
              style={{
                width: 52,
                height: 6,
                accentColor: theme.accent.main,
                cursor: 'pointer',
              }}
            />
          </div>
        )}
        <div style={{ flex: 1, minHeight: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => dispatch({ type: 'SET_COLOR', payload: c })}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `2px solid ${color === c ? theme.accent.main : theme.border.subtle}`,
                background: c,
                cursor: 'pointer',
                boxShadow: color === c ? `0 0 10px ${theme.accent.glow}` : 'none',
              }}
            />
          ))}
        </div>
        <div style={{ paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: theme.accent.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Layout
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                title={l.label}
                onClick={() => dispatch({ type: 'SET_PAGE_LAYOUT', payload: l.id })}
                style={{
                  width: 52,
                  padding: '4px 6px',
                  borderRadius: 6,
                  border: `1px solid ${pageLayout === l.id ? theme.accent.main : theme.border.subtle}`,
                  background: pageLayout === l.id ? theme.hover.accent : theme.bg.input,
                  color: pageLayout === l.id ? theme.accent.bright : theme.text.secondary,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
      )}
    </>
  );
}

export const TOOLBAR_OFFSET = { left: 72, top: 52 };
