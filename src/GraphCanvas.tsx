import { useRef, useState } from 'react'
import type { GraphState, NodeId } from './types'

const NODE_RADIUS = 20
const NODE_FILL = '#5c6bc0'
const NODE_FILL_HOVER = '#3949ab'
const NODE_FILL_SELECTED = '#e53935'
const NODE_FILL_LINE_SOURCE = '#f57c00'
const NODE_STROKE = '#fff'
const EDGE_STROKE = '#90a4ae'
const EDGE_STROKE_SELECTED = '#e53935'
const EDGE_STROKE_WIDTH = 2.5
const EDGE_STROKE_WIDTH_SELECTED = 4
const PREVIEW_STROKE = '#f57c00'

interface Props {
  state: GraphState
  onCanvasClick: (x: number, y: number) => void
  onNodeClick: (id: NodeId) => void
  onEdgeClick: (id: string) => void
  cursorPos: { x: number; y: number } | null
  onPointerMove: (x: number, y: number) => void
  onPointerLeave: () => void
}

export function GraphCanvas({
  state,
  onCanvasClick,
  onNodeClick,
  onEdgeClick,
  cursorPos,
  onPointerMove,
  onPointerLeave,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<NodeId | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)

  const toSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: clientX, y: clientY }
    const rect = svg.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = toSvgCoords(e.clientX, e.clientY)
    onPointerMove(x, y)
  }

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest('[data-interactive]')) return
    const { x, y } = toSvgCoords(e.clientX, e.clientY)
    onCanvasClick(x, y)
  }

  const handleNodePointerDown = (e: React.PointerEvent, id: NodeId) => {
    e.stopPropagation()
    onNodeClick(id)
  }

  const handleEdgePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    onEdgeClick(id)
  }

  const nodeMap = new Map(state.nodes.map((n) => [n.id, n]))
  const { lineDrawingFrom, selection, mode } = state

  const sourceNode = lineDrawingFrom ? nodeMap.get(lineDrawingFrom) : null

  const getCursorStyle = () => {
    if (mode === 'line-drawing') {
      return lineDrawingFrom ? 'crosshair' : 'default'
    }
    return 'default'
  }

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', cursor: getCursorStyle(), touchAction: 'none' }}
      onClick={handleSvgClick}
      onPointerMove={handleSvgPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {/* Edges */}
      {state.edges.map((edge) => {
        const from = nodeMap.get(edge.from)
        const to = nodeMap.get(edge.to)
        if (!from || !to) return null
        const isSelected = selection?.type === 'edge' && selection.id === edge.id
        const isHovered = hoveredEdge === edge.id
        return (
          <line
            key={edge.id}
            data-interactive="true"
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={isSelected ? EDGE_STROKE_SELECTED : EDGE_STROKE}
            strokeWidth={isSelected || isHovered ? EDGE_STROKE_WIDTH_SELECTED : EDGE_STROKE_WIDTH}
            strokeLinecap="round"
            style={{ cursor: mode === 'default' ? 'pointer' : 'default' }}
            onPointerDown={(e) => mode === 'default' && handleEdgePointerDown(e, edge.id)}
            onPointerEnter={() => mode === 'default' && setHoveredEdge(edge.id)}
            onPointerLeave={() => setHoveredEdge(null)}
          />
        )
      })}

      {/* Preview line while drawing */}
      {sourceNode && cursorPos && (
        <line
          x1={sourceNode.x}
          y1={sourceNode.y}
          x2={cursorPos.x}
          y2={cursorPos.y}
          stroke={PREVIEW_STROKE}
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Nodes */}
      {state.nodes.map((node) => {
        const isSelected = selection?.type === 'node' && selection.id === node.id
        const isSource = lineDrawingFrom === node.id
        const isHovered = hoveredNode === node.id

        let fill = NODE_FILL
        if (isSource) fill = NODE_FILL_LINE_SOURCE
        else if (isSelected) fill = NODE_FILL_SELECTED
        else if (isHovered) fill = NODE_FILL_HOVER

        return (
          <circle
            key={node.id}
            data-interactive="true"
            cx={node.x}
            cy={node.y}
            r={NODE_RADIUS}
            fill={fill}
            stroke={NODE_STROKE}
            strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onPointerDown={(e) => handleNodePointerDown(e, node.id)}
            onPointerEnter={() => setHoveredNode(node.id)}
            onPointerLeave={() => setHoveredNode(null)}
          />
        )
      })}
    </svg>
  )
}
