import { useState, useEffect, useCallback, useRef } from 'react'
import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material'
import { useGraphState } from './useGraphState'
import { GraphCanvas } from './GraphCanvas'
import { Toolbar } from './Toolbar'
import { fitView } from './viewport'
import type { Viewport } from './types'

const theme = createTheme({ palette: { mode: 'light' } })

// Toolbar height + top offset — used to leave visual room for the toolbar when fitting nodes
const TOOLBAR_CLEARANCE = 80
const FIT_PADDING = 48

function App() {
  const { state, addNode, select, setMode, startLine, finishLine, cancelLine, connect, deleteSelected, moveNode } = useGraphState()
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        select(null)
        cancelLine()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        setMode(state.mode === 'default' ? 'line-drawing' : 'default')
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.mode, select, cancelLine, setMode, deleteSelected])

  const handleFitView = useCallback(() => {
    const container = containerRef.current
    const vp = fitView(state.nodes, {
      canvasWidth: container ? container.clientWidth : window.innerWidth,
      canvasHeight: container ? container.clientHeight : window.innerHeight,
      toolbarClearance: TOOLBAR_CLEARANCE,
      padding: FIT_PADDING,
    })
    if (vp) setViewport(vp)
  }, [state.nodes])

  const handleCanvasClick = (x: number, y: number) => {
    if (state.mode === 'default') {
      addNode(x, y)
    } else if (state.mode === 'line-drawing') {
      if (state.lineDrawingFrom) cancelLine()
    }
  }

  const handleNodeClick = (id: string) => {
    if (state.mode === 'default') {
      select({ type: 'node', id })
    } else if (state.mode === 'line-drawing') {
      if (!state.lineDrawingFrom) {
        startLine(id)
      } else if (state.lineDrawingFrom === id) {
        cancelLine()
      } else {
        finishLine(id)
      }
    }
  }

  const handleEdgeClick = (id: string) => {
    if (state.lineDrawingFrom) cancelLine()
    select({ type: 'edge', id })
  }

  const handleNodeDragConnect = (from: string, to: string) => {
    connect(from, to)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box ref={containerRef} sx={{ position: 'fixed', inset: 0, overflow: 'hidden', bgcolor: 'background.default' }}>
        <GraphCanvas
          state={state}
          viewport={viewport}
          onViewportChange={setViewport}
          onCanvasClick={handleCanvasClick}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onNodeDragConnect={handleNodeDragConnect}
          onNodeMove={moveNode}
          cursorPos={cursorPos}
          onPointerMove={(x, y) => setCursorPos({ x, y })}
          onPointerLeave={() => setCursorPos(null)}
        />
        <Toolbar mode={state.mode} onChange={setMode} selection={state.selection} onDelete={deleteSelected} onFitView={state.nodes.length > 0 ? handleFitView : null} />
      </Box>
    </ThemeProvider>
  )
}

export default App
