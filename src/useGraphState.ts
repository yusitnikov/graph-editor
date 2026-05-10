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
    case 'ADD_NODE':
      return {
        ...state,
        nodes: [...state.nodes, { id: uid(), x: action.x, y: action.y }],
        selection: null,
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
      return {
        ...state,
        edges: [...state.edges, { id: uid(), from, to: action.to }],
        lineDrawingFrom: null,
      }
    }
    case 'CANCEL_LINE':
      return { ...state, lineDrawingFrom: null }
    case 'CONNECT': {
      if (action.from === action.to) return state
      const exists = state.edges.some(
        (e) =>
          (e.from === action.from && e.to === action.to) ||
          (e.from === action.to && e.to === action.from),
      )
      if (exists) return state
      return {
        ...state,
        edges: [...state.edges, { id: uid(), from: action.from, to: action.to }],
        lineDrawingFrom: null,
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

  return { state, addNode, select, setMode, startLine, finishLine, cancelLine, connect }
}
