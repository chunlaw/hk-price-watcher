import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Chip,
  Stack, Tooltip, useMediaQuery, useTheme, Paper, Divider, Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import VerifiedIcon from '@mui/icons-material/Verified';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import ShoppingBasketOutlinedIcon from '@mui/icons-material/ShoppingBasketOutlined';
import { useLang } from '../i18n/LangContext';
import { money } from '../lib/format';
import type { Product, StoreOffer } from '../lib/types';

interface Props {
  product: Product | null;
  onClose: () => void;
}

function effUnit(o: StoreOffer): number | null {
  return o.discountedUnitPrice ?? o.unitPrice;
}

function StoreRow({ offer, best }: { offer: StoreOffer; best: boolean }) {
  const { loc, t } = useLang();
  const discounted = offer.discountedUnitPrice != null;
  const eff = effUnit(offer);
  // Total saved if you buy the minimum qualifying quantity.
  const saveTotal =
    discounted && offer.unitPrice != null && offer.minQuantity != null && offer.minCost != null
      ? offer.unitPrice * offer.minQuantity - offer.minCost
      : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderColor: best ? 'success.main' : 'divider',
        borderWidth: best ? 2 : 1,
        bgcolor: best ? 'action.hover' : 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        {/* Left: store + offer text */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" fontWeight={best ? 800 : 600}>
              {loc(offer.supermarket)}
            </Typography>
            {best && <Chip size="small" color="success" label={t('bestDeal')} sx={{ height: 20 }} />}
          </Stack>

          {offer.offerText && loc(offer.offerText) ? (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }} useFlexGap>
              <LocalOfferIcon fontSize="inherit" color="secondary" />
              <Typography variant="body2" color="text.secondary">{loc(offer.offerText)}</Typography>
              {offer.offerParsed && (
                <Tooltip title={t('offerParsedNote')}>
                  <VerifiedIcon fontSize="inherit" color="disabled" />
                </Tooltip>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>—</Typography>
          )}
        </Box>

        {/* Right: effective unit price */}
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography
            variant="h6"
            color={discounted ? 'success.main' : 'text.primary'}
            sx={{ lineHeight: 1.1 }}
          >
            {money(eff)}
          </Typography>
          <Typography variant="caption" color="text.secondary">{t('perUnit')}</Typography>
          {discounted && offer.unitPrice != null && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
              {money(offer.unitPrice)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* The "唔好洗大咗" line: what you must actually spend to get this deal. */}
      {discounted && (offer.minCost != null || offer.minQuantity != null) && (
        <>
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {offer.minQuantity != null && (
              <Chip
                size="small"
                variant="outlined"
                icon={<ShoppingBasketOutlinedIcon />}
                label={`${t('needBuy')} ${offer.minQuantity} ${t('units')}`}
              />
            )}
            {offer.minCost != null && (
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label={`${t('minCost')}: ${money(offer.minCost)}`}
              />
            )}
            {offer.minSpend != null && offer.minQuantity == null && (
              <Chip size="small" variant="outlined" label={`${t('minSpend')}: ${money(offer.minSpend)}`} />
            )}
            {saveTotal != null && saveTotal > 0 && (
              <Typography variant="caption" color="success.main" fontWeight={700}>
                {t('save')} {money(saveTotal)}
              </Typography>
            )}
          </Stack>
        </>
      )}
    </Paper>
  );
}

export default function ProductDialog({ product, onClose }: Props) {
  const { loc, t } = useLang();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  if (!product) return null;

  const sorted = [...product.offers].sort((a, b) => (effUnit(a) ?? Infinity) - (effUnit(b) ?? Infinity));
  const bestCode = sorted.find((o) => effUnit(o) != null)?.supermarketCode;
  const cats = [product.cat1, product.cat2, product.cat3].filter(Boolean);
  const anyMinQty = product.offers.some((o) => o.discountedUnitPrice != null && (o.minQuantity ?? 0) > 1);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen} scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        <Typography variant="h6" component="div" sx={{ lineHeight: 1.25 }}>{loc(product.name)}</Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
          {loc(product.brand) && <Chip size="small" variant="outlined" label={loc(product.brand)} />}
          {cats.map((c, i) => (
            <Chip key={i} size="small" label={loc(c!.name)} />
          ))}
        </Stack>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label={t('close')}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 1.5, sm: 3 } }}>
        {anyMinQty && (
          <Alert severity="info" icon={<SavingsOutlinedIcon />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={800}>{t('spendWiselyTitle')}</Typography>
            <Typography variant="caption">{t('spendWiselyBody')}</Typography>
          </Alert>
        )}

        <Typography variant="subtitle2" gutterBottom>{t('priceByStore')}</Typography>
        <Stack spacing={1}>
          {sorted.map((o) => (
            <StoreRow key={o.supermarketCode} offer={o} best={o.supermarketCode === bestCode} />
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">{t('disclaimer')}</Typography>
      </DialogContent>
    </Dialog>
  );
}
