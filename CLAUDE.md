# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server
npm run build    # type-check + production build
npm run lint     # eslint
npm run preview  # preview production build
```

## Stack

- **Vite 8** + **React 19** + **TypeScript 6**
- **MUI v9** (`@mui/material`, `@mui/icons-material`) with Emotion for styling

## Workflow rules

- Never run `npm run build` (or any build command) — the user will do this themselves.
- Never verbally acknowledge a rule without also writing it into CLAUDE.md.
- Do not use the memory file system — write all persistent rules directly into CLAUDE.md.

## Architecture

- `src/types.ts` — shared types: `Node`, `Edge`, `GraphState`, `Mode`, `SelectionTarget`
- `src/useGraphState.ts` — reducer-based graph state (nodes, edges, selection, mode, line drawing)
- `src/GraphCanvas.tsx` — SVG canvas, all pointer interaction (click, drag-to-connect, hover)
- `src/Toolbar.tsx` — floating mode toggle (Default / Line Drawing)
- `src/StatusBar.tsx` — bottom bar with contextual hints and node/edge counts
- `src/App.tsx` — root layout, wires state to canvas and UI, full-screen fixed dark background

## Keyboard shortcuts

- **Escape** — clear selection and cancel any in-progress line draw
- **Tab** — toggle between default and line-drawing modes (prevented from default browser focus behavior)
- **Delete / Backspace** — delete the currently selected node (and its connected edges) or edge

Keyboard handler lives in `App.tsx` (`useEffect` on `window`). Events from toolbar buttons (focused via `[data-toolbar]`) are ignored so Tab still works normally inside the toolbar.

## Graph editor behaviour

- Two modes: **default** and **line-drawing**, toggled via the Toolbar.
- **Default mode**: click empty space → add node (auto-selected); click node or edge → select it. Dragging nodes does nothing.
- **Line-drawing mode**: click a node to start an edge, click another node to finish it; or drag from one node to another. Clicking an edge selects it (cancels any in-progress line draw). Clicking empty space cancels an in-progress draw.
- Adding a node or edge auto-selects it.
- Duplicate edges and self-connections are silently ignored.
- Edges have a wide invisible hit area (strokeWidth 20) for easier clicking.
- Drag gesture uses a ref (`dragTracking`) for raw gesture state; a separate `dragSourceId` state drives rendering so React re-renders correctly.
- Never read `ref.current` during render — use state for anything that affects the rendered output.

## Key notes

- MUI v9 does not support shorthand system props (e.g. `mt={2}`). Always use the `sx` prop: `sx={{ mt: 2 }}`.
- `ThemeProvider` and `CssBaseline` are set up in `App.tsx` — all components render inside that tree.
- TypeScript is strict: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` are enabled. No `any`, no type assertions to bypass errors.
- After any significant feature work, update CLAUDE.md to reflect the current state of the project — do not let it go stale.
