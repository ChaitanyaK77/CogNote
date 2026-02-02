/**
 * Blank (inserted) page — white canvas + annotation overlay.
 */

import { memo } from 'react';
import { SmoothAnnotationCanvas } from './SmoothAnnotationCanvas';
import { PageLayoutOverlay } from './PageLayoutOverlay';
import type { PageLayout } from '../core/store';

const DEFAULT_W = 612;
const DEFAULT_H = 792;

interface BlankPageViewProps {
  pageIndex: number;
  zoom: number;
  pageLayout: PageLayout;
}

function BlankPageViewInner({ pageIndex, zoom, pageLayout }: BlankPageViewProps) {
  const w = Math.round(DEFAULT_W * zoom);
  const h = Math.round(DEFAULT_H * zoom);

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        width: w,
        height: h,
        marginBottom: 24,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,169,98,0.08)',
        background: '#fff',
        borderRadius: 4,
      }}
    >
      <PageLayoutOverlay layout={pageLayout} widthPx={w} heightPx={h} />
      <SmoothAnnotationCanvas pageIndex={pageIndex} widthPx={w} heightPx={h} />
    </div>
  );
}

export const BlankPageView = memo(BlankPageViewInner);
