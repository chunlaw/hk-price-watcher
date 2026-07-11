import { useEffect, useMemo, useState } from 'react';
import {
  ThemeProvider, CssBaseline, Box, CircularProgress, Typography, Alert, Container,
  type PaletteMode,
} from '@mui/material';
import { buildTheme } from './theme';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import { loadData, loadEmbeddings, type LoadedData } from './lib/data';
import { useLang } from './i18n/LangContext';

const MODE_KEY = 'hkpw.mode';

function initialMode(): PaletteMode {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(MODE_KEY) : null;
  if (saved === 'light' || saved === 'dark') return saved;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export default function App() {
  const { t } = useLang();
  const [mode, setMode] = useState<PaletteMode>(initialMode);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  const [data, setData] = useState<LoadedData | null>(null);
  const [embeddings, setEmbeddings] = useState<Float32Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadData()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // Embeddings are large and optional — load in the background.
        loadEmbeddings(d.meta).then((e) => !cancelled && setEmbeddings(e)).catch(() => {});
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMode = () => {
    setMode((m) => {
      const next = m === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(MODE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header mode={mode} onToggleMode={toggleMode} />

      {error ? (
        <Container maxWidth="sm" sx={{ mt: 6 }}>
          <Alert severity="error">Failed to load data: {error}</Alert>
        </Container>
      ) : !data ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 10 }}>
          <CircularProgress />
          <Typography color="text.secondary">{t('loading')}</Typography>
        </Box>
      ) : (
        <HomePage data={data} embeddings={embeddings} />
      )}
    </ThemeProvider>
  );
}
