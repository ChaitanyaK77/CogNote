# CogNote

A PDF annotation app with smooth pen strokes, highlighter, shapes, and export. Open one or more PDFs, annotate with pen, highlighter, eraser, and shapes (box, circle, arrow), then export with annotations burned in.

## Features

- **Pen**: Smooth strokes with adjustable thickness (saved per session)
- **Highlighter**: Semi-transparent marker that keeps underlying text readable
- **Eraser**: Remove paths and shapes
- **Shapes**: Rectangle, circle, arrow
- **Select**: Box-select, multi-drag, resize handles for selected annotations
- **Multiple PDFs**: Add PDFs via navbar button or drag-and-drop; tabbed documents
- **All Pages**: Resizable sidebar with thumbnails, insert blank page
- **Export**: Full PDF or current page only, with annotations burned in
- **Undo/Redo**: Full history with keyboard shortcuts
- **Auto-save**: Annotations and current page saved per document (IndexedDB)
- **Light/Dark theme**: Toggle in navbar
- **Keyboard shortcuts**: Undo, redo, copy, paste, delete, zoom, toggle All Pages panel

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (e.g. http://localhost:5173/).

## Hosting on GitHub Pages

The repo includes a workflow that builds and deploys the app on every push to `main`. To enable:

1. In your repo on GitHub, go to **Settings** > **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`; the workflow will build and deploy. The site will be at:

   **https://chaitanyak77.github.io/CogNote/**

## Usage

- **Add PDF**: Click "Add PDF" in the navbar or drop a PDF on the empty state. You can select multiple files at once.
- **Annotate**: Choose a tool from the left sidebar (pen, highlighter, eraser, shapes). Use the thickness slider when pen or highlighter is active.
- **Select**: Use the select tool, then drag to box-select. Move, resize, or delete selected items from the floating bar.
- **Export**: Use "Export" (full PDF) or "Page" (current page only) in the navbar.
- **Shortcuts**: Click "?" in the navbar to see keyboard shortcuts.

## Tech Stack

- React 19, TypeScript, Vite 7
- PDF.js for rendering, perfect-freehand for smooth strokes, jsPDF for export
- State: React Context + useReducer; persistence: IndexedDB and localStorage

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## License

MIT
