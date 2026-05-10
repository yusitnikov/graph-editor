import { Box, Divider, IconButton, ToggleButton, ToggleButtonGroup } from '@mui/material'
import NearMeIcon from '@mui/icons-material/NearMe'
import TimelineIcon from '@mui/icons-material/Timeline'
import DeleteIcon from '@mui/icons-material/Delete'
import FitScreenIcon from '@mui/icons-material/FitScreen'
import type { Mode, SelectionTarget } from './types'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
  selection: SelectionTarget
  onDelete: () => void
  onFitView: (() => void) | null
}

export function Toolbar({ mode, onChange, selection, onDelete, onFitView }: Props) {
  return (
    <Box
      data-toolbar="true"
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
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
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
        <ToggleButton value="default" aria-label="Default mode">
          <NearMeIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="line-drawing" aria-label="Line drawing mode">
          <TimelineIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <IconButton size="small" onClick={onFitView ?? undefined} disabled={!onFitView} aria-label="Fit view">
        <FitScreenIcon fontSize="small" />
      </IconButton>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <IconButton size="small" onClick={onDelete} disabled={!selection} aria-label="Delete selected">
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  )
}
