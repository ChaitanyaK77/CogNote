/**
 * Toolbar — tool selection, color, zoom. No external dependencies.
 */

import { useAppState } from '../core/store';
import type { ToolId } from '../core/types';

const TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'pen', label: 'Pen', icon: '✎' },
  { id: 'highlighter', label: 'Highlighter', icon: '🖍' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'rectangle', label: 'Rectangle', icon: '▢' },
  { id: 'circle', label: 'Circle', icon: '○' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
];

const COLORS = [
  '#1a1a1a', '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#0d9488', '#2563eb', '#7c3aed', '#db2777',
];

export function ToolsBar() {
  const { state, dispatch } = useAppState();
  const { tool, color, zoom } = state;

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        background: '#1e293b',
        color: '#e2e8f0',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            onClick={() => dispatch({ type: 'SET_TOOL', payload: t.id })}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: tool === t.id ? '#334155' : 'transparent',
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: t.id === 'text' ? 16 : 18,
            }}
          >
            {t.icon}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => dispatch({ type: 'SET_COLOR', payload: c })}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: color === c ? '2px solid #fff' : '1px solid #475569',
              background: c,
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.max(0.5, zoom - 0.2) })}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #475569', background: '#334155', color: '#e2e8f0', cursor: 'pointer' }}
        >
          −
        </button>
        <span style={{ minWidth: 48, textAlign: 'center', fontSize: 14 }}>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.min(3, zoom + 0.2) })}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #475569', background: '#334155', color: '#e2e8f0', cursor: 'pointer' }}
        >
          +
        </button>
      </div>
    </header>
  );
}
