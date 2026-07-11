import { createTheme, type PaletteMode } from '@mui/material';

export function buildTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'light' ? '#1565c0' : '#64b5f6' },
      secondary: { main: '#ef6c00' },
      success: { main: '#2e7d32' },
      background:
        mode === 'light'
          ? { default: '#f5f6f8', paper: '#ffffff' }
          : { default: '#0f1419', paper: '#1a2027' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: [
        '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
        '"Noto Sans TC"', '"PingFang HK"', '"Microsoft JhengHei"',
        '"Helvetica Neue"', 'Arial', 'sans-serif',
      ].join(','),
      h6: { fontWeight: 700 },
    },
    components: {
      MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid', borderColor: mode === 'light' ? '#e6e8eb' : '#2a323c' } } },
      MuiButton: { defaultProps: { disableElevation: true } },
    },
  });
}
