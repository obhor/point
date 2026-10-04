# Point

Show AI what you mean. Point is a canvas where you upload images and point,
annotate, sketch, and arrange them into a visual reference an AI can read.

No LLM calls, no backend — everything is client-side and saved to your browser.

## Features

- **Infinite canvas** — pan, zoom, select, multi-select, resize, rotate, delete, undo/redo
- **13 tools** — select, point, rectangle, ellipse, arrow, line, freehand, text, numbered marker, highlight, blur, comment, eraser (each with a keyboard shortcut)
- **Signature Point tool** — press `P`, click to drop an auto-numbered ①②③ marker, type a label inline
- **Images as objects** — upload, paste, or drag-drop PNG/JPG/WEBP/GIF; place many on one canvas
- **AI Context** — deterministic, structured text summary of everything on the canvas
- **Copy for AI** — copies the image + text to your clipboard in one click
- **Export** — PNG, JPG, and JSON project files
- **Local persistence** — projects live in IndexedDB, nothing leaves your machine

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production

```bash
npm run build
npm run start
```

## Stack

Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Konva / react-konva.

## Keyboard shortcuts

| Key | Tool |
| --- | --- |
| `V` | Select |
| `P` | Point |
| `N` | Numbered marker |
| `R` | Rectangle |
| `O` | Ellipse |
| `A` | Arrow |
| `L` | Line |
| `D` | Freehand |
| `T` | Text |
| `H` | Highlight |
| `B` | Blur |
| `C` | Comment |
| `E` | Eraser |
