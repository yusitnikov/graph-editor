import { useReducer } from 'react'
import type { GraphState, SelectionTarget, NodeId, Mode } from './types'

type Action =
  | { type: 'ADD_NODE'; x: number; y: number }
  | { type: 'SELECT'; target: SelectionTarget }
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'START_LINE'; from: NodeId }
  | { type: 'FINISH_LINE'; to: NodeId }
  | { type: 'CANCEL_LINE' }
  | { type: 'CONNECT'; from: NodeId; to: NodeId }
  | { type: 'DELETE_SELECTED' }
  | { type: 'MOVE_NODE'; id: NodeId; x: number; y: number }
  | { type: 'SET_NODE_COLOR'; id: NodeId; color: string }

let nextId = 1
const uid = () => String(nextId++)

const initialState: GraphState = {
  nodes: [],
  edges: [],
  selection: null,
  mode: 'default',
  lineDrawingFrom: null,
}

function reducer(state: GraphState, action: Action): GraphState {
  switch (action.type) {
    case 'ADD_NODE': {
      const id = uid()
      return {
        ...state,
        nodes: [...state.nodes, { id, x: action.x, y: action.y, color: '#9e9e9e' }],
        selection: { type: 'node', id },
      }
    }
    case 'SELECT':
      return { ...state, selection: action.target }
    case 'SET_MODE':
      return {
        ...state,
        mode: action.mode,
        lineDrawingFrom: null,
        selection: null,
      }
    case 'START_LINE':
      return { ...state, lineDrawingFrom: action.from, selection: null }
    case 'FINISH_LINE': {
      const from = state.lineDrawingFrom
      if (!from || from === action.to) return { ...state, lineDrawingFrom: null }
      const exists = state.edges.some(
        (e) =>
          (e.from === from && e.to === action.to) ||
          (e.from === action.to && e.to === from),
      )
      if (exists) return { ...state, lineDrawingFrom: null }
      const id = uid()
      return {
        ...state,
        edges: [...state.edges, { id, from, to: action.to }],
        lineDrawingFrom: null,
        selection: { type: 'edge', id },
      }
    }
    case 'CANCEL_LINE':
      return { ...state, lineDrawingFrom: null }
    case 'MOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((n) => n.id === action.id ? { ...n, x: action.x, y: action.y } : n),
      }
    case 'SET_NODE_COLOR':
      return {
        ...state,
        nodes: state.nodes.map((n) => n.id === action.id ? { ...n, color: action.color } : n),
      }
    case 'DELETE_SELECTED': {
      const { selection } = state
      if (!selection) return state
      if (selection.type === 'node') {
        return {
          ...state,
          nodes: state.nodes.filter((n) => n.id !== selection.id),
          edges: state.edges.filter((e) => e.from !== selection.id && e.to !== selection.id),
          selection: null,
        }
      }
      if (selection.type === 'edge') {
        return {
          ...state,
          edges: state.edges.filter((e) => e.id !== selection.id),
          selection: null,
        }
      }
      return state
    }
    case 'CONNECT': {
      if (action.from === action.to) return state
      const exists = state.edges.some(
        (e) =>
          (e.from === action.from && e.to === action.to) ||
          (e.from === action.to && e.to === action.from),
      )
      if (exists) return state
      const id = uid()
      return {
        ...state,
        edges: [...state.edges, { id, from: action.from, to: action.to }],
        lineDrawingFrom: null,
        selection: { type: 'edge', id },
      }
    }
    default:
      return state
  }
}

export function useGraphState() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const addNode = (x: number, y: number) => dispatch({ type: 'ADD_NODE', x, y })
  const select = (target: SelectionTarget) => dispatch({ type: 'SELECT', target })
  const setMode = (mode: Mode) => dispatch({ type: 'SET_MODE', mode })
  const startLine = (from: NodeId) => dispatch({ type: 'START_LINE', from })
  const finishLine = (to: NodeId) => dispatch({ type: 'FINISH_LINE', to })
  const cancelLine = () => dispatch({ type: 'CANCEL_LINE' })
  const connect = (from: NodeId, to: NodeId) => dispatch({ type: 'CONNECT', from, to })
  const deleteSelected = () => dispatch({ type: 'DELETE_SELECTED' })
  const moveNode = (id: NodeId, x: number, y: number) => dispatch({ type: 'MOVE_NODE', id, x, y })
  const setNodeColor = (id: NodeId, color: string) => dispatch({ type: 'SET_NODE_COLOR', id, color })

  return { state, addNode, select, setMode, startLine, finishLine, cancelLine, connect, deleteSelected, moveNode, setNodeColor }
}
