import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack,
  Tooltip, useMediaQuery, useTheme, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useLang } from '../i18n/LangContext';
import { money } from '../lib/format';
import type { Product, StoreOffer } from '../lib/types';

interface Props {
  product: Product | null;
  onClose: () => void;
}

function bestUnit(o: StoreOffer): number | null {
  return o.discountedUnitPrice ?? o.unitPrice;
}

export default function ProductDialog({ product, onClose }: Props) {
  const { loc, t } = useLang();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  if (!product) return null;

  const sorted = [...product.offers].sort(
    (a, b) => (bestUnit(a) ?? Infinity) - (bestUnit(b) ?? Infinity),
  );
  const cheapest = sorted.find((o) => bestUnit(o) != null);
  const cats = [product.cat1, product.cat2, product.cat3].filter(Boolean);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen} scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        <Typography variant="h6" component="div">{loc(product.name)}</Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
          {loc(product.brand) && <Chip size="small" variant="outlined" label={`${t('brand')}: ${loc(product.brand)}`} />}
          {cats.map((c, i) => (
            <Chip key={i} size="small" label={loc(c!.name)} />
          ))}
          <Chip size="small" variant="outlined" label={product.code} />
        </Stack>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label={t('close')}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="subtitle2" gutterBottom>{t('priceByStore')}</Typography>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('store')}</TableCell>
                <TableCell align="right">{t('regularPrice')}</TableCell>
                <TableCell>{t('offer')}</TableCell>
                <TableCell align="right">{t('effectiveUnit')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((o) => {
                const isBest = cheapest && o.supermarketCode === cheapest.supermarketCode;
                return (
                  <TableRow key={o.supermarketCode} hover selected={!!isBest}>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" fontWeight={isBest ? 700 : 400}>
                          {loc(o.supermarket)}
                        </Typography>
                        {isBest && (
                          <Chip size="small" color="success" label={t('bestDeal')} sx={{ height: 18 }} />
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="body2">{o.price != null ? money(o.price) : t('noPrice')}</Typography>
                    </TableCell>

                    <TableCell>
                      {o.offerText && (loc(o.offerText)) ? (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                          <LocalOfferIcon fontSize="inherit" color="secondary" />
                          <Typography variant="body2">{loc(o.offerText)}</Typography>
                          {o.offerParsed && (
                            <Tooltip title={t('offerParsedNote')}>
                              <VerifiedIcon fontSize="inherit" color="disabled" />
                            </Tooltip>
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                      {(o.minQuantity != null || o.minSpend != null) && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {o.minQuantity != null && `${t('minBuy')} ${o.minQuantity} ${t('units')}`}
                          {o.minQuantity != null && o.minSpend != null && ' · '}
                          {o.minSpend != null && `${t('minSpend')} ${money(o.minSpend)}`}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="right">
                      {o.discountedUnitPrice != null ? (
                        <Box>
                          <Typography variant="body2" color="success.main" fontWeight={700}>
                            {money(o.discountedUnitPrice)}
                          </Typography>
                          {o.unitPrice != null && (
                            <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                              {money(o.unitPrice)}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2">{o.unitPrice != null ? money(o.unitPrice) : t('noPrice')}</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          {t('disclaimer')}
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
