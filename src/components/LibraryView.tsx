/**
 * Cognote — Library view: flat document grid (no folders).
 */

import { useState, useCallback } from 'react';
import { useTheme } from '../theme';
import type { LibraryDocument } from '../lib/libraryStorage';

interface LibraryViewProps {
  documents: LibraryDocument[];
  onOpenPdf: (docId: string) => void;
  onAddPdf: () => void;
  onDeletePdf: (doc: LibraryDocument) => void;
  onRenamePdf: (docId: string, fileName: string) => void;
  onClose?: () => void;
}

function formatDate(createdAt: number): string {
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortenName(name: string, maxLen: number = 36): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 3) + '…';
}

export function LibraryView({
  documents,
  onOpenPdf,
  onAddPdf,
  onDeletePdf,
  onRenamePdf,
  onClose,
}: LibraryViewProps) {
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
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: theme.bg.surface,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${theme.border.subtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text.primary, margin: 0 }}>Library</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onAddPdf}
          style={{
            padding: '10px 18px',
            borderRadius: theme.inputRadius,
            border: 'none',
            background: theme.accent.main,
            color: theme.text.inverse,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          >
            <span>+</span>
            <span>Add PDF</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close library"
              style={{
                padding: '8px 14px',
                borderRadius: theme.inputRadius,
                border: `1px solid ${theme.border.subtle}`,
                background: theme.bg.input,
                color: theme.text.secondary,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {sorted.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 240,
              color: theme.text.muted,
              fontSize: 14,
              textAlign: 'center',
              padding: 24,
            }}
          >
            <p style={{ margin: 0 }}>No PDFs yet.</p>
            <p style={{ margin: '8px 0 0 0' }}>Add a PDF to get started.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {sorted.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onOpen={() => onOpenPdf(doc.id)}
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

function DocumentCard({
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
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        borderRadius: theme.cardRadius,
        background: theme.bg.elevated,
        border: `1px solid ${theme.border.subtle}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '3/4',
          maxHeight: 160,
          borderRadius: 8,
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                width: '100%',
                padding: '8px 10px',
                borderRadius: theme.inputRadius,
                border: `1px solid ${theme.accent.main}`,
                background: theme.bg.panel,
                color: theme.text.primary,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => { onRename(doc.id, editName.trim()); onSaveEdit(); }} style={smallBtn(theme, theme.accent.main)}>Save</button>
              <button type="button" onClick={onCancelEdit} style={smallBtn(theme, theme.border.default)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.fileName}>
              {shortenName(doc.fileName)}
            </div>
            <div style={{ fontSize: 12, color: theme.text.muted }}>{formatDate(doc.createdAt)}</div>
          </>
        )}
      </div>
      {!isEditing && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
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
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={theme.text.muted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function smallBtn(theme: { inputRadius: number; text: { secondary: string } }, border: string) {
  return {
    padding: '6px 12px',
    borderRadius: theme.inputRadius,
    border: `1px solid ${border}`,
    background: 'transparent',
    color: theme.text.secondary,
    cursor: 'pointer',
    fontSize: 12,
  } as const;
}
function iconBtn(color: string) {
  return {
    width: 32,
    height: 32,
    padding: 0,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color,
    cursor: 'pointer',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
}
function openBtn(theme: { inputRadius: number; accent: { main: string }; text: { inverse: string } }) {
  return {
    padding: '8px 14px',
    borderRadius: theme.inputRadius,
    border: 'none',
    background: theme.accent.main,
    color: theme.text.inverse,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  } as const;
}

/** Modal: Delete PDF — Save copy / Delete permanently / Cancel */
export function DeleteConfirmModal({
  visible,
  fileName,
  onSaveAndDelete,
  onDeletePermanently,
  onCancel,
  saving,
}: {
  visible: boolean;
  fileName: string;
  onSaveAndDelete: () => Promise<void>;
  onDeletePermanently: () => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: theme.bg.surface,
          border: `1px solid ${theme.border.strong}`,
          borderRadius: 12,
          padding: 24,
          maxWidth: 420,
          boxShadow: theme.navbarShadow,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>
          Delete from library?
        </p>
        <p style={{ fontSize: 14, color: theme.text.secondary, marginBottom: 20 }}>
          <strong style={{ color: theme.text.primary }}>{fileName}</strong> will be removed. You can save a copy with your annotations first.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" onClick={onCancel} style={modalBtn(theme, theme.border.default, theme.text.secondary)}>Cancel</button>
          <button type="button" onClick={onDeletePermanently} style={modalBtn(theme, 'rgba(180,80,80,0.3)', '#e88')}>Delete permanently</button>
          <button type="button" onClick={() => onSaveAndDelete()} disabled={saving} style={modalBtn(theme, theme.accent.main, theme.text.inverse)}>
            {saving ? 'Saving…' : 'Save PDF & delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function modalBtn(theme: { border: { default: string } }, bg: string, color: string) {
  return {
    padding: '10px 18px',
    borderRadius: 8,
    border: `1px solid ${theme.border.default}`,
    background: bg,
    color,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  } as const;
}
