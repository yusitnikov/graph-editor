import { Box, Divider, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import NearMeIcon from '@mui/icons-material/NearMe'
import TimelineIcon from '@mui/icons-material/Timeline'
import DeleteIcon from '@mui/icons-material/Delete'
import type { Mode, SelectionTarget } from './types'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
  selection: SelectionTarget
  onDelete: () => void
}

export function Toolbar({ mode, onChange, selection, onDelete }: Props) {
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
      {selection && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title={`Delete selected ${selection.type}`}>
            <IconButton size="small" onClick={onDelete} aria-label="Delete selected">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Box>
  )
}
