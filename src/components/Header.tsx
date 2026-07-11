import {
  AppBar, Toolbar, Typography, Box, IconButton, ToggleButtonGroup,
  ToggleButton, Tooltip, useMediaQuery,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useLang } from '../i18n/LangContext';
import { LANGS, type Lang } from '../i18n/strings';

interface Props {
  mode: 'light' | 'dark';
  onToggleMode: () => void;
}

export default function Header({ mode, onToggleMode }: Props) {
  const { lang, setLang, t } = useLang();
  const compact = useMediaQuery('(max-width:600px)');

  return (
    <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar sx={{ gap: 1 }}>
        <ShoppingCartIcon color="primary" />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ lineHeight: 1.1 }}>
            {t('appTitle')}
          </Typography>
          {!compact && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {t('appSubtitle')}
            </Typography>
          )}
        </Box>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={lang}
          onChange={(_, v: Lang | null) => v && setLang(v)}
          aria-label="language"
        >
          {LANGS.map((l) => (
            <ToggleButton key={l.key} value={l.key} sx={{ px: 1.2, textTransform: 'none' }}>
              {l.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
          <IconButton onClick={onToggleMode} color="inherit" aria-label="toggle color mode">
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
