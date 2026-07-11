import { Card, CardActionArea, CardContent, Box, Typography, Chip, Stack } from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useLang } from '../i18n/LangContext';
import { money } from '../lib/format';
import type { Product } from '../lib/types';

interface Props {
  product: Product;
  onClick: () => void;
}

export default function ProductCard({ product, onClick }: Props) {
  const { loc, t } = useLang();
  const hasDeal = product.minDiscountedUnitPrice != null;

  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%', alignItems: 'stretch' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {product.brand && loc(product.brand) && (
              <Chip size="small" variant="outlined" label={loc(product.brand)} />
            )}
            {product.cat3 || product.cat2 || product.cat1 ? (
              <Chip
                size="small"
                color="default"
                label={loc((product.cat3 ?? product.cat2 ?? product.cat1)!.name)}
              />
            ) : null}
          </Box>

          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {loc(product.name)}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">{t('from')}</Typography>
            <Typography variant="h6" color={hasDeal ? 'success.main' : 'text.primary'}>
              {money(product.minEffectiveUnitPrice ?? product.minPrice)}
            </Typography>
            <Typography variant="caption" color="text.secondary">{t('perUnit')}</Typography>
            {hasDeal && product.minPrice != null && product.minPrice > (product.minDiscountedUnitPrice ?? 0) && (
              <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                {money(product.minPrice)}
              </Typography>
            )}
          </Stack>

          {/* "唔好洗大咗": if the best unit price needs buying several, say so up front. */}
          {product.bestIsDeal && product.bestMinCost != null && (product.bestMinQuantity ?? 0) > 1 && (
            <Typography variant="caption" color="warning.main">
              {t('needBuy')} {product.bestMinQuantity} {t('units')} · {t('minCostShort')} {money(product.bestMinCost)}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              size="small"
              icon={<StorefrontIcon />}
              variant="outlined"
              label={`${product.storeCount}`}
            />
            {product.hasAnyOffer && (
              <Chip size="small" color="secondary" icon={<LocalOfferIcon />} label={t('offer')} />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
