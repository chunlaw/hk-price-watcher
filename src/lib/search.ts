import type { Product } from './types';

export type SortKey = 'relevance' | 'priceAsc' | 'unitAsc' | 'name';

export interface FilterState {
  query: string;
  semantic: boolean;
  cat1: string | null;
  cat2: string | null;
  cat3: string | null;
  brand: string | null; // canonical brand key (brand.en || brand.zhHant)
  stores: string[]; // supermarket codes; empty = all
  onlyOffers: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: FilterState = {
  query: '',
  semantic: false,
  cat1: null,
  cat2: null,
  cat3: null,
  brand: null,
  stores: [],
  onlyOffers: false,
  sort: 'relevance',
};

/** Canonical key for a product's brand, used by the brand filter. */
export function brandKey(brand: { en: string; zhHant: string }): string {
  return brand.en || brand.zhHant;
}

function haystack(p: Product): string {
  return [
    p.name.en, p.name.zhHant,
    p.brand.en, p.brand.zhHant,
    p.cat1?.name.en, p.cat1?.name.zhHant,
    p.cat2?.name.en, p.cat2?.name.zhHant,
    p.cat3?.name.en, p.cat3?.name.zhHant,
    p.code,
  ].filter(Boolean).join(' ').toLowerCase();
}

/** Non-query filters shared by both text and semantic search paths. */
export function passesFacets(p: Product, f: FilterState): boolean {
  if (f.cat1 && (p.cat1?.code ?? p.cat1?.name.en) !== f.cat1) return false;
  if (f.cat2 && (p.cat2?.code ?? p.cat2?.name.en) !== f.cat2) return false;
  if (f.cat3 && (p.cat3?.code ?? p.cat3?.name.en) !== f.cat3) return false;
  if (f.brand && p.brand.en !== f.brand && p.brand.zhHant !== f.brand) return false;
  if (f.onlyOffers && !p.hasAnyOffer) return false;
  if (f.stores.length) {
    const set = new Set(f.stores);
    if (!p.offers.some((o) => set.has(o.supermarketCode))) return false;
  }
  return true;
}

/** Simple case-insensitive multi-token substring match across both languages. */
export function textMatch(p: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = haystack(p);
  return q.split(/\s+/).every((tok) => hay.includes(tok));
}

export function sortProducts(products: Product[], sort: SortKey, lang: 'en' | 'zhHant'): Product[] {
  const arr = [...products];
  const val = (p: Product) =>
    p.minEffectiveUnitPrice ?? p.minPrice ?? Number.POSITIVE_INFINITY;
  switch (sort) {
    case 'priceAsc':
      return arr.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
    case 'unitAsc':
      return arr.sort((a, b) => val(a) - val(b));
    case 'name':
      return arr.sort((a, b) =>
        (lang === 'en' ? a.name.en : a.name.zhHant).localeCompare(
          lang === 'en' ? b.name.en : b.name.zhHant,
          lang === 'en' ? 'en' : 'zh-Hant',
        ),
      );
    default:
      return arr; // relevance: preserve incoming order
  }
}
