/**
 * Cognote — Note-taking. Open PDF(s), annotate, export. Light/dark theme, blue accent.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { StoreProvider, useAppState, useHashBuffer } from './core/store';
import { getDocumentState, saveDocumentState } from './lib/storage';
import { addToLibrary } from './lib/libraryStorage';
import { loadPdfFromArrayBuffer } from './lib/pdfLoader';
import { FunkyToolbar, TOOLBAR_OFFSET } from './components/FunkyToolbar';
import { DocumentViewer } from './components/DocumentViewer';
import { PageSidebar } from './components/PageSidebar';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { useTheme, APP_NAME } from './theme';
import type { PageItem } from './core/types';
import type { Annotation } from './core/types';

export interface OpenDocument {
  docId: string;
  fileName: string;
  sectionId: string | null; // which section (folder) this doc belongs to for navbar filtering
  blobUrl: string;
  pdfDoc: PDFDocumentProxy;
  pages: PageItem[];
  pageBoxesPx: { width: number; height: number }[];
  annotations: Annotation[];
  annotationHistory: { past: Annotation[][]; future: Annotation[][] };
  currentPage: number;
}

const SAVE_DEBOUNCE_MS = 800;
const MAX_FILE_MB = 100;
const MAIN_MAX_WIDTH = 'min(1200px, 72vw)';

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) resolve(result);
      else reject(new Error('Could not read file'));
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

function normalizeError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes('password') || m.includes('encrypted')) return 'Password-protected PDFs are not supported.';
    if (m.includes('invalid') || m.includes('corrupt')) return 'File does not appear to be a valid PDF.';
    return err.message;
  }
  return 'Failed to open PDF. Try another file.';
}

function isPdfFile(file: File): boolean {
  return !!file?.size && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
}

async function loadFileToOpenDocument(
  file: File,
  hashBuffer: (b: ArrayBuffer) => string
): Promise<OpenDocument> {
  if (!file?.size) throw new Error('Please select a file.');
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`File too large (max ${MAX_FILE_MB} MB).`);
  if (!isPdfFile(file)) throw new Error('Please select a PDF file.');

  const buffer = await readFileAsArrayBuffer(file);
  const docId = hashBuffer(buffer);
  const result = await loadPdfFromArrayBuffer(buffer);
  const { doc, pageCount, pageBoxes } = result;

  const blob = new Blob([buffer], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const pages: PageItem[] = pageBoxes.map((_, i) => ({ type: 'pdf', pdfPageIndex: i }));
  const pageBoxesPx = pageBoxes.map((b) => ({ width: b.widthPx, height: b.heightPx }));

  let annotations: Annotation[] = [];
  let loadedPages = pages;
  let loadedBoxes = pageBoxesPx;
  let savedCurrentPage = 1;
  try {
    const stored = await getDocumentState(docId);
    const savedPages = stored.pages as PageItem[];
    const savedAnns = stored.annotations as Annotation[];
    if (typeof stored.currentPage === 'number' && stored.currentPage >= 1) {
      savedCurrentPage = Math.min(stored.currentPage, pageCount);
    }
    const validPages =
      savedPages.length > 0 &&
      savedPages.every(
        (p) => p.type === 'blank' || (p.type === 'pdf' && p.pdfPageIndex < pageCount)
      )
        ? savedPages
        : null;
    annotations = savedAnns;
    if (validPages) {
      loadedPages = validPages;
      loadedBoxes = validPages.map((p) =>
        p.type === 'pdf' ? pageBoxesPx[p.pdfPageIndex]! : { width: 612, height: 792 }
      );
      savedCurrentPage = Math.min(savedCurrentPage, loadedPages.length);
    }
  } catch {
    annotations = [];
  }

  try {
    await addToLibrary(docId, file.name, null, blob);
  } catch { /* ignore */ }

  return {
    docId,
    fileName: file.name,
    sectionId: null,
    blobUrl,
    pdfDoc: doc,
    pages: loadedPages,
    pageBoxesPx: loadedBoxes,
    annotations,
    annotationHistory: { past: [], future: [] },
    currentPage: savedCurrentPage,
  };
}

function mergeLoadedDocs(
  current: OpenDocument[],
  loaded: OpenDocument[]
): [OpenDocument[], number] {
  let next = [...current];
  let targetIndex = 0;
  for (const doc of loaded) {
    const idx = next.findIndex((d) => d.docId === doc.docId);
    if (idx >= 0) {
      const old = next[idx]!;
      URL.revokeObjectURL(old.blobUrl);
      old.pdfDoc.destroy();
      next[idx] = doc;
      targetIndex = idx;
    } else {
      next.push(doc);
      targetIndex = next.length - 1;
    }
  }
  return [next, targetIndex];
}

function AppContent() {
  const { theme } = useTheme();
  const { state, dispatch } = useAppState();
  const hashBuffer = useHashBuffer();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openDocuments, setOpenDocuments] = useState<OpenDocument[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [closeModal, setCloseModal] = useState<{ docIndex: number } | null>(null);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [pageSidebarOpen, setPageSidebarOpen] = useState(true); // right "All Pages" sidebar toggle
  const [pageSidebarWidth, setPageSidebarWidth] = useState(() => {
    try {
      const w = localStorage.getItem('cognote-pageSidebarWidth');
      if (w != null) {
        const n = parseInt(w, 10);
        if (Number.isFinite(n) && n >= 160 && n <= 420) return n;
      }
    } catch { /* ignore */ }
    return 220;
  });
  const resizeStartRef = useRef<{ clientX: number; width: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollToPageRef = useRef<((index: number) => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist marker thickness whenever it changes so it's remembered across sessions
  useEffect(() => {
    try {
      localStorage.setItem('cognote-strokeWidth', String(state.strokeWidth));
    } catch { /* ignore */ }
  }, [state.strokeWidth]);

  const startResizePageSidebar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { clientX: e.clientX, width: pageSidebarWidth };
    const onMove = (ev: MouseEvent) => {
      const start = resizeStartRef.current;
      if (!start) return;
      const delta = start.clientX - ev.clientX;
      let w = Math.round(start.width + delta);
      w = Math.max(160, Math.min(420, w));
      setPageSidebarWidth(w);
      try {
        localStorage.setItem('cognote-pageSidebarWidth', String(w));
      } catch { /* ignore */ }
    };
    const onUp = () => {
      resizeStartRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pageSidebarWidth]);

  const activeDoc = openDocuments[activeIndex] ?? null;
  const pdfDoc = activeDoc?.pdfDoc ?? null;

  const closeDocument = useCallback(
    (docIndex: number) => {
      const doc = openDocuments[docIndex];
      if (!doc) return;
      URL.revokeObjectURL(doc.blobUrl);
      doc.pdfDoc.destroy();
      const nextDocs = openDocuments.filter((_, i) => i !== docIndex);
      setOpenDocuments(nextDocs);
      setCloseModal(null);
      if (nextDocs.length === 0) {
        dispatch({ type: 'CLEAR_DOC' });
        setActiveIndex(0);
        return;
      }
      const newActive = docIndex <= activeIndex && activeIndex > 0 ? activeIndex - 1 : Math.min(activeIndex, nextDocs.length - 1);
      setActiveIndex(newActive);
      const target = nextDocs[newActive]!;
      dispatch({
        type: 'SET_DOC',
        payload: { blobUrl: target.blobUrl, docId: target.docId, fileName: target.fileName, pages: target.pages, pageBoxesPx: target.pageBoxesPx },
      });
      dispatch({ type: 'SET_ANNOTATIONS', payload: target.annotations });
      dispatch({ type: 'SET_ANNOTATION_HISTORY', payload: target.annotationHistory });
      dispatch({ type: 'SET_CURRENT_PAGE', payload: target.currentPage });
      setTimeout(() => scrollToPageRef.current?.(target.currentPage - 1), 0);
    },
    [openDocuments, activeIndex, dispatch]
  );

  const requestCloseDocument = useCallback((docIndex: number) => {
    setCloseModal({ docIndex });
  }, []);

  const handleCloseSave = useCallback(
    async (docIndex: number) => {
      const doc = openDocuments[docIndex];
      if (!doc) return;
      try {
        const { exportPdfWithAnnotations } = await import('./lib/pdfExport');
        await exportPdfWithAnnotations(doc.pdfDoc, doc.annotations, doc.fileName);
      } catch { /* ignore */ }
      closeDocument(docIndex);
    },
    [openDocuments, closeDocument]
  );

  const openFile = useCallback(
    async (file: File) => {
      setLoadError(null);
      if (loading) return;
      setLoading(true);
      try {
        const newDoc = await loadFileToOpenDocument(file, hashBuffer);
        const [nextDocs, targetIndex] = mergeLoadedDocs(openDocuments, [newDoc]);
        setOpenDocuments(nextDocs);
        setActiveIndex(targetIndex);
        dispatch({
          type: 'SET_DOC',
          payload: {
            blobUrl: newDoc.blobUrl,
            docId: newDoc.docId,
            fileName: newDoc.fileName,
            pages: newDoc.pages,
            pageBoxesPx: newDoc.pageBoxesPx,
          },
        });
        dispatch({ type: 'SET_ANNOTATIONS', payload: newDoc.annotations });
        dispatch({ type: 'SET_CURRENT_PAGE', payload: newDoc.currentPage });
        setTimeout(() => scrollToPageRef.current?.(newDoc.currentPage - 1), 0);
      } catch (err) {
        setLoadError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    },
    [hashBuffer, dispatch, openDocuments, loading]
  );

  const openFiles = useCallback(
    async (files: File[]) => {
      const pdfFiles = Array.from(files).filter(isPdfFile);
      if (pdfFiles.length === 0) {
        setLoadError('Please select at least one PDF file.');
        return;
      }
      setLoadError(null);
      if (loading) return;
      setLoading(true);
      try {
        const loaded = await Promise.all(
          pdfFiles.map((f) => loadFileToOpenDocument(f, hashBuffer))
        );
        const [nextDocs, targetIndex] = mergeLoadedDocs(openDocuments, loaded);
        setOpenDocuments(nextDocs);
        setActiveIndex(targetIndex);
        const last = nextDocs[targetIndex]!;
        dispatch({
          type: 'SET_DOC',
          payload: {
            blobUrl: last.blobUrl,
            docId: last.docId,
            fileName: last.fileName,
            pages: last.pages,
            pageBoxesPx: last.pageBoxesPx,
          },
        });
        dispatch({ type: 'SET_ANNOTATIONS', payload: last.annotations });
        dispatch({ type: 'SET_CURRENT_PAGE', payload: last.currentPage });
        setTimeout(() => scrollToPageRef.current?.(last.currentPage - 1), 0);
      } catch (err) {
        setLoadError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    },
    [hashBuffer, dispatch, openDocuments, loading]
  );

  const switchDocument = useCallback(
    (index: number) => {
      if (index === activeIndex || index < 0 || index >= openDocuments.length) return;
      const current = openDocuments[activeIndex];
      if (current) {
        saveDocumentState(current.docId, {
          annotations: state.annotations,
          pages: state.pages,
          currentPage: state.currentPage,
        }).catch(() => {});
        setOpenDocuments((prev) => {
          const next = [...prev];
          next[activeIndex] = {
            ...current,
            annotations: state.annotations,
            pages: state.pages,
            pageBoxesPx: state.pageBoxesPx,
            annotationHistory: state.annotationHistory,
            currentPage: state.currentPage,
          };
          return next;
        });
      }
      const target = openDocuments[index]!;
      setActiveIndex(index);
      dispatch({
        type: 'SET_DOC',
        payload: {
          blobUrl: target.blobUrl,
          docId: target.docId,
          fileName: target.fileName,
          pages: target.pages,
          pageBoxesPx: target.pageBoxesPx,
        },
      });
      dispatch({ type: 'SET_ANNOTATIONS', payload: target.annotations });
      dispatch({ type: 'SET_ANNOTATION_HISTORY', payload: target.annotationHistory });
      dispatch({ type: 'SET_CURRENT_PAGE', payload: target.currentPage });
      setTimeout(() => scrollToPageRef.current?.(target.currentPage - 1), 0);
    },
    [activeIndex, openDocuments, state.annotations, state.pages, state.pageBoxesPx, state.annotationHistory, state.currentPage, dispatch]
  );

  useEffect(() => {
    if (!activeDoc || !state.docId) return;
    setOpenDocuments((prev) => {
      if (prev[activeIndex]?.docId !== state.docId) return prev;
      const next = [...prev];
      next[activeIndex] = {
        ...next[activeIndex]!,
        annotations: state.annotations,
        pages: state.pages,
        pageBoxesPx: state.pageBoxesPx,
        annotationHistory: state.annotationHistory,
        currentPage: state.currentPage,
      };
      return next;
    });
  }, [state.docId, state.annotations, state.pages, state.pageBoxesPx, state.annotationHistory, state.currentPage, activeIndex, activeDoc]);

  useEffect(() => {
    if (!state.docId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDocumentState(state.docId!, {
        annotations: state.annotations,
        pages: state.pages,
        currentPage: state.currentPage,
      }).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state.docId, state.annotations, state.pages, state.currentPage]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (loading) return;
      const files = Array.from(e.dataTransfer.files ?? []).filter(isPdfFile);
      if (files.length === 0) return;
      if (files.length === 1) openFile(files[0]!);
      else openFiles(files);
    },
    [openFile, openFiles, loading]
  );

  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  const triggerOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (openDocuments.length > 0 && state.blobUrl && state.pages.length > 0) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = e.target.files;
            if (!files?.length || loading) {
              e.target.value = '';
              return;
            }
            if (files.length === 1) openFile(files[0]!);
            else openFiles(Array.from(files));
            e.target.value = '';
          }}
        />
        <KeyboardShortcuts onTogglePageSidebar={() => setPageSidebarOpen((v) => !v)} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh',
            minHeight: '100vh',
            width: '100%',
            maxWidth: '100vw',
            background: theme.bg.root,
            overflow: 'hidden',
          }}
        >
          <FunkyToolbar
            pdfDoc={pdfDoc}
            fileName={state.fileName}
            openDocuments={openDocuments}
            activeIndex={activeIndex}
            onSwitchDocument={switchDocument}
            onOpenDocument={() => triggerOpenFile()}
            onCloseDocument={requestCloseDocument}
            showDocTabs={true}
            toolbarVisible={toolbarVisible}
            onToggleToolbar={() => setToolbarVisible((v) => !v)}
            pageSidebarOpen={pageSidebarOpen}
            onTogglePageSidebar={() => setPageSidebarOpen((v) => !v)}
          />
          {closeModal !== null && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={() => setCloseModal(null)}
            >
                <div
                  className="cognote-close-modal"
                  style={{
                    background: theme.bg.surface,
                    border: `1px solid ${theme.border.strong}`,
                    borderRadius: 12,
                    boxShadow: theme.navbarShadow,
                  }}
                onClick={(e) => e.stopPropagation()}
              >
                <p style={{ fontSize: 15, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>
                  {APP_NAME}
                </p>
                <p style={{ fontSize: 14, color: theme.text.secondary, marginBottom: 20 }}>
                  Save your annotations before closing?
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setCloseModal(null)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border.default}`,
                      background: theme.bg.input,
                      color: theme.text.secondary,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { closeDocument(closeModal.docIndex); }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 8,
                      border: `1px solid ${theme.accent.main}`,
                      background: 'rgba(201, 169, 98, 0.15)',
                      color: theme.accent.bright,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Discard & close
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleCloseSave(closeModal.docIndex); }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 8,
                      border: `1px solid ${theme.accent.main}`,
                      background: theme.accent.main,
                      color: theme.text.inverse,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Save PDF & close
                  </button>
                </div>
              </div>
            </div>
          )}
          <div
            className={`cognote-main-wrap${toolbarVisible ? ' cognote-sidebar-visible' : ''}`}
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="cognote-doc-area"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      maxWidth: MAIN_MAX_WIDTH,
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      margin: '0 auto',
                    }}
                  >
                    <div
                      className="cognote-filename-bar"
                      style={{
                        borderBottom: `1px solid ${theme.border.default}`,
                        background: theme.bg.surface,
                        fontWeight: 600,
                        color: theme.text.secondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span style={{ color: theme.accent.muted }}>▸</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {state.fileName}
                      </span>
                    </div>
                    <DocumentViewer pdfDoc={pdfDoc} scrollToPageRef={scrollToPageRef} />
                  </div>
                  {pageSidebarOpen && (
                    <div
                      className="cognote-page-resize-handle"
                      role="separator"
                      aria-label="Resize All Pages panel"
                      onMouseDown={startResizePageSidebar}
                      style={{
                        flexShrink: 0,
                        cursor: 'col-resize',
                        background: theme.border.subtle,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = theme.accent.muted;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = theme.border.subtle;
                      }}
                    />
                  )}
                  <div
                    className={pageSidebarOpen ? 'cognote-page-sidebar-wrap' : ''}
                    style={{
                      width: pageSidebarOpen ? pageSidebarWidth : 0,
                      minWidth: pageSidebarOpen ? undefined : 0,
                      overflow: 'hidden',
                      transition: 'width 0.2s ease-out',
                      flexShrink: 0,
                    }}
                  >
                    <PageSidebar
                      pdfDoc={pdfDoc}
                      scrollToPageIndex={(index) => scrollToPageRef.current?.(index)}
                      onInsertPage={(afterIndex) => dispatch({ type: 'INSERT_PAGE', payload: { afterIndex } })}
                    />
                  </div>
                </div>
          </div>
        </div>
      </>
    );
  }

  // Same shell as after upload: header + sidebar + center empty state
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = e.target.files;
          if (!files?.length || loading) {
            e.target.value = '';
            return;
          }
          if (files.length === 1) openFile(files[0]!);
          else openFiles(Array.from(files));
          e.target.value = '';
        }}
      />
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          minHeight: '100vh',
          width: '100%',
          maxWidth: '100vw',
          background: theme.bg.root,
          overflow: 'hidden',
        }}
      >
        <FunkyToolbar
          pdfDoc={null}
          fileName={null}
          openDocuments={[]}
          activeIndex={0}
          onOpenDocument={() => triggerOpenFile()}
          showDocTabs={false}
          toolbarVisible={toolbarVisible}
          onToggleToolbar={() => setToolbarVisible((v) => !v)}
        />
        <div
          className={`cognote-main-wrap${toolbarVisible ? ' cognote-sidebar-visible' : ''}`}
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          <div
            className="cognote-drop-zone"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px dashed ${theme.border.strong}`,
              borderRadius: 16,
              background: theme.bg.surface,
              cursor: 'pointer',
            }}
            onClick={triggerOpenFile}
            onKeyDown={(e) => e.key === 'Enter' && triggerOpenFile()}
            role="button"
            tabIndex={0}
            aria-label="Add PDF"
          >
            <p className="cognote-drop-zone-title" style={{ fontSize: 18, fontWeight: 700, color: theme.text.primary, marginBottom: 8 }}>
              Add PDF
            </p>
            <p className="cognote-drop-zone-hint" style={{ fontSize: 14, color: theme.text.secondary, margin: 0 }}>
              Click or drop PDF files here (multiple allowed)
            </p>
          </div>
        </div>
        {loadError && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 20px',
              background: 'rgba(180, 80, 80, 0.15)',
              border: `1px solid rgba(220, 100, 100, 0.4)`,
              borderRadius: 8,
              zIndex: 100,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: '#e88' }}>{loadError}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
