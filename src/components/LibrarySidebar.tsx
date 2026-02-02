/**
 * Cognote — Library sidebar: flat document list (no folders).
 */

import { useState, useCallback } from 'react';
import { useTheme } from '../theme';
import type { LibraryDocument } from '../lib/libraryStorage';

const SIDEBAR_WIDTH = 320;

export const LIBRARY_SIDEBAR_WIDTH = SIDEBAR_WIDTH;

interface LibrarySidebarProps {
  documents: LibraryDocument[];
  onOpenPdf: (docId: string) => void;
  onAddPdf: () => void;
  onDeletePdf: (doc: LibraryDocument) => void;
  onRenamePdf: (docId: string, fileName: string) => void;
  onClose: () => void;
}

function formatDate(createdAt: number): string {
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function shorten(name: string, max: number = 22) {
  return name.length <= max ? name : name.slice(0, max - 2) + '…';
}

export function LibrarySidebar({
  documents,
  onOpenPdf,
  onAddPdf,
  onDeletePdf,
  onRenamePdf,
  onClose,
}: LibrarySidebarProps) {
  const { theme } = useTheme();
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocName, setEditingDocName] = useState('');

  const startEditDoc = useCallback((d: LibraryDocument) => {
    setEditingDocId(d.id);
    setEditingDocName(d.fileName);
  }, []);
  const saveEditDoc = useCallback(() => {
    if (!editingDocId) return;
    const name = editingDocName.trim();
    if (name) onRenamePdf(editingDocId, name);
    setEditingDocId(null);
  }, [editingDocId, editingDocName, onRenamePdf]);

  const sorted = [...documents].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div
      style={{
        width: SIDEBAR_WIDTH,
        minWidth: SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.bg.panel,
        borderRight: `1px solid ${theme.border.subtle}`,
        zIndex: 90,
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${theme.border.subtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: theme.text.primary }}>Library</span>
        <button
          type="button"
          onClick={onClose}
          title="Close library"
          style={{
            width: 28,
            height: 28,
            borderRadius: theme.inputRadius,
            border: 'none',
            background: 'transparent',
            color: theme.text.muted,
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${theme.border.subtle}`, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onAddPdf}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: theme.inputRadius,
            border: `1px dashed ${theme.border.default}`,
            background: theme.bg.input,
            color: theme.accent.main,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>+</span>
          <span>Add PDF</span>
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
        {sorted.length === 0 ? (
          <p style={{ fontSize: 12, color: theme.text.muted, margin: 0, textAlign: 'center', padding: 24 }}>
            No PDFs yet. Add one to get started.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                onOpen={() => { onOpenPdf(doc.id); }}
                onDelete={() => onDeletePdf(doc)}
                onRename={() => onRenamePdf(doc.id, doc.fileName)}
                isEditing={editingDocId === doc.id}
                editName={editingDocName}
                onEditNameChange={setEditingDocName}
                onStartEdit={() => startEditDoc(doc)}
                onSaveEdit={saveEditDoc}
                onCancelEdit={() => setEditingDocId(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocCard({
  doc,
  onOpen,
  onDelete,
  onRename,
  isEditing,
  editName,
  onEditNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: {
  doc: LibraryDocument;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (id: string, name: string) => void;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: theme.inputRadius,
        background: theme.bg.surface,
        border: `1px solid ${theme.border.subtle}`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 48,
          borderRadius: 6,
          background: theme.bg.input,
          border: `1px solid ${theme.border.subtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <DocIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editName.trim()) onRename(doc.id, editName.trim());
                  onSaveEdit();
                }
                if (e.key === 'Escape') onCancelEdit();
              }}
              autoFocus
              style={{
                flex: 1,
                minWidth: 0,
                padding: '6px 8px',
                borderRadius: theme.inputRadius,
                border: `1px solid ${theme.accent.main}`,
                background: theme.bg.panel,
                color: theme.text.primary,
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button type="button" onClick={() => { onRename(doc.id, editName.trim()); onSaveEdit(); }} style={smallBtn(theme, theme.accent.main)}>✓</button>
            <button type="button" onClick={onCancelEdit} style={smallBtn(theme, theme.border.default)}>✕</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.fileName}>
              {shorten(doc.fileName, 18)}
            </div>
            <div style={{ fontSize: 11, color: theme.text.muted }}>{formatDate(doc.createdAt)}</div>
          </>
        )}
      </div>
      {!isEditing && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} style={openBtn(theme)}>Open</button>
          <button type="button" title="Rename" onClick={onStartEdit} style={iconBtn(theme.text.muted)}>✎</button>
          <button type="button" title="Delete" onClick={onDelete} style={iconBtn('#b44')}>⌫</button>
        </div>
      )}
    </div>
  );
}

function DocIcon() {
  const { theme } = useTheme();
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={theme.text.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function smallBtn(theme: { inputRadius: number; text: { secondary: string } }, border: string) {
  return { padding: '4px 8px', borderRadius: theme.inputRadius, border: `1px solid ${border}`, background: 'transparent', color: theme.text.secondary, cursor: 'pointer', fontSize: 11 } as const;
}
function iconBtn(color: string) {
  return { width: 28, height: 28, padding: 0, borderRadius: 6, border: 'none', background: 'transparent', color, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;
}
function openBtn(theme: { inputRadius: number; accent: { main: string }; text: { inverse: string } }) {
  return { padding: '6px 12px', borderRadius: theme.inputRadius, border: 'none', background: theme.accent.main, color: theme.text.inverse, cursor: 'pointer', fontSize: 12, fontWeight: 600 } as const;
}
