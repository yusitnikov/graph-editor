import { Box, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import NearMeIcon from '@mui/icons-material/NearMe'
import TimelineIcon from '@mui/icons-material/Timeline'
import type { Mode } from './types'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

export function Toolbar({ mode, onChange }: Props) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3,
        px: 1,
        py: 0.5,
      }}
    >
      <ToggleButtonGroup
        value={mode}
        exclusive
        size="small"
        onChange={(_e, value: Mode | null) => {
          if (value) onChange(value)
        }}
      >
        <Tooltip title="Default mode — click empty space to add node, click node/edge to select">
          <ToggleButton value="default" aria-label="Default mode">
            <NearMeIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Line drawing mode — click a node then another to draw an edge">
          <ToggleButton value="line-drawing" aria-label="Line drawing mode">
            <TimelineIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Box>
  )
}
