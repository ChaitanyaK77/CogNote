/**
 * Page layout overlay — default (none), ruled lines, or sepia/yellow tint.
 */

import type { PageLayout } from '../core/store';

interface PageLayoutOverlayProps {
  layout: PageLayout;
  widthPx?: number;
  heightPx: number;
}

const RULED_LINE_COLOR = 'rgba(201, 169, 98, 0.12)';
const RULED_SPACING = 28;
const SEPIA_OVERLAY = 'rgba(255, 248, 220, 0.22)';

export function PageLayoutOverlay({ layout, heightPx }: PageLayoutOverlayProps) {
  if (layout === 'default') return null;

  if (layout === 'ruled') {
    const lines = Math.floor(heightPx / RULED_SPACING);
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          borderRadius: 4,
        }}
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: i * RULED_SPACING,
              height: 1,
              background: RULED_LINE_COLOR,
            }}
          />
        ))}
      </div>
    );
  }

  if (layout === 'sepia') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: SEPIA_OVERLAY,
          borderRadius: 4,
        }}
      />
    );
  }

  return null;
}
