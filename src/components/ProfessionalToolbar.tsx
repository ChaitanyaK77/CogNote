/**
 * Professional toolbar with tools, undo/redo, colors, zoom, and export
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useAppState } from '../core/store';
import { exportPdfWithAnnotations } from '../lib/pdfExport';
import type { ToolId } from '../core/types';

interface ProfessionalToolbarProps {
  pdfDoc?: PDFDocumentProxy | null;
  fileName?: string | null;
}

const TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '⌖' },
  { id: 'pen', label: 'Pen', icon: '✎' },
  { id: 'highlighter', label: 'Highlighter', icon: '▬' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'rectangle', label: 'Rectangle', icon: '▢' },
  { id: 'circle', label: 'Circle', icon: '○' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
];

const COLORS = [
  { value: '#1a1a1a', name: 'Black' },
  { value: '#dc2626', name: 'Red' },
  { value: '#ea580c', name: 'Orange' },
  { value: '#f7e066', name: 'Yellow' },
  { value: '#65a30d', name: 'Green' },
  { value: '#0d9488', name: 'Teal' },
  { value: '#2563eb', name: 'Blue' },
  { value: '#7c3aed', name: 'Purple' },
  { value: '#db2777', name: 'Pink' },
];

export function ProfessionalToolbar({ pdfDoc, fileName }: ProfessionalToolbarProps) {
  const { state, dispatch } = useAppState();
  const { tool, color, zoom, annotationHistory, annotations } = state;
  const canUndo = annotationHistory.past.length > 0;
  const canRedo = annotationHistory.future.length > 0;

  const handleExport = async () => {
    if (!pdfDoc || !fileName) return;
    try {
      await exportPdfWithAnnotations(pdfDoc, annotations, fileName);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        flexWrap: 'wrap',
      }}
    >
      {/* Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 8px' }}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            onClick={() => dispatch({ type: 'SET_TOOL', payload: t.id })}
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              border: 'none',
              background: tool === t.id ? 'rgba(255,255,255,0.3)' : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: t.id === 'text' ? 18 : 20,
              fontWeight: 600,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (tool !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              if (tool !== t.id) e.currentTarget.style.background = 'transparent';
            }}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Undo/Redo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          title="Undo (Cmd/Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => dispatch({ type: 'UNDO' })}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            background: canUndo ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
            color: canUndo ? '#fff' : 'rgba(255,255,255,0.3)',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          ↶
        </button>
        <button
          type="button"
          title="Redo (Cmd/Ctrl+Shift+Z)"
          disabled={!canRedo}
          onClick={() => dispatch({ type: 'REDO' })}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            background: canRedo ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
            color: canRedo ? '#fff' : 'rgba(255,255,255,0.3)',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          ↷
        </button>
      </div>

      {/* Colors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 10px' }}>
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.name}
            onClick={() => dispatch({ type: 'SET_COLOR', payload: c.value })}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: color === c.value ? '3px solid #fff' : '2px solid rgba(255,255,255,0.4)',
              background: c.value,
              cursor: 'pointer',
              boxShadow: color === c.value ? '0 0 8px rgba(255,255,255,0.6)' : 'none',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>

      {/* Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 12px' }}>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.max(0.5, zoom - 0.1) })}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          −
        </button>
        <span style={{ minWidth: 60, textAlign: 'center', fontSize: 15, fontWeight: 600 }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.min(3, zoom + 0.1) })}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          +
        </button>
      </div>

      {/* Export */}
      {pdfDoc && (
        <button
          type="button"
          title="Export PDF with annotations"
          onClick={handleExport}
          style={{
            padding: '8px 20px',
            borderRadius: 10,
            border: 'none',
            background: 'rgba(255,255,255,0.25)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginLeft: 'auto',
          }}
        >
          <span>💾</span>
          Export PDF
        </button>
      )}
    </header>
  );
}
