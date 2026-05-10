import { useRef, useState, useEffect } from 'react'
import type { GraphState, NodeId, Viewport } from './types'

const NODE_RADIUS = 20
const NODE_FILL = '#5c6bc0'
const NODE_FILL_HOVER = '#3949ab'
const NODE_FILL_SELECTED = '#e53935'
const NODE_FILL_SELECTED_HOVER = '#c62828'
const NODE_FILL_LINE_SOURCE = '#f57c00'
const NODE_FILL_DRAG_TARGET = '#00897b'
const NODE_STROKE = '#fff'
const EDGE_STROKE = '#90a4ae'
const EDGE_STROKE_HOVER = '#cfd8dc'
const EDGE_STROKE_SELECTED = '#e53935'
const EDGE_STROKE_SELECTED_HOVER = '#c62828'
const EDGE_STROKE_WIDTH = 2.5
const EDGE_STROKE_WIDTH_SELECTED = 4
const PREVIEW_STROKE = '#f57c00'
const DRAG_THRESHOLD = 6
const MIN_SCALE = 0.1
const MAX_SCALE = 10


interface Props {
  state: GraphState
  viewport: Viewport
  onViewportChange: (vp: Viewport) => void
  onCanvasClick: (x: number, y: number) => void
  onNodeClick: (id: NodeId) => void
  onEdgeClick: (id: string) => void
  onNodeDragConnect: (from: NodeId, to: NodeId) => void
  cursorPos: { x: number; y: number } | null
  onPointerMove: (x: number, y: number) => void
  onPointerLeave: () => void
}

interface DragTracking {
  fromId: NodeId
  startX: number
  startY: number
  dragging: boolean
}

export function GraphCanvas({
  state,
  viewport,
  onViewportChange,
  onCanvasClick,
  onNodeClick,
  onEdgeClick,
  onNodeDragConnect,
  cursorPos,
  onPointerMove,
  onPointerLeave,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<NodeId | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const dragTracking = useRef<DragTracking | null>(null)
  const [dragSourceId, setDragSourceId] = useState<NodeId | null>(null)
  // Ref so the native wheel handler always sees current viewport without re-registering
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport
  const onViewportChangeRef = useRef(onViewportChange)
  onViewportChangeRef.current = onViewportChange

  // Convert client coords → SVG element coords (ignoring viewport transform)
  const toSvgElementCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: clientX, y: clientY }
    const rect = svg.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  // Convert client coords → world (graph) coords, accounting for viewport
  const toWorldCoords = (clientX: number, clientY: number) => {
    const { x: sx, y: sy } = toSvgElementCoords(clientX, clientY)
    return {
      x: (sx - viewport.x) / viewport.scale,
      y: (sy - viewport.y) / viewport.scale,
    }
  }

  const nodeAtPoint = (wx: number, wy: number): NodeId | null => {
    // NODE_RADIUS is in screen pixels; convert to world-space radius for hit test
    const worldRadius = NODE_RADIUS / viewport.scale
    for (const node of state.nodes) {
      const dx = node.x - wx
      const dy = node.y - wy
      if (Math.sqrt(dx * dx + dy * dy) <= worldRadius) return node.id
    }
    return null
  }

  // Native non-passive wheel listener so preventDefault works
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const vp = viewportRef.current
      const rect = svg.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      if (e.ctrlKey || e.metaKey) {
        // deltaMode 0 = pixels (trackpad pinch sends small values ~1–5)
        // deltaMode 1 = lines, deltaMode 2 = pages (mouse wheel sends ~100 in pixel mode)
        const delta = e.deltaMode === 0 && Math.abs(e.deltaY) < 50
          ? e.deltaY * 10   // trackpad pinch: amplify the small pixel deltas
          : e.deltaY        // mouse ctrl+wheel: use as-is
        const zoomFactor = Math.pow(0.999, delta)
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale * zoomFactor))
        const newX = sx - (sx - vp.x) * (newScale / vp.scale)
        const newY = sy - (sy - vp.y) * (newScale / vp.scale)
        onViewportChangeRef.current({ x: newX, y: newY, scale: newScale })
      } else {
        onViewportChangeRef.current({ ...vp, x: vp.x - e.deltaX, y: vp.y - e.deltaY })
      }
    }
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [])

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
    onPointerMove(x, y)

    const dt = dragTracking.current
    if (!dt) return

    if (!dt.dragging && state.mode === 'line-drawing') {
      const dx = x - dt.startX
      const dy = y - dt.startY
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        dt.dragging = true
        setDragSourceId(dt.fromId)
      }
    }

    if (dt.dragging) {
      const target = nodeAtPoint(x, y)
      setHoveredNode(target !== dt.fromId ? (target ?? null) : null)
    }
  }

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const dt = dragTracking.current
    dragTracking.current = null
    setDragSourceId(null)

    if (!dt) return

    const { x, y } = toWorldCoords(e.clientX, e.clientY)

    if (dt.dragging && state.mode === 'line-drawing') {
      const target = nodeAtPoint(x, y)
      if (target && target !== dt.fromId) {
        onNodeDragConnect(dt.fromId, target)
      }
      setHoveredNode(null)
    } else {
      onNodeClick(dt.fromId)
    }
  }

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest('[data-interactive]')) return
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
    onCanvasClick(x, y)
  }

  const handleNodePointerDown = (e: React.PointerEvent, id: NodeId) => {
    e.stopPropagation()
    ;(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId)
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
    dragTracking.current = { fromId: id, startX: x, startY: y, dragging: false }
  }

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleEdgePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
  }

  const handleEdgeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onEdgeClick(id)
  }

  const nodeMap = new Map(state.nodes.map((n) => [n.id, n]))
  const { lineDrawingFrom, selection, mode } = state

  const isDragging = dragSourceId !== null && mode === 'line-drawing'
  const effectiveSource = lineDrawingFrom ?? dragSourceId
  const sourceNode = effectiveSource ? nodeMap.get(effectiveSource) : null

  // Project a world-space point to screen space
  const toScreen = (wx: number, wy: number) => ({
    x: wx * viewport.scale + viewport.x,
    y: wy * viewport.scale + viewport.y,
  })

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: isDragging ? 'crosshair' : 'default',
        touchAction: 'none',
      }}
      onClick={handleSvgClick}
      onPointerMove={handleSvgPointerMove}
      onPointerUp={handleSvgPointerUp}
      onPointerLeave={() => {
        if (dragTracking.current) {
          dragTracking.current = null
          setDragSourceId(null)
          setHoveredNode(null)
        }
        onPointerLeave()
      }}
    >
      {/* Edges */}
      {state.edges.map((edge) => {
        const from = nodeMap.get(edge.from)
        const to = nodeMap.get(edge.to)
        if (!from || !to) return null
        const isSelected = selection?.type === 'edge' && selection.id === edge.id
        const isHovered = hoveredEdge === edge.id
        const sf = toScreen(from.x, from.y)
        const st = toScreen(to.x, to.y)
        return (
          <g
            key={edge.id}
            data-interactive="true"
            style={{ cursor: 'pointer' }}
            onPointerDown={handleEdgePointerDown}
            onClick={(e) => handleEdgeClick(e, edge.id)}
            onPointerEnter={() => setHoveredEdge(edge.id)}
            onPointerLeave={() => setHoveredEdge(null)}
          >
            {/* invisible wide hit area */}
            <line
              x1={sf.x} y1={sf.y} x2={st.x} y2={st.y}
              stroke="transparent"
              strokeWidth={20}
              strokeLinecap="round"
            />
            {/* visible line */}
            <line
              x1={sf.x} y1={sf.y} x2={st.x} y2={st.y}
              stroke={
                isSelected && isHovered ? EDGE_STROKE_SELECTED_HOVER
                : isSelected ? EDGE_STROKE_SELECTED
                : isHovered ? EDGE_STROKE_HOVER
                : EDGE_STROKE
              }
              strokeWidth={isSelected || isHovered ? EDGE_STROKE_WIDTH_SELECTED : EDGE_STROKE_WIDTH}
              strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )
      })}

      {/* Preview line while drawing */}
      {sourceNode && cursorPos && (() => {
        const ss = toScreen(sourceNode.x, sourceNode.y)
        const sc = toScreen(cursorPos.x, cursorPos.y)
        return (
          <line
            x1={ss.x} y1={ss.y} x2={sc.x} y2={sc.y}
            stroke={PREVIEW_STROKE}
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinecap="round"
            style={{ pointerEvents: 'none' }}
          />
        )
      })()}

      {/* Nodes */}
      {state.nodes.map((node) => {
        const isSelected = selection?.type === 'node' && selection.id === node.id
        const isSource = effectiveSource === node.id
        const isHovered = hoveredNode === node.id
        const isDragTarget = isDragging && isHovered && node.id !== dragSourceId

        let fill = NODE_FILL
        if (isDragTarget) fill = NODE_FILL_DRAG_TARGET
        else if (isSource) fill = NODE_FILL_LINE_SOURCE
        else if (isSelected && isHovered) fill = NODE_FILL_SELECTED_HOVER
        else if (isSelected) fill = NODE_FILL_SELECTED
        else if (isHovered) fill = NODE_FILL_HOVER

        const sc = toScreen(node.x, node.y)
        return (
          <circle
            key={node.id}
            data-interactive="true"
            cx={sc.x}
            cy={sc.y}
            r={NODE_RADIUS}
            fill={fill}
            stroke={NODE_STROKE}
            strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onPointerDown={(e) => handleNodePointerDown(e, node.id)}
            onClick={handleNodeClick}
            onPointerEnter={() => !isDragging && setHoveredNode(node.id)}
            onPointerLeave={() => !isDragging && setHoveredNode(null)}
          />
        )
      })}
    </svg>
  )
}
