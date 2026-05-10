import { CssBaseline, ThemeProvider, createTheme, Container, Typography, Box } from '@mui/material'

const theme = createTheme()

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4">Graph Editor</Typography>
        </Box>
      </Container>
    </ThemeProvider>
  )
}

export default App