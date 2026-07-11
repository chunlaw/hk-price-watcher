import {
  Paper, InputBase, IconButton, Box, FormControlLabel, Switch,
  Tooltip, LinearProgress, Typography, Chip, Alert, Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useLang } from '../i18n/LangContext';
import type { ModelStatus } from '../lib/semantic';

interface Props {
  query: string;
  onQuery: (q: string) => void;
  semantic: boolean;
  onSemantic: (on: boolean) => void;
  semanticAvailable: boolean;
  modelStatus: ModelStatus;
  modelProgress: number;
  querying: boolean;
  modelError: string | null;
  onRetry: () => void;
}

export default function SearchBar({
  query, onQuery, semantic, onSemantic, semanticAvailable,
  modelStatus, modelProgress, querying, modelError, onRetry,
}: Props) {
  const { t } = useLang();

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', borderRadius: 3 }}
      >
        <SearchIcon sx={{ mx: 1, color: 'text.secondary' }} />
        <InputBase
          sx={{ flex: 1, fontSize: '1.05rem' }}
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          inputProps={{ 'aria-label': t('searchPlaceholder') }}
        />
        {query && (
          <IconButton size="small" onClick={() => onQuery('')} aria-label="clear">
            <ClearIcon fontSize="small" />
          </IconButton>
        )}
      </Paper>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
        <Tooltip title={semanticAvailable ? t('semanticHint') : t('semanticUnavailable')}>
          <FormControlLabel
            sx={{ mr: 0 }}
            control={
              <Switch
                size="small"
                checked={semantic && semanticAvailable}
                disabled={!semanticAvailable}
                onChange={(e) => onSemantic(e.target.checked)}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AutoAwesomeIcon fontSize="inherit" color={semantic ? 'primary' : 'disabled'} />
                <Typography variant="body2">{t('semanticSearch')}</Typography>
              </Box>
            }
          />
        </Tooltip>

        {semantic && semanticAvailable && modelStatus === 'ready' && (
          <Chip size="small" color="primary" variant="outlined" label={t('semanticOn')} />
        )}
        {semantic && semanticAvailable && modelStatus === 'ready' && (
          <Typography variant="caption" color="text.secondary">{t('multilingualHint')}</Typography>
        )}
        {querying && <Typography variant="caption" color="text.secondary">{t('embeddingQuery')}</Typography>}
      </Box>

      {semantic && semanticAvailable && modelStatus === 'loading' && (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">{t('loadingModel')}</Typography>
          <LinearProgress
            variant={modelProgress > 0 ? 'determinate' : 'indeterminate'}
            value={Math.round(modelProgress * 100)}
          />
        </Box>
      )}

      {semantic && semanticAvailable && modelStatus === 'error' && (
        <Alert
          severity="warning"
          sx={{ mt: 1 }}
          action={
            <Button color="inherit" size="small" onClick={onRetry}>
              {t('retry')}
            </Button>
          }
        >
          {t('modelErrorTitle')}
          {modelError && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
              {modelError}
            </Typography>
          )}
        </Alert>
      )}
    </Box>
  );
}
