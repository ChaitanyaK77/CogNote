/**
 * Document viewer — scrollable list of pages (PDF or blank).
 * Virtualized by only rendering visible pages for performance.
 * Syncs current page from scroll; supports scroll-to-page from sidebar.
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useAppState } from '../core/store';
import { PdfPageView } from './PdfPageView';
import { BlankPageView } from './BlankPageView';
import type { PageItem } from '../core/types';

interface DocumentViewerProps {
  pdfDoc: PDFDocumentProxy | null;
  scrollToPageRef?: React.MutableRefObject<((index: number) => void) | null>;
}

const PAGE_GAP = 16;
const BUFFER = 2;

export function DocumentViewer({ pdfDoc, scrollToPageRef }: DocumentViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const { state, dispatch } = useAppState();
  const { blobUrl, pages, pageBoxesPx, zoom, pageLayout } = state;

  const numPages = pages.length;
  const defaultH = 800;
  const { heights, cumulative, totalHeight } = useMemo(() => {
    const h = pages.map((_, i) => pageBoxesPx[i] ? pageBoxesPx[i]!.height * zoom + PAGE_GAP : defaultH);
    const arr: number[] = [0];
    let sum = 0;
    for (const v of h) {
      sum += v;
      arr.push(sum);
    }
    return { heights: h, cumulative: arr, totalHeight: arr[numPages] ?? 0 };
  }, [pages, pageBoxesPx, zoom, numPages]);

  const scrollRafRef = useRef<number | null>(null);
  const onScroll = useCallback(() => {
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      setScrollTop(el.scrollTop);
    });
  }, []);
  useEffect(() => () => {
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
  }, []);

  const resizeRafRef = useRef<number | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setContainerHeight(el.clientHeight);
    const ro = new ResizeObserver(() => {
      if (resizeRafRef.current != null) return;
      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = null;
        if (scrollRef.current) setContainerHeight(scrollRef.current.clientHeight);
      });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
    };
  }, []);

  // Which page is most visible (for sidebar current page) — only dispatch when changed
  const prevPageRef = useRef(state.currentPage);
  useEffect(() => {
    if (numPages === 0) return;
    const mid = scrollTop + containerHeight / 2;
    let pageIndex = 0;
    for (let i = 0; i < numPages; i++) {
      if (cumulative[i + 1] != null && cumulative[i + 1]! >= mid) {
        pageIndex = i;
        break;
      }
      pageIndex = i;
    }
    const newPage = pageIndex + 1;
    if (prevPageRef.current !== newPage) {
      prevPageRef.current = newPage;
      dispatch({ type: 'SET_CURRENT_PAGE', payload: newPage });
    }
  }, [scrollTop, containerHeight, numPages, cumulative, dispatch, state.currentPage]);

  // Expose scroll-to-page for sidebar
  useEffect(() => {
    if (!scrollToPageRef) return;
    scrollToPageRef.current = (index: number) => {
      const el = scrollRef.current;
      if (!el || index < 0 || index >= numPages) return;
      const targetTop = cumulative[index] ?? 0;
      el.scrollTo({ top: targetTop - PAGE_GAP, behavior: 'smooth' });
    };
    return () => {
      scrollToPageRef.current = null;
    };
  }, [scrollToPageRef, numPages, cumulative]);

  const bottom = scrollTop + containerHeight;
  let start = 0;
  let end = numPages - 1;
  for (let i = 0; i < numPages; i++) {
    if ((cumulative[i + 1] ?? 0) >= scrollTop - heights[i]! * BUFFER) {
      start = Math.max(0, i - BUFFER);
      break;
    }
  }
  for (let i = numPages - 1; i >= 0; i--) {
    if (cumulative[i]! <= bottom + heights[i]! * BUFFER) {
      end = Math.min(numPages - 1, i + BUFFER);
      break;
    }
  }

  if (!blobUrl || numPages === 0) return null;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={{
        flex: 1,
        overflow: 'auto',
        background: '#0a0a0a',
        minHeight: 0,
      }}
    >
      <div
        style={{
          position: 'relative',
          minHeight: totalHeight,
          padding: PAGE_GAP,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {pages.map((item: PageItem, index: number) => {
          const isVisible = index >= start && index <= end;
          const top = cumulative[index]! + PAGE_GAP;
          const height = heights[index]! - PAGE_GAP;
          const box = pageBoxesPx[index];
          const w = box ? box.width * zoom : 612 * zoom;

          return (
            <div
              key={item.type === 'pdf' ? `pdf-${item.pdfPageIndex}` : item.id}
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top,
                width: w,
              }}
            >
              {isVisible ? (
                item.type === 'pdf' ? (
                  <PdfPageView
                    pdfDoc={pdfDoc}
                    pageNumber={item.pdfPageIndex + 1}
                    widthPx={box?.width ?? 612}
                    heightPx={box?.height ?? 792}
                    pageIndex={index}
                    zoom={zoom}
                    pageLayout={pageLayout}
                  />
                ) : (
                  <BlankPageView pageIndex={index} zoom={zoom} pageLayout={pageLayout} />
                )
              ) : (
                <div style={{ width: w, height, background: 'rgba(30,30,30,0.6)', borderRadius: 8, border: '1px solid rgba(201,169,98,0.1)' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
