import { useRef, useState, useEffect, type PointerEvent, type MouseEvent } from 'react'
import { useTheme } from '@mui/material'
import type { GraphState, NodeId, Viewport } from './types'
import { toScreen as _toScreen, toWorldCoords as _toWorldCoords, applyWheel, applyPan, applyPinch } from './viewport'

const NODE_RADIUS = 12
const EDGE_STROKE_WIDTH = 2.5
const DRAG_THRESHOLD = 6


interface Props {
  state: GraphState
  viewport: Viewport
  onViewportChange: (vp: Viewport) => void
  onCanvasClick: (x: number, y: number) => void
  onNodeClick: (id: NodeId) => void
  onEdgeClick: (id: string) => void
  onNodeDragConnect: (from: NodeId, to: NodeId) => void
  onNodeMove: (id: NodeId, x: number, y: number) => void
  cursorPos: { x: number; y: number } | null
  onPointerMove: (x: number, y: number) => void
  onPointerLeave: () => void
}

interface DragTracking {
  fromId: NodeId
  startX: number
  startY: number
  dragging: boolean
  // for node-move in default mode: world-space offset from node center to pointer down point
  offsetX: number
  offsetY: number
}

interface PanTracking {
  startClientX: number
  startClientY: number
  clientX: number
  clientY: number
}

export function GraphCanvas({
  state,
  viewport,
  onViewportChange,
  onCanvasClick,
  onNodeClick,
  onEdgeClick,
  onNodeDragConnect,
  onNodeMove,
  cursorPos,
  onPointerMove,
  onPointerLeave,
}: Props) {
  const theme = useTheme()
  const p = theme.palette

  const NODE_FILL = '#ffffff'
  const NODE_STROKE = p.grey[800]
  const EDGE_STROKE = p.grey[600]
  const PREVIEW_STROKE = EDGE_STROKE
  const OUTLINE_COLOR = p.grey[400]

  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<NodeId | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const dragTracking = useRef<DragTracking | null>(null)
  const [dragSourceId, setDragSourceId] = useState<NodeId | null>(null)
  const [movingNodeId, setMovingNodeId] = useState<NodeId | null>(null)
  const panTracking = useRef<PanTracking | null>(null)
  const didPan = useRef(false)
  const didNodeDrag = useRef(false)
  // Ref so native handlers always see current viewport/callbacks without re-registering
  const viewportRef = useRef(viewport)
  // eslint-disable-next-line react-hooks/refs
  viewportRef.current = viewport
  const onViewportChangeRef = useRef(onViewportChange)
  // eslint-disable-next-line react-hooks/refs
  onViewportChangeRef.current = onViewportChange
  const stateRef = useRef(state)
  // eslint-disable-next-line react-hooks/refs
  stateRef.current = state

  const getSvgRect = () => svgRef.current?.getBoundingClientRect() ?? new DOMRect()

  const toWorldCoords = (clientX: number, clientY: number) =>
    _toWorldCoords(clientX, clientY, getSvgRect(), viewport)

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

  // Native non-passive wheel + touch listeners (passive:false needed for preventDefault)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      onViewportChangeRef.current(applyWheel(e, svg.getBoundingClientRect(), viewportRef.current))
    }

    // last touch positions, keyed by identifier
    const lastTouches = new Map<number, { x: number; y: number }>()

    // Touches that started on a node/edge are handled by pointer events; exclude them here
    const interactiveTouches = new Set<number>()

    const handleTouchStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const el = document.elementFromPoint(t.clientX, t.clientY)
        if (el?.closest('[data-interactive]')) {
          interactiveTouches.add(t.identifier)
        } else {
          lastTouches.set(t.identifier, { x: t.clientX, y: t.clientY })
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const vp = viewportRef.current
      const active = Array.from(e.touches).filter(t => !interactiveTouches.has(t.identifier))

      if (active.length === 1) {
        const t = active[0]
        const prev = lastTouches.get(t.identifier)
        if (prev) {
          onViewportChangeRef.current(applyPan(t.clientX - prev.x, t.clientY - prev.y, vp))
        }
        lastTouches.set(t.identifier, { x: t.clientX, y: t.clientY })
      } else if (active.length >= 2) {
        const t0 = active[0]
        const t1 = active[1]
        const prev0 = lastTouches.get(t0.identifier)
        const prev1 = lastTouches.get(t1.identifier)
        if (prev0 && prev1) {
          onViewportChangeRef.current(applyPinch(t0, t1, prev0, prev1, rect, vp))
        }
        lastTouches.set(t0.identifier, { x: t0.clientX, y: t0.clientY })
        lastTouches.set(t1.identifier, { x: t1.clientX, y: t1.clientY })
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        lastTouches.delete(t.identifier)
        interactiveTouches.delete(t.identifier)
      }
    }

    svg.addEventListener('wheel', handleWheel, { passive: false })
    svg.addEventListener('touchstart', handleTouchStart, { passive: false })
    svg.addEventListener('touchmove', handleTouchMove, { passive: false })
    svg.addEventListener('touchend', handleTouchEnd)
    return () => {
      svg.removeEventListener('wheel', handleWheel)
      svg.removeEventListener('touchstart', handleTouchStart)
      svg.removeEventListener('touchmove', handleTouchMove)
      svg.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const handleSvgPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest('[data-interactive]')) return
    // Touch-based pan is handled by the native touch handlers; skip touch pointers here
    if (e.pointerType === 'touch') return
    didPan.current = false
    panTracking.current = { startClientX: e.clientX, startClientY: e.clientY, clientX: e.clientX, clientY: e.clientY }
    ;(e.currentTarget as SVGElement).setPointerCapture(e.pointerId)
  }

  const handleSvgPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
    onPointerMove(x, y)

    if (panTracking.current) {
      const dx = e.clientX - panTracking.current.clientX
      const dy = e.clientY - panTracking.current.clientY
      const totalDx = e.clientX - panTracking.current.startClientX
      const totalDy = e.clientY - panTracking.current.startClientY
      if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > DRAG_THRESHOLD) didPan.current = true
      panTracking.current = { ...panTracking.current, clientX: e.clientX, clientY: e.clientY }
      onViewportChange({ ...viewport, x: viewport.x + dx, y: viewport.y + dy })
      return
    }

    const dt = dragTracking.current
    if (!dt) return

    if (!dt.dragging) {
      const dx = x - dt.startX
      const dy = y - dt.startY
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        dt.dragging = true
        if (state.mode === 'line-drawing') setDragSourceId(dt.fromId)
      }
    }

    if (dt.dragging) {
      if (state.mode === 'default') {
        if (movingNodeId !== dt.fromId) setMovingNodeId(dt.fromId)
        onNodeMove(dt.fromId, x - dt.offsetX, y - dt.offsetY)
      } else {
        const target = nodeAtPoint(x, y)
        setHoveredNode(target !== dt.fromId ? (target ?? null) : null)
      }
    }
  }

  const handleSvgPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    if (panTracking.current) {
      panTracking.current = null
      // didPan.current stays set until handleSvgClick consumes it
      return
    }

    const dt = dragTracking.current
    dragTracking.current = null
    setDragSourceId(null)

    if (!dt) return

    const { x, y } = toWorldCoords(e.clientX, e.clientY)

    // SVG capture means the click event that follows will land on the SVG background,
    // not the node — always suppress it so onCanvasClick doesn't fire.
    didNodeDrag.current = true

    if (dt.dragging) {
      if (state.mode === 'line-drawing') {
        const target = nodeAtPoint(x, y)
        if (target && target !== dt.fromId) {
          onNodeDragConnect(dt.fromId, target)
        }
        setHoveredNode(null)
      } else {
        setMovingNodeId(null)
      }
    } else {
      onNodeClick(dt.fromId)
    }
  }

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest('[data-interactive]')) return
    if (didPan.current) { didPan.current = false; return }
    if (didNodeDrag.current) { didNodeDrag.current = false; return }
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
    onCanvasClick(x, y)
  }

  const handleNodePointerDown = (e: PointerEvent, id: NodeId) => {
    e.stopPropagation()
    // Transfer capture to the SVG so pointer events keep firing there even when the
    // pointer leaves the node, goes over the toolbar, or exits the window bounds.
    svgRef.current?.setPointerCapture(e.pointerId)
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
    const node = stateRef.current.nodes.find((n) => n.id === id)
    const offsetX = node ? x - node.x : 0
    const offsetY = node ? y - node.y : 0
    dragTracking.current = { fromId: id, startX: x, startY: y, dragging: false, offsetX, offsetY }
  }

  const handleNodeClick = (e: MouseEvent) => {
    e.stopPropagation()
  }

  const handleEdgePointerDown = (e: PointerEvent) => {
    e.stopPropagation()
  }

  const handleEdgeClick = (e: MouseEvent, id: string) => {
    e.stopPropagation()
    onEdgeClick(id)
  }

  const nodeMap = new Map(state.nodes.map((n) => [n.id, n]))
  const { lineDrawingFrom, selection, mode } = state

  const isDragging = dragSourceId !== null && mode === 'line-drawing'
  const isMovingNode = movingNodeId !== null && mode === 'default'
  const effectiveSource = lineDrawingFrom ?? dragSourceId
  const sourceNode = effectiveSource ? nodeMap.get(effectiveSource) : null

  const toScreen = (wx: number, wy: number) => _toScreen(wx, wy, viewport)

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: isDragging ? 'crosshair' : isMovingNode ? 'grabbing' : 'default',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onClick={handleSvgClick}
      onPointerDown={handleSvgPointerDown}
      onPointerMove={handleSvgPointerMove}
      onPointerUp={handleSvgPointerUp}
      onPointerLeave={() => {
        panTracking.current = null
        didPan.current = false
        if (dragTracking.current) {
          dragTracking.current = null
          setDragSourceId(null)
          setMovingNodeId(null)
          setHoveredNode(null)
        }
        onPointerLeave()
      }}
    >
      {/* Edge outlines (rendered before everything else) */}
      {state.edges.map((edge) => {
        const from = nodeMap.get(edge.from)
        const to = nodeMap.get(edge.to)
        if (!from || !to) return null
        const isSelected = selection?.type === 'edge' && selection.id === edge.id
        const isHovered = hoveredEdge === edge.id
        if (!isSelected && !isHovered) return null
        const sf = toScreen(from.x, from.y)
        const st = toScreen(to.x, to.y)
        return (
          <line
            key={edge.id}
            x1={sf.x} y1={sf.y} x2={st.x} y2={st.y}
            stroke={OUTLINE_COLOR}
            strokeWidth={12}
            strokeLinecap="round"
            strokeOpacity={isSelected ? 0.7 : 0.4}
            style={{ pointerEvents: 'none' }}
          />
        )
      })}

      {/* Node outlines (rendered before main elements) */}
      {state.nodes.map((node) => {
        const isSelected = selection?.type === 'node' && selection.id === node.id
        const isSource = effectiveSource === node.id
        const isHovered = hoveredNode === node.id
        const isDragTarget = isDragging && isHovered && node.id !== dragSourceId
        if (!isSelected && !isSource && !isHovered && !isDragTarget) return null
        const isActive = isSelected || isSource || isDragTarget
        const sc = toScreen(node.x, node.y)
        return (
          <circle
            key={node.id}
            cx={sc.x}
            cy={sc.y}
            r={NODE_RADIUS}
            fill="none"
            stroke={OUTLINE_COLOR}
            strokeWidth={10}
            strokeOpacity={isActive ? 0.7 : 0.4}
            style={{ pointerEvents: 'none' }}
          />
        )
      })}

      {/* Edges */}
      {state.edges.map((edge) => {
        const from = nodeMap.get(edge.from)
        const to = nodeMap.get(edge.to)
        if (!from || !to) return null
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
            <line
              x1={sf.x} y1={sf.y} x2={st.x} y2={st.y}
              stroke={EDGE_STROKE}
              strokeWidth={EDGE_STROKE_WIDTH}
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
        const sc = toScreen(node.x, node.y)
        return (
          <circle
            key={node.id}
            data-interactive="true"
            cx={sc.x}
            cy={sc.y}
            r={NODE_RADIUS}
            fill={NODE_FILL}
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
