import { Box, Typography } from '@mui/material'
import type { GraphState } from './types'

interface Props {
  state: GraphState
}

export function StatusBar({ state }: Props) {
  const { mode, lineDrawingFrom, selection } = state

  let hint = ''
  if (mode === 'line-drawing') {
    hint = lineDrawingFrom
      ? 'Click another node to connect, or click the same node to cancel'
      : 'Click a node to start drawing an edge'
  } else {
    hint = 'Click empty space to add a node · Click a node or edge to select it'
  }

  const selectionLabel =
    selection?.type === 'node'
      ? `Node selected`
      : selection?.type === 'edge'
        ? `Edge selected`
        : null

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        px: 2,
        py: 0.75,
        bgcolor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backdropFilter: 'blur(4px)',
      }}
    >
      <Typography variant="caption" sx={{ color: '#cfd8dc', flexGrow: 1 }}>
        {hint}
      </Typography>
      {selectionLabel && (
        <Typography variant="caption" sx={{ color: '#ef9a9a' }}>
          {selectionLabel}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: '#78909c' }}>
        {state.nodes.length} node{state.nodes.length !== 1 ? 's' : ''} · {state.edges.length} edge
        {state.edges.length !== 1 ? 's' : ''}
      </Typography>
    </Box>
  )
}
