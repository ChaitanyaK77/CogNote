/**
 * Custom cursor styles for each tool
 */

import type { ToolId } from './types';

// SVG cursors as data URIs
const PEN_CURSOR = `data:image/svg+xml;base64,${btoa(`
<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#1a1a1a" stroke="#fff" stroke-width="0.5"/>
</svg>
`)}`;

const HIGHLIGHTER_CURSOR = `data:image/svg+xml;base64,${btoa(`
<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="4" y="10" width="16" height="8" rx="2" fill="#f7e066" opacity="0.7" stroke="#000" stroke-width="1"/>
</svg>
`)}`;

const ERASER_CURSOR = `data:image/svg+xml;base64,${btoa(`
<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="6" y="8" width="12" height="10" rx="2" fill="#f87171" stroke="#000" stroke-width="1"/>
  <rect x="8" y="6" width="8" height="4" fill="#fca5a5"/>
</svg>
`)}`;

const TEXT_CURSOR = `data:image/svg+xml;base64,${btoa(`
<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <text x="12" y="18" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#1a1a1a" stroke="#fff" stroke-width="0.5">T</text>
</svg>
`)}`;

export function getCursorForTool(tool: ToolId): string {
  switch (tool) {
    case 'pen':
      return `url('${PEN_CURSOR}') 2 22, auto`;
    case 'highlighter':
      return `url('${HIGHLIGHTER_CURSOR}') 12 18, auto`;
    case 'eraser':
      return `url('${ERASER_CURSOR}') 12 12, auto`;
    case 'text':
      return `url('${TEXT_CURSOR}') 12 18, text`;
    case 'rectangle':
    case 'circle':
    case 'arrow':
      return 'crosshair';
    case 'select':
    default:
      return 'default';
  }
}
