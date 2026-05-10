import { useState } from 'react'
import { Box, IconButton, Popover } from '@mui/material'

const COLORS = [
  '#ffffff',
  '#9e9e9e',
  '#212121',
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#1e88e5',
  '#8e24aa',
]

interface SwatchProps {
  color: string
  selected: boolean
  disabled?: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}

function Swatch({ color, selected, disabled, onClick }: SwatchProps) {
  return (
    <IconButton
      onClick={onClick}
      disabled={disabled}
      size="small"
      sx={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        border: (theme) => `${selected ? 2 : 1}px solid ${theme.palette.grey[400]}`,
        p: 0,
        opacity: disabled ? 0.38 : 1,
        bgcolor: color,
        '&:hover': { bgcolor: color, outline: (theme) => `4px solid ${theme.palette.action.hover}` },
      }}
      disableRipple={true}
    />
  )
}

interface Props {
  color: string | null
  onChange: (color: string) => void
}

export function NodeColorPicker({ color, onChange }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

  const handlePick = (value: string) => {
    onChange(value)
    setAnchorEl(null)
  }

  return (
    <>
      <Swatch
        color={color ?? '#ffffff'}
        selected={false}
        disabled={color === null}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ display: 'flex', gap: 0.75, p: 1 }}>
          {COLORS.map((value) => (
            <Swatch
              key={value}
              color={value}
              selected={color === value}
              onClick={() => handlePick(value)}
            />
          ))}
        </Box>
      </Popover>
    </>
  )
}
