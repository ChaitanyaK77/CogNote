# CogNote

CogNote lets you open PDFs and mark them up with a pen, highlighter, and shapes. You can open more than one PDF at a time, add notes and drawings, then save or export a new PDF with your annotations included.

## What you can do

- **Pen**: Draw with adjustable thickness. Your thickness choice is remembered.
- **Highlighter**: Mark text without hiding it; the highlight stays see-through.
- **Eraser**: Remove pen strokes and shapes.
- **Shapes**: Add rectangles, circles, and arrows.
- **Select**: Select one or several annotations to move, resize, or delete them.
- **Multiple PDFs**: Add PDFs from the navbar or by dragging files. Switch between them with tabs.
- **All Pages**: Use the sidebar to see all pages, jump to one, or add a blank page.
- **Export**: Download the full PDF or just the current page with all annotations saved in.
- **Undo / Redo**: Full undo and redo, including keyboard shortcuts.
- **Auto-save**: Annotations and your place in the document are saved automatically.
- **Light / Dark theme**: Switch theme from the navbar.
- **Keyboard shortcuts**: Undo, redo, copy, paste, delete, zoom, and more. Click "?" in the navbar to see the list.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal in your browser.

## Hosting on GitHub Pages

The repo includes a workflow that builds and deploys the app on every push to `main`. To enable:

1. In your repo on GitHub, go to **Settings** > **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`; the workflow will build and deploy. The site will be at:

   **https://chaitanyak77.github.io/CogNote/**

## Usage

- **Add PDF**: Click "Add PDF" in the navbar or drop a PDF on the empty area. You can select multiple files at once.
- **Annotate**: Pick a tool from the left sidebar (pen, highlighter, eraser, shapes). When pen or highlighter is active, use the thickness slider.
- **Select**: Use the select tool and drag to draw a box around items. Then move, resize, or delete them from the bar that appears.
- **Export**: Use "Export" for the full PDF or "Page" for only the current page.
- **Shortcuts**: Click "?" in the navbar to see keyboard shortcuts.

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## License

MIT
