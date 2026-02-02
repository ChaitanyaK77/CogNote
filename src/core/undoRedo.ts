/**
 * Undo/Redo manager for annotations
 */

import type { Annotation } from './types';

export interface UndoRedoState {
  past: Annotation[][];
  present: Annotation[];
  future: Annotation[][];
}

export function createUndoRedoState(initial: Annotation[]): UndoRedoState {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

export function canUndo(state: UndoRedoState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: UndoRedoState): boolean {
  return state.future.length > 0;
}

export function undo(state: UndoRedoState): UndoRedoState {
  if (!canUndo(state)) return state;
  const previous = state.past[state.past.length - 1]!;
  const newPast = state.past.slice(0, -1);
  return {
    past: newPast,
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redo(state: UndoRedoState): UndoRedoState {
  if (!canRedo(state)) return state;
  const next = state.future[0]!;
  const newFuture = state.future.slice(1);
  return {
    past: [...state.past, state.present],
    present: next,
    future: newFuture,
  };
}

export function pushHistory(state: UndoRedoState, newPresent: Annotation[]): UndoRedoState {
  // Don't push if nothing changed
  if (JSON.stringify(state.present) === JSON.stringify(newPresent)) {
    return state;
  }
  return {
    past: [...state.past, state.present],
    present: newPresent,
    future: [], // Clear future on new action
  };
}
