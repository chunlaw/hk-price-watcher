// Turn one raw Consumer Council product record into the compact, digested shape
// the website consumes. Pure data transformation — no network, no side effects.

import { digestOffer } from './offers.mjs';
import { supermarketName } from './supermarkets.mjs';

/** Pull an {en, zhHant} pair out of a raw multilingual object. */
function loc(obj) {
  if (!obj || typeof obj !== 'object') {
    const s = obj == null ? '' : String(obj);
    return { en: s, zhHant: s };
  }
  const en = obj.en ?? obj.EN ?? '';
  const zhHant = obj['zh-Hant'] ?? obj.zhHant ?? obj['zh-hant'] ?? obj['zh-Hans'] ?? en;
  return { en: String(en), zhHant: String(zhHant) };
}

function toNumber(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function category(codeField, nameField) {
  const name = loc(nameField);
  if (!name.en && !name.zhHant) return null;
  return { code: codeField != null ? String(codeField) : null, name };
}

/**
 * @param {any} raw one entry from pricewatch.json
 * @returns digested product, or null if it has no usable identity
 */
export function digestProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const code = raw.code != null ? String(raw.code) : null;
  if (!code) return null;

  const name = loc(raw.name);
  const brand = loc(raw.brand);

  const cat1 = category(raw.cat1Code, raw.cat1Name);
  const cat2 = category(raw.cat2Code, raw.cat2Name);
  const cat3 = category(raw.cat3Code, raw.cat3Name);

  // Index offer text by supermarket so we can pair it with the price row.
  const offerByStore = new Map();
  if (Array.isArray(raw.offers)) {
    for (const o of raw.offers) {
      if (!o || !o.supermarketCode) continue;
      const key = String(o.supermarketCode).toUpperCase();
      offerByStore.set(key, {
        en: o.en ?? o.EN ?? '',
        zhHant: o['zh-Hant'] ?? o.zhHant ?? o['zh-Hans'] ?? '',
      });
    }
  }

  const offers = [];
  const priceRows = Array.isArray(raw.prices) ? raw.prices : [];
  const seen = new Set();
  for (const p of priceRows) {
    if (!p || !p.supermarketCode) continue;
    const key = String(p.supermarketCode).toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const price = toNumber(p.price ?? p.current_price);
    const offerText = offerByStore.get(key) || null;
    const d = digestOffer(
      price,
      offerText ? offerText.en : null,
      offerText ? offerText.zhHant : null,
    );
    offers.push({
      supermarketCode: key,
      supermarket: supermarketName(key),
      offerText: offerText && (offerText.en || offerText.zhHant)
        ? { en: String(offerText.en || ''), zhHant: String(offerText.zhHant || '') }
        : null,
      ...d,
    });
  }

  // Also surface stores that only appear in the offers array (rare) with no price.
  for (const [key, offerText] of offerByStore) {
    if (seen.has(key)) continue;
    const d = digestOffer(null, offerText.en, offerText.zhHant);
    offers.push({
      supermarketCode: key,
      supermarket: supermarketName(key),
      offerText: offerText.en || offerText.zhHant
        ? { en: String(offerText.en || ''), zhHant: String(offerText.zhHant || '') }
        : null,
      ...d,
    });
  }

  const prices = offers.map((o) => o.price).filter((n) => n != null);
  const effUnit = offers
    .map((o) => (o.discountedUnitPrice != null ? o.discountedUnitPrice : o.unitPrice))
    .filter((n) => n != null);
  const discounted = offers.map((o) => o.discountedUnitPrice).filter((n) => n != null);

  const minPrice = prices.length ? Math.min(...prices) : null;
  const minEffectiveUnitPrice = effUnit.length ? Math.min(...effUnit) : null;
  const minDiscountedUnitPrice = discounted.length ? Math.min(...discounted) : null;

  let bestOffer = null;
  let bestVal = Infinity;
  for (const o of offers) {
    const v = o.discountedUnitPrice != null ? o.discountedUnitPrice : o.unitPrice;
    if (v != null && v < bestVal) {
      bestVal = v;
      bestOffer = o;
    }
  }
  const bestIsDeal = bestOffer != null && bestOffer.discountedUnitPrice != null;

  return {
    code,
    name,
    brand,
    cat1,
    cat2,
    cat3,
    offers,
    storeCount: offers.length,
    hasAnyOffer: offers.some((o) => o.hasOffer),
    minPrice,
    minEffectiveUnitPrice,
    minDiscountedUnitPrice,
    bestStore: bestOffer ? bestOffer.supermarketCode : null,
    // Best-deal summary for the card: to reach the lowest effective unit price,
    // how much must you buy / spend at minimum.
    bestIsDeal,
    bestMinQuantity: bestIsDeal ? bestOffer.minQuantity : null,
    bestMinCost: bestIsDeal ? bestOffer.minCost : null,
  };
}

/** Text used to build the search embedding for a product (both languages). */
export function embeddingText(p) {
  const parts = [
    p.name.zhHant, p.name.en,
    p.brand.zhHant, p.brand.en,
    p.cat1?.name.zhHant, p.cat1?.name.en,
    p.cat2?.name.zhHant, p.cat2?.name.en,
    p.cat3?.name.zhHant, p.cat3?.name.en,
  ].filter(Boolean);
  return parts.join(' · ');
}

/** Build the category tree + supermarket list for the site's filter UI. */
export function buildFacets(products) {
  const cat = new Map(); // cat1Key -> {code,name, children: Map cat2Key -> {..., children: Map cat3}}
  const stores = new Map();

  const ensure = (map, key, value) => {
    if (!map.has(key)) map.set(key, value());
    return map.get(key);
  };

  for (const p of products) {
    for (const o of p.offers) {
      if (!stores.has(o.supermarketCode)) {
        stores.set(o.supermarketCode, { code: o.supermarketCode, name: o.supermarket, count: 0 });
      }
      stores.get(o.supermarketCode).count += 1;
    }
    if (!p.cat1) continue;
    const c1 = ensure(cat, p.cat1.code || p.cat1.name.en, () => ({
      code: p.cat1.code, name: p.cat1.name, count: 0, children: new Map(),
    }));
    c1.count += 1;
    if (p.cat2) {
      const c2 = ensure(c1.children, p.cat2.code || p.cat2.name.en, () => ({
        code: p.cat2.code, name: p.cat2.name, count: 0, children: new Map(),
      }));
      c2.count += 1;
      if (p.cat3) {
        const c3 = ensure(c2.children, p.cat3.code || p.cat3.name.en, () => ({
          code: p.cat3.code, name: p.cat3.name, count: 0,
        }));
        c3.count += 1;
      }
    }
  }

  const mapTree = (m) => [...m.values()]
    .map((n) => ({
      code: n.code,
      name: n.name,
      count: n.count,
      children: n.children ? mapTree(n.children) : undefined,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    categories: mapTree(cat),
    supermarkets: [...stores.values()].sort((a, b) => b.count - a.count),
  };
}
