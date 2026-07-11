// These types mirror the output of scripts/lib/digest.mjs. Keep them in sync.

export type Loc = { en: string; zhHant: string };

export interface Category {
  code: string | null;
  name: Loc;
}

export interface StoreOffer {
  supermarketCode: string;
  supermarket: Loc;
  offerText: Loc | null;
  price: number | null;
  unitPrice: number | null;
  hasOffer: boolean;
  offerParsed: boolean;
  offerKind: string | null;
  minQuantity: number | null;
  minSpend: number | null;
  discountedTotal: number | null;
  discountedUnitPrice: number | null;
  /** Minimum outlay to unlock the discounted unit price (the 唔好洗大咗 number). */
  minCost: number | null;
}

export interface Product {
  code: string;
  name: Loc;
  brand: Loc;
  cat1: Category | null;
  cat2: Category | null;
  cat3: Category | null;
  offers: StoreOffer[];
  storeCount: number;
  hasAnyOffer: boolean;
  minPrice: number | null;
  minEffectiveUnitPrice: number | null;
  minDiscountedUnitPrice: number | null;
  bestStore: string | null;
  bestIsDeal: boolean;
  bestMinQuantity: number | null;
  bestMinCost: number | null;
}

export interface CategoryNode {
  code: string | null;
  name: Loc;
  count: number;
  children?: CategoryNode[];
}

export interface SupermarketFacet {
  code: string;
  name: Loc;
  count: number;
}

export interface Facets {
  categories: CategoryNode[];
  supermarkets: SupermarketFacet[];
}

export interface Meta {
  source: string;
  apiUrl: string;
  generatedAt: string | null;
  productCount: number;
  supermarketCount: number;
  categoryCount: number;
  offersWithText: number;
  offersParsed: number;
  embedding: { model: string; dim: number; count: number; file: string } | null;
}
