export type Lang = 'zhHant' | 'en';

export const LANGS: { key: Lang; label: string; short: string }[] = [
  { key: 'zhHant', label: '繁體中文', short: '繁' },
  { key: 'en', label: 'English', short: 'EN' },
];

type Dict = Record<string, { en: string; zhHant: string }>;

export const STRINGS: Dict = {
  appTitle: { en: 'HK Price Watcher', zhHant: '香港格價' },
  appSubtitle: {
    en: 'Supermarket prices & offers, refreshed daily',
    zhHant: '超市價格及優惠，每日更新',
  },
  searchPlaceholder: { en: 'Search products, brands…', zhHant: '搜尋產品、品牌…' },
  semanticSearch: { en: 'Smart search', zhHant: '智能搜尋' },
  semanticOn: { en: 'Semantic search on', zhHant: '已開啟語意搜尋' },
  semanticHint: {
    en: 'Understands meaning, not just keywords. Loads a small model on your device (one-time).',
    zhHant: '理解語意而非僅比對關鍵字。首次使用會在裝置下載小型模型（僅一次）。',
  },
  loadingModel: { en: 'Loading search model…', zhHant: '正在載入搜尋模型…' },
  embeddingQuery: { en: 'Understanding your query…', zhHant: '正在理解你的查詢…' },
  categories: { en: 'Categories', zhHant: '分類' },
  allCategories: { en: 'All categories', zhHant: '所有分類' },
  supermarkets: { en: 'Supermarkets', zhHant: '超市' },
  allSupermarkets: { en: 'All supermarkets', zhHant: '所有超市' },
  onlyOffers: { en: 'On offer only', zhHant: '只顯示有優惠' },
  sortBy: { en: 'Sort by', zhHant: '排序' },
  sortRelevance: { en: 'Relevance', zhHant: '相關度' },
  sortPriceAsc: { en: 'Lowest price', zhHant: '最低價格' },
  sortUnitAsc: { en: 'Lowest effective unit price', zhHant: '最低實際單價' },
  sortName: { en: 'Name', zhHant: '名稱' },
  results: { en: 'results', zhHant: '項結果' },
  noResults: { en: 'No products match your filters.', zhHant: '沒有符合條件的產品。' },
  clearFilters: { en: 'Clear filters', zhHant: '清除篩選' },
  filters: { en: 'Filters', zhHant: '篩選' },
  regularPrice: { en: 'Regular', zhHant: '原價' },
  from: { en: 'from', zhHant: '低至' },
  perUnit: { en: '/unit', zhHant: '/件' },
  offer: { en: 'Offer', zhHant: '優惠' },
  effectiveUnit: { en: 'Effective unit price', zhHant: '實際單價' },
  minBuy: { en: 'min.', zhHant: '最少' },
  units: { en: 'pcs', zhHant: '件' },
  minSpend: { en: 'min. spend', zhHant: '最低消費' },
  minCost: { en: 'Cost to unlock', zhHant: '取得優惠最低消費' },
  minCostShort: { en: 'spend', zhHant: '洗' },
  buyN: { en: 'buy', zhHant: '買' },
  save: { en: 'Save', zhHant: '慳' },
  spendWiselyTitle: { en: "Don't overspend to save", zhHant: '唔好為慳錢而洗大咗' },
  spendWiselyBody: {
    en: 'A lower unit price often needs a bigger basket. Only grab the deal if you will actually use it all.',
    zhHant: '單價平，通常要買多啲先做到。用得晒先好入手，唔好為咗個「抵」字而洗大咗。',
  },
  needBuy: { en: 'need to buy', zhHant: '需買' },
  vsRegular: { en: 'vs buying one', zhHant: '對比買一件' },
  priceByStore: { en: 'Prices by supermarket', zhHant: '各超市價格' },
  store: { en: 'Store', zhHant: '超市' },
  price: { en: 'Price', zhHant: '價格' },
  bestDeal: { en: 'Best deal', zhHant: '最抵' },
  noPrice: { en: 'N/A', zhHant: '沒有資料' },
  close: { en: 'Close', zhHant: '關閉' },
  brand: { en: 'Brand', zhHant: '品牌' },
  category: { en: 'Category', zhHant: '分類' },
  loadMore: { en: 'Load more', zhHant: '載入更多' },
  loading: { en: 'Loading…', zhHant: '載入中…' },
  updated: { en: 'Data updated', zhHant: '資料更新於' },
  dataSource: {
    en: 'Data source: Consumer Council Online Price Watch (open data)',
    zhHant: '資料來源：消費者委員會「網上價格一覽通」開放資料',
  },
  disclaimer: {
    en: 'Offer unit prices are computed heuristically from promotion text and may not reflect all terms. Always verify in-store.',
    zhHant: '優惠單價由優惠文字自動推算，未必涵蓋所有條款，請以店舖為準。',
  },
  semanticUnavailable: {
    en: 'Semantic search is unavailable for this dataset.',
    zhHant: '此資料集未提供語意搜尋。',
  },
  offerParsedNote: { en: 'auto-parsed', zhHant: '自動解析' },
  productsIn: { en: 'products', zhHant: '項產品' },
};

export function t(key: string, lang: Lang): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang];
}
