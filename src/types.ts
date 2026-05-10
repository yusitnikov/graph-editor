export type NodeId = string
export type EdgeId = string

export interface Node {
  id: NodeId
  x: number
  y: number
}

export interface Edge {
  id: EdgeId
  from: NodeId
  to: NodeId
}

export type SelectionTarget =
  | { type: 'node'; id: NodeId }
  | { type: 'edge'; id: EdgeId }
  | null

export type Mode = 'default' | 'line-drawing'

export interface Viewport {
  x: number
  y: number
  scale: number
}

export interface GraphState {
  nodes: Node[]
  edges: Edge[]
  selection: SelectionTarget
  mode: Mode
  lineDrawingFrom: NodeId | null
}
