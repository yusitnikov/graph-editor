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
- Never run `tsc --noEmit` to type-check — use `npm run lint` instead.
- Never verbally acknowledge a rule without also writing it into CLAUDE.md.
- Do not use the memory file system — write all persistent rules directly into CLAUDE.md.

## Architecture

- `src/types.ts` — shared types: `Node` (id, x, y, color), `Edge`, `GraphState`, `Mode`, `SelectionTarget`, `Viewport`
- `src/viewport.ts` — pure functions: `toScreen`, `toWorldCoords`, `applyWheel`, `applyPan`, `applyPinch`, `fitView`. No React, no DOM side effects.
- `src/attachPanZoom.ts` — attaches native wheel+touch listeners to an SVG element; returns a cleanup function. No React.
- `src/useGraphState.ts` — reducer-based graph state (nodes, edges, selection, mode, line drawing)
- `src/GraphCanvas.tsx` — SVG canvas, all pointer interaction (click, drag-to-connect, hover, pan, zoom)
- `src/Toolbar.tsx` — floating toolbar: mode toggle (Default / Line Drawing) + fit-view + delete + node color picker. All buttons always visible; fit-view disabled when no nodes (`onFitView` prop is `null`), delete disabled when nothing selected (`selection` prop is `null`). Color picker dimmed and disabled when no node is selected.
- `src/NodeColorPicker.tsx` — single swatch button that opens a `Popover` with color options. Reuses the `Swatch` component for both the trigger and the options. Selected swatch has a thicker `grey[400]` border; hover shows a `action.hover` outline; ripple disabled.
- `src/App.tsx` — root layout, wires state to canvas and toolbar; holds `viewport` (`x`, `y`, `scale`) state; passes it to `GraphCanvas`

### GraphCanvas props

```
state              GraphState        full graph state
viewport           Viewport          current pan/zoom
onViewportChange   (vp) => void      pan/zoom updates
onCanvasClick      (x, y) => void    click on empty space (world coords)
onNodeClick        (id) => void      click on a node
onEdgeClick        (id) => void      click on an edge
onNodeDragConnect  (from, to) => void drag from node to node in line-drawing mode
onNodeMove         (id, x, y) => void drag a node in default mode (world coords)
```

`cursorPos` (world coords of current pointer) is internal state in `GraphCanvas`, used only to render the dashed preview line.

### useGraphState actions

- `ADD_NODE` — adds node, auto-selects it
- `SELECT` — sets selection (pass `null` to clear)
- `SET_MODE` — changes mode, clears `lineDrawingFrom` and `selection` as side effects
- `START_LINE` — sets `lineDrawingFrom`, clears selection
- `FINISH_LINE` — completes edge if target differs from source and edge doesn't exist; clears `lineDrawingFrom`; auto-selects new edge
- `CANCEL_LINE` — clears `lineDrawingFrom` only
- `CONNECT` — like FINISH_LINE but without requiring `lineDrawingFrom` (used for drag-connect)
- `DELETE_SELECTED` — deletes selected node (and all its edges) or edge; clears selection
- `MOVE_NODE` — updates node position in place
- `SET_NODE_COLOR` — updates the `color` field of a node (hex string)

Edges are **undirected** for deduplication: A→B blocks B→A.

## Keyboard shortcuts

- **Escape** — clear selection and cancel any in-progress line draw
- **Tab** — toggle between default and line-drawing modes (prevented from default browser focus behavior)
- **Delete / Backspace** — delete the currently selected node (and its connected edges) or edge

Keyboard handler lives in `App.tsx` (`useEffect` on `window`). All shortcuts work regardless of where focus is.

## Graph editor behaviour

- Two modes: **default** and **line-drawing**, toggled via the Toolbar.
- **Default mode**: click empty space → add node (auto-selected); click node or edge → select it. Drag a node to reposition it (shows `grabbing` cursor while dragging).
- **Line-drawing mode**: click a node to start an edge, click another node to finish it; or drag from one node to another. Clicking an edge selects it (cancels any in-progress line draw). Clicking empty space cancels an in-progress draw.
- Adding a node or edge auto-selects it.
- Duplicate edges and self-connections are silently ignored.
- Edges have a wide invisible hit area (strokeWidth 20) for easier clicking.
- Drag gesture uses a ref (`dragTracking`) for raw gesture state; separate `dragSourceId` and `movingNodeId` states drive rendering so React re-renders correctly.
- Never read `ref.current` during render — use state for anything that affects the rendered output.
- **Pan/zoom**: viewport state (`x`, `y`, `scale`) lives in `App.tsx`. All positions are projected to screen space via `toScreen()` from `viewport.ts` before rendering — sizes (radii, stroke widths) are always fixed screen-pixel constants, so zoom moves positions only. Native (non-passive) `wheel` handles trackpad/mouse pan+zoom; native `touchstart`/`touchmove`/`touchend` handle one-finger pan and two-finger pinch-zoom on mobile. Math for all of these lives in `viewport.ts` (`applyWheel`, `applyPan`, `applyPinch`).
- **`data-interactive`** attribute is set on node and edge elements. Both the native touch handler and the SVG `onPointerDown` pan handler check for it and skip pan/zoom when the pointer started on an interactive element.
- **Stale-ref pattern**: `viewportRef` and `onViewportChangeRef` mirror their props into refs so native event handlers (wheel, touch) always see current values without needing to re-register on every render.
- **`DRAG_THRESHOLD`** (6px): for canvas pan it's in screen pixels; for node-drag it's in world coords. Same constant, different coordinate spaces.
- **SVG render order**: edge outlines → node outlines → edges → preview line → nodes. Outlines only render for selected or hovered elements; all have `pointerEvents: none`.
- **`cursorPos`** is internal state in `GraphCanvas` (world coords), used only to render the dashed preview line while drawing an edge.

## Key notes

- MUI v9 does not support shorthand system props (e.g. `mt={2}`). Always use the `sx` prop: `sx={{ mt: 2 }}`.
- `ThemeProvider` and `CssBaseline` are set up in `App.tsx` — all components render inside that tree.
- TypeScript is strict: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` are enabled. No `any`, no type assertions to bypass errors.
- Update CLAUDE.md as part of every task, not after. When a task changes the architecture, props, or file list, update CLAUDE.md before marking the task done.
