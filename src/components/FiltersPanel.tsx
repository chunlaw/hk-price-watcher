import {
  Box, Typography, FormControlLabel, Switch, Stack, Chip, Button, Divider,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useLang } from '../i18n/LangContext';
import CategoryTree from './CategoryTree';
import type { CategoryNode, SupermarketFacet } from '../lib/types';
import { EMPTY_FILTERS, type FilterState } from '../lib/search';

interface Props {
  categories: CategoryNode[];
  supermarkets: SupermarketFacet[];
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}

export default function FiltersPanel({ categories, supermarkets, filters, onChange }: Props) {
  const { loc, t } = useLang();

  const toggleStore = (code: string) => {
    const set = new Set(filters.stores);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    onChange({ stores: [...set] });
  };

  const hasActive =
    filters.cat1 || filters.stores.length || filters.onlyOffers || filters.query;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" fontWeight={700}>{t('filters')}</Typography>
        {hasActive && (
          <Button
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}
          >
            {t('clearFilters')}
          </Button>
        )}
      </Box>

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={filters.onlyOffers}
            onChange={(e) => onChange({ onlyOffers: e.target.checked })}
          />
        }
        label={t('onlyOffers')}
      />

      <Divider />
      <CategoryTree categories={categories} filters={filters} onChange={onChange} />

      <Divider />
      <Box>
        <Typography variant="overline" color="text.secondary">{t('supermarkets')}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
          {supermarkets.map((s) => {
            const active = filters.stores.includes(s.code);
            return (
              <Chip
                key={s.code}
                label={`${loc(s.name)} (${s.count})`}
                size="small"
                color={active ? 'primary' : 'default'}
                variant={active ? 'filled' : 'outlined'}
                onClick={() => toggleStore(s.code)}
              />
            );
          })}
        </Box>
      </Box>
    </Stack>
  );
}
