/**
 * Notability-style professional toolbar
 * Doc tabs, compact tools, clean UX
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useAppState } from '../core/store';
import { exportPdfWithAnnotations } from '../lib/pdfExport';
import type { ToolId } from '../core/types';
import type { OpenDocument } from '../App';

interface NotabilityToolbarProps {
  pdfDoc?: PDFDocumentProxy | null;
  fileName?: string | null;
  openDocuments?: OpenDocument[];
  activeIndex?: number;
  onSwitchDocument?: (index: number) => void;
  onOpenDocument?: () => void;
}

const TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'pen', label: 'Pen', icon: '✎' },
  { id: 'highlighter', label: 'Highlighter', icon: '▬' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'rectangle', label: 'Box', icon: '▢' },
  { id: 'circle', label: 'Circle', icon: '○' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
];

const COLORS = [
  { value: '#000000', name: 'Black' },
  { value: '#EF4444', name: 'Red' },
  { value: '#F97316', name: 'Orange' },
  { value: '#EAB308', name: 'Yellow' },
  { value: '#22C55E', name: 'Green' },
  { value: '#3B82F6', name: 'Blue' },
  { value: '#8B5CF6', name: 'Purple' },
  { value: '#EC4899', name: 'Pink' },
];

function shortenName(name: string, maxLen: number = 18): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 4) + '…' + (name.match(/\.[^.]+$/)?.[0] ?? '');
}

export function NotabilityToolbar({
  pdfDoc,
  fileName,
  openDocuments = [],
  activeIndex = 0,
  onSwitchDocument,
  onOpenDocument,
}: NotabilityToolbarProps) {
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Left: Doc tabs + Open, then Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {openDocuments.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              paddingRight: 8,
              borderRight: '1px solid #E5E7EB',
              marginRight: 4,
            }}
          >
            {openDocuments.map((doc, i) => (
              <button
                key={doc.docId}
                type="button"
                title={doc.fileName}
                onClick={() => onSwitchDocument?.(i)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: i === activeIndex ? '#EFF6FF' : 'transparent',
                  color: i === activeIndex ? '#1D4ED8' : '#6B7280',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  maxWidth: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (i !== activeIndex) {
                    e.currentTarget.style.background = '#F9FAFB';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (i !== activeIndex) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6B7280';
                  }
                }}
              >
                {shortenName(doc.fileName)}
              </button>
            ))}
            <button
              type="button"
              title="Open another PDF"
              onClick={onOpenDocument}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: '1px dashed #D1D5DB',
                background: '#FFF',
                color: '#6B7280',
                cursor: 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F9FAFB';
                e.currentTarget.style.borderColor = '#9CA3AF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFF';
                e.currentTarget.style.borderColor = '#D1D5DB';
              }}
            >
              +
            </button>
          </div>
        )}
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            onClick={() => dispatch({ type: 'SET_TOOL', payload: t.id })}
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              border: 'none',
              background: tool === t.id ? '#F3F4F6' : 'transparent',
              color: tool === t.id ? '#111827' : '#6B7280',
              cursor: 'pointer',
              fontSize: t.id === 'text' ? 14 : 16,
              fontWeight: 600,
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (tool !== t.id) {
                e.currentTarget.style.background = '#F9FAFB';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (tool !== t.id) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#6B7280';
              }
            }}
          >
            {t.icon}
          </button>
        ))}

        <div style={{ width: 1, height: 24, background: '#E5E7EB', margin: '0 4px' }} />

        <button
          type="button"
          title="Undo (⌘Z)"
          disabled={!canUndo}
          onClick={() => dispatch({ type: 'UNDO' })}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: canUndo ? '#374151' : '#D1D5DB',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            fontSize: 16,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (canUndo) e.currentTarget.style.background = '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ↶
        </button>
        <button
          type="button"
          title="Redo (⌘⇧Z)"
          disabled={!canRedo}
          onClick={() => dispatch({ type: 'REDO' })}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: canRedo ? '#374151' : '#D1D5DB',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            fontSize: 16,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (canRedo) e.currentTarget.style.background = '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ↷
        </button>
      </div>

      {/* Center: Colors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.name}
            onClick={() => dispatch({ type: 'SET_COLOR', payload: c.value })}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: color === c.value ? '2px solid #3B82F6' : '1px solid #E5E7EB',
              background: c.value,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: color === c.value ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
            }}
          />
        ))}
      </div>

      {/* Right: Zoom & Export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.max(0.5, zoom - 0.1) })}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              color: '#374151',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            −
          </button>
          <span style={{ minWidth: 48, textAlign: 'center', fontSize: 12, fontWeight: 500, color: '#6B7280' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.min(3, zoom + 0.1) })}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              color: '#374151',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            +
          </button>
        </div>

        {pdfDoc && (
          <button
            type="button"
            title="Export PDF"
            onClick={handleExport}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: '#3B82F6',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2563EB';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#3B82F6';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>↓</span>
            Export
          </button>
        )}
      </div>
    </div>
  );
}
