import { useState } from 'react'
import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material'
import { useGraphState } from './useGraphState'
import { GraphCanvas } from './GraphCanvas'
import { Toolbar } from './Toolbar'
import { StatusBar } from './StatusBar'

const theme = createTheme({ palette: { mode: 'dark' } })

function App() {
  const { state, addNode, select, setMode, startLine, finishLine, cancelLine, connect } = useGraphState()
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  const handleCanvasClick = (x: number, y: number) => {
    if (state.mode === 'default') {
      if (state.selection) {
        select(null)
      } else {
        addNode(x, y)
      }
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
    if (state.mode === 'default') {
      select({ type: 'edge', id })
    }
  }

  const handleNodeDragConnect = (from: string, to: string) => {
    connect(from, to)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', bgcolor: '#1a1a2e' }}>
        <GraphCanvas
          state={state}
          onCanvasClick={handleCanvasClick}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onNodeDragConnect={handleNodeDragConnect}
          cursorPos={cursorPos}
          onPointerMove={(x, y) => setCursorPos({ x, y })}
          onPointerLeave={() => setCursorPos(null)}
        />
        <Toolbar mode={state.mode} onChange={setMode} />
        <StatusBar state={state} />
      </Box>
    </ThemeProvider>
  )
}

export default App
