import { useMemo, useState, useCallback } from 'react';
import {
  Box, Container, Grid, Typography, Button, Drawer, IconButton, Paper,
  MenuItem, Select, FormControl, InputLabel, useMediaQuery, useTheme, Stack, Fade,
  CircularProgress, LinearProgress, Chip,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useLang } from '../i18n/LangContext';
import SearchBar from '../components/SearchBar';
import FiltersPanel from '../components/FiltersPanel';
import ProductCard from '../components/ProductCard';
import ProductDialog from '../components/ProductDialog';
import { useSemantic } from '../hooks/useSemantic';
import { formatDate } from '../lib/format';
import {
  EMPTY_FILTERS, passesFacets, textMatch, sortProducts,
  type FilterState, type SortKey,
} from '../lib/search';
import type { LoadedData } from '../lib/data';
import type { Product } from '../lib/types';

interface Props {
  data: LoadedData;
  embeddings: Float32Array | null;
}

const PAGE = 24;
// Cosine cutoff below which a semantic match is considered irrelevant. If too
// few pass, we still show a handful of best matches so the user isn't stranded.
const SEM_THRESHOLD = 0.3;
const SEM_MIN_RESULTS = 12;

export default function HomePage({ data, embeddings }: Props) {
  const { lang, t, loc } = useLang();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [visible, setVisible] = useState(PAGE);
  const [selected, setSelected] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const semanticAvailable = !!embeddings && !!data.meta.embedding;
  const { ranked, status, progress, querying, error, retry } = useSemantic(
    embeddings,
    data.products.length,
    filters.query,
    filters.semantic && semanticAvailable,
  );

  // When smart search is on with a query but the model isn't ready yet, we must
  // NOT quietly fall back to keyword search — for non-Latin queries (e.g. Thai)
  // that would look like "no results". Instead surface the real state.
  const semanticActive = filters.semantic && semanticAvailable && !!filters.query.trim();
  const semanticPending = semanticActive && status !== 'error' && !ranked;
  const semanticError = semanticActive && status === 'error';

  const patch = useCallback((p: Partial<FilterState>) => {
    setFilters((f) => ({ ...f, ...p }));
    setVisible(PAGE);
  }, []);

  const results = useMemo(() => {
    const products = data.products;
    const usingSemantic = filters.semantic && semanticAvailable && filters.query.trim() && ranked;

    let list: Product[];
    if (usingSemantic) {
      // Walk products in similarity order, keep those passing facets + threshold.
      const passing: Product[] = [];
      const fallback: Product[] = [];
      for (const { index, score } of ranked!) {
        const p = products[index];
        if (!p || !passesFacets(p, filters)) continue;
        if (score >= SEM_THRESHOLD) passing.push(p);
        else if (fallback.length < SEM_MIN_RESULTS) fallback.push(p);
      }
      list = passing.length >= SEM_MIN_RESULTS ? passing : [...passing, ...fallback];
    } else if (semanticActive) {
      // Smart search is on but the model isn't ready — don't keyword-fall-back
      // (it would look empty for non-Latin queries). The UI shows a status panel.
      return [];
    } else {
      list = products.filter((p) => passesFacets(p, filters) && textMatch(p, filters.query));
    }

    // For semantic relevance ordering we keep similarity order; otherwise sort.
    if (usingSemantic && filters.sort === 'relevance') return list;
    return sortProducts(list, filters.sort, lang);
  }, [data.products, filters, ranked, semanticAvailable, semanticActive, lang]);

  const shown = results.slice(0, visible);

  // Localized labels for the active brand / category filters (shown as removable
  // chips so the applied tag filter is visible and clearable).
  const keyOf = (n: { code: string | null; name: { en: string; zhHant: string } }) => n.code ?? n.name.en;
  const activeCategoryLabel = useMemo(() => {
    if (!filters.cat1) return null;
    const c1 = data.facets.categories.find((c) => keyOf(c) === filters.cat1);
    if (!c1) return null;
    const parts = [c1.name];
    if (filters.cat2) {
      const c2 = c1.children?.find((c) => keyOf(c) === filters.cat2);
      if (c2) {
        parts.push(c2.name);
        if (filters.cat3) {
          const c3 = c2.children?.find((c) => keyOf(c) === filters.cat3);
          if (c3) parts.push(c3.name);
        }
      }
    }
    return parts.map(loc).join(' / ');
  }, [filters.cat1, filters.cat2, filters.cat3, data.facets.categories, loc]);

  const activeBrandLabel = useMemo(() => {
    if (!filters.brand) return null;
    const p = data.products.find((pr) => pr.brand.en === filters.brand || pr.brand.zhHant === filters.brand);
    return p ? loc(p.brand) : filters.brand;
  }, [filters.brand, data.products, loc]);

  const filtersNode = (
    <FiltersPanel
      categories={data.facets.categories}
      supermarkets={data.facets.supermarkets}
      filters={filters}
      onChange={patch}
    />
  );

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <SearchBar
        query={filters.query}
        onQuery={(q) => patch({ query: q })}
        semantic={filters.semantic}
        onSemantic={(on) => patch({ semantic: on })}
        semanticAvailable={semanticAvailable}
        modelStatus={status}
        modelProgress={progress}
        querying={querying}
        modelError={error}
        onRetry={retry}
      />

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        {!isMobile && (
          <Grid item md={3} lg={2.5}>
            <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 80 }}>
              {filtersNode}
            </Paper>
          </Grid>
        )}

        <Grid item xs={12} md={9} lg={9.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            {isMobile && (
              <Button variant="outlined" size="small" startIcon={<TuneIcon />} onClick={() => setDrawerOpen(true)}>
                {t('filters')}
              </Button>
            )}
            <Typography variant="body2" color="text.secondary">
              {semanticPending || semanticError ? '' : `${results.length} ${t('results')}`}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <FormControl size="small" sx={{ minWidth: { xs: 150, sm: 180 } }}>
              <InputLabel id="sort-label">{t('sortBy')}</InputLabel>
              <Select
                labelId="sort-label"
                label={t('sortBy')}
                value={filters.sort}
                onChange={(e) => patch({ sort: e.target.value as SortKey })}
              >
                <MenuItem value="relevance">{t('sortRelevance')}</MenuItem>
                <MenuItem value="priceAsc">{t('sortPriceAsc')}</MenuItem>
                <MenuItem value="unitAsc">{t('sortUnitAsc')}</MenuItem>
                <MenuItem value="name">{t('sortName')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {(activeBrandLabel || activeCategoryLabel) && (
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }} useFlexGap alignItems="center">
              <Typography variant="caption" color="text.secondary">{t('filteredBy')}:</Typography>
              {activeBrandLabel && (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={`${t('brand')}: ${activeBrandLabel}`}
                  onDelete={() => patch({ brand: null })}
                />
              )}
              {activeCategoryLabel && (
                <Chip
                  size="small"
                  label={activeCategoryLabel}
                  onDelete={() => patch({ cat1: null, cat2: null, cat3: null })}
                />
              )}
            </Stack>
          )}

          {semanticError ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>{t('modelErrorTitle')}</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>{t('modelErrorBody')}</Typography>
              <Button variant="contained" onClick={retry}>{t('retry')}</Button>
              {error && (
                <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 2, wordBreak: 'break-word' }}>
                  {error}
                </Typography>
              )}
            </Paper>
          ) : semanticPending ? (
            <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography color="text.secondary">
                {status === 'loading' ? t('loadingModelBig') : t('embeddingQuery')}
              </Typography>
              {status === 'loading' && progress > 0 && (
                <Box sx={{ maxWidth: 320, mx: 'auto', mt: 2 }}>
                  <LinearProgress variant="determinate" value={Math.round(progress * 100)} />
                </Box>
              )}
            </Paper>
          ) : shown.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('noResults')}</Typography>
              <Button sx={{ mt: 2 }} onClick={() => patch({ ...EMPTY_FILTERS })}>{t('clearFilters')}</Button>
            </Paper>
          ) : (
            <Fade in>
              <Grid container spacing={1.5}>
                {shown.map((p) => (
                  <Grid item xs={12} sm={6} lg={4} xl={3} key={p.code}>
                    <ProductCard product={p} onClick={() => setSelected(p)} />
                  </Grid>
                ))}
              </Grid>
            </Fade>
          )}

          {visible < results.length && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button variant="outlined" onClick={() => setVisible((v) => v + PAGE)}>
                {t('loadMore')} ({results.length - visible})
              </Button>
            </Box>
          )}

          <Stack spacing={0.5} sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            {data.meta.generatedAt && (
              <Typography variant="caption" color="text.secondary">
                {t('updated')}: {formatDate(data.meta.generatedAt, lang)} · {data.meta.productCount} {t('productsIn')}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">{t('dataSource')}</Typography>
          </Stack>
        </Grid>
      </Grid>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 300, p: 2 }} role="presentation">
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton onClick={() => setDrawerOpen(false)} aria-label={t('close')}>
              <TuneIcon />
            </IconButton>
          </Box>
          {filtersNode}
        </Box>
      </Drawer>

      <ProductDialog
        product={selected}
        onClose={() => setSelected(null)}
        onFilter={(p) => {
          patch(p);
          setSelected(null);
        }}
      />
    </Container>
  );
}
