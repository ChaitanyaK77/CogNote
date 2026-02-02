/**
 * Right sidebar: page list (All Pages), thumbnails, current page nav, add blank page.
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useAppState } from '../core/store';
import { PageThumbnail } from './PageThumbnail';
import { useTheme } from '../theme';
import type { PageItem } from '../core/types';

interface PageSidebarProps {
  pdfDoc: PDFDocumentProxy | null;
  scrollToPageIndex: (index: number) => void;
  onInsertPage?: (afterIndex: number) => void;
}

const THUMB_GAP = 8;

export function PageSidebar({ pdfDoc, scrollToPageIndex, onInsertPage }: PageSidebarProps) {
  const { theme } = useTheme();
  const { state } = useAppState();
  const { pages, pageBoxesPx, currentPage } = state;
  const numPages = pages.length;
  const currentIndex = Math.max(0, Math.min(currentPage - 1, numPages - 1));

  const goPrev = () => {
    if (currentIndex > 0) {
      scrollToPageIndex(currentIndex - 1);
    }
  };

  const goNext = () => {
    if (currentIndex < numPages - 1) {
      scrollToPageIndex(currentIndex + 1);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.bg.panel,
        borderLeft: `1px solid ${theme.border.default}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${theme.border.default}` }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: theme.accent.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 8,
          }}
        >
          All Pages
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex <= 0}
            style={{
              width: 28,
              height: 28,
              border: `1px solid ${theme.border.subtle}`,
              borderRadius: 6,
              background: currentIndex <= 0 ? theme.bg.input : theme.hover.accent,
              color: currentIndex <= 0 ? theme.text.muted : theme.accent.main,
              cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            ‹
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.text.primary, minWidth: 48, textAlign: 'center' }}>
            {currentIndex + 1} / {numPages}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={currentIndex >= numPages - 1}
            style={{
              width: 28,
              height: 28,
              border: `1px solid ${theme.border.subtle}`,
              borderRadius: 6,
              background: currentIndex >= numPages - 1 ? theme.bg.input : theme.hover.accent,
              color: currentIndex >= numPages - 1 ? theme.text.muted : theme.accent.main,
              cursor: currentIndex >= numPages - 1 ? 'not-allowed' : 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            ›
          </button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: THUMB_GAP,
        }}
      >
        {numPages === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: theme.text.muted }}>
            No pages
          </div>
        ) : pages.map((item: PageItem, index: number) => {
          const isActive = index === currentIndex;
          const box = pageBoxesPx[index];
          const isPdf = item.type === 'pdf';
          const aspectRatio = box ? `${box.width} / ${box.height}` : '612 / 792';
          return (
            <div key={isPdf ? `pdf-${item.pdfPageIndex}` : item.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                type="button"
                onClick={() => scrollToPageIndex(index)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 0,
                border: isActive ? `2px solid ${theme.accent.main}` : `1px solid ${theme.border.subtle}`,
                borderRadius: 8,
                background: isActive ? theme.hover.accent : theme.bg.input,
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'border-color 0.2s, background 0.2s',
                boxShadow: isActive ? `0 0 14px ${theme.accent.glow}` : 'none',
                }}
              >
                <PageThumbnail
                  pdfDoc={pdfDoc}
                  pageNumber={isPdf ? item.pdfPageIndex + 1 : null}
                  isBlank={item.type === 'blank'}
                  index={index}
                  aspectRatio={aspectRatio}
                />
                <div
                  style={{
                    padding: '4px 6px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: isActive ? theme.accent.main : theme.text.secondary,
                    textAlign: 'center',
                  }}
                >
                  {isActive ? '● ' : ''}Page {index + 1}{item.type === 'blank' ? ' (blank)' : ''}
                </div>
              </button>
              {onInsertPage && (
                <button
                  type="button"
                  title="Insert blank page after this"
                  onClick={(e) => { e.stopPropagation(); onInsertPage(index); }}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: `1px dashed ${theme.border.strong}`,
                    background: theme.bg.input,
                    color: theme.accent.muted,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  + Insert page after
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
