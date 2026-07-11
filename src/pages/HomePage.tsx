import { useMemo, useState, useCallback } from 'react';
import {
  Box, Container, Grid, Typography, Button, Drawer, IconButton, Paper,
  MenuItem, Select, FormControl, InputLabel, useMediaQuery, useTheme, Stack, Fade,
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
  const { lang, t } = useLang();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [visible, setVisible] = useState(PAGE);
  const [selected, setSelected] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const semanticAvailable = !!embeddings && !!data.meta.embedding;
  const { ranked, status, progress, querying } = useSemantic(
    embeddings,
    data.products.length,
    filters.query,
    filters.semantic && semanticAvailable,
  );

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
    } else {
      list = products.filter((p) => passesFacets(p, filters) && textMatch(p, filters.query));
    }

    // For semantic relevance ordering we keep similarity order; otherwise sort.
    if (usingSemantic && filters.sort === 'relevance') return list;
    return sortProducts(list, filters.sort, lang);
  }, [data.products, filters, ranked, semanticAvailable, lang]);

  const shown = results.slice(0, visible);

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
              {results.length} {t('results')}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <FormControl size="small" sx={{ minWidth: 180 }}>
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

          {shown.length === 0 ? (
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

      <ProductDialog product={selected} onClose={() => setSelected(null)} />
    </Container>
  );
}
