/**
 * Global keyboard shortcuts (Cmd+Z, zoom, fullscreen, etc.)
 */

import { useEffect } from 'react';
import { useAppState } from '../core/store';

interface KeyboardShortcutsProps {
  onTogglePageSidebar?: () => void;
}

export function KeyboardShortcuts({ onTogglePageSidebar }: KeyboardShortcutsProps) {
  const { state, dispatch } = useAppState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const target = document.activeElement?.tagName;
      const inInput = target === 'INPUT' || target === 'TEXTAREA';

      // Toggle page sidebar: Ctrl/Cmd + Shift + P
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        onTogglePageSidebar?.();
        return;
      }

      // Zoom in: Cmd/Ctrl + =
      if (cmdOrCtrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        dispatch({ type: 'SET_ZOOM', payload: Math.min(2.5, state.zoom + 0.1) });
        return;
      }

      // Zoom out: Cmd/Ctrl + -
      if (cmdOrCtrl && e.key === '-') {
        e.preventDefault();
        dispatch({ type: 'SET_ZOOM', payload: Math.max(0.5, state.zoom - 0.1) });
        return;
      }

      // Copy: Cmd/Ctrl + C
      if (cmdOrCtrl && e.key === 'c') {
        if (state.selectedAnnotationIds.length > 0) {
          e.preventDefault();
          dispatch({ type: 'COPY_SELECTED' });
        }
      }

      // Paste: Cmd/Ctrl + V
      if (cmdOrCtrl && e.key === 'v') {
        if (state.clipboard.length > 0) {
          e.preventDefault();
          dispatch({ type: 'PASTE_ANNOTATIONS', payload: { pageIndex: state.currentPage - 1, offsetX: 0.02, offsetY: 0.02 } });
        }
      }

      // Delete / Backspace: remove selected annotation(s)
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedAnnotationIds.length > 0) {
        if (!inInput) {
          e.preventDefault();
          if (state.selectedAnnotationIds.length === 1) {
            dispatch({ type: 'DELETE_ANNOTATION', payload: state.selectedAnnotationIds[0]! });
          } else {
            dispatch({ type: 'DELETE_ANNOTATIONS', payload: state.selectedAnnotationIds });
          }
          dispatch({ type: 'SET_SELECTED_ANNOTATIONS', payload: [] });
        }
      }

      // Undo: Cmd/Ctrl + Z
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (state.annotationHistory.past.length > 0) {
          dispatch({ type: 'UNDO' });
        }
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if (cmdOrCtrl && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        if (state.annotationHistory.future.length > 0) {
          dispatch({ type: 'REDO' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    state.annotationHistory,
    state.selectedAnnotationIds,
    state.clipboard.length,
    state.currentPage,
    state.zoom,
    dispatch,
    onTogglePageSidebar,
  ]);

  return null;
}
