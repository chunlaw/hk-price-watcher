// Generate a small mock pricewatch.json in the exact shape of the real
// Consumer Council feed, so the data pipeline and the website can be built and
// exercised locally without network access. GitHub Actions always overwrites
// this with live data.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'pricewatch.mock.json');

const CATS = [
  {
    c: ['CAT1', { en: 'Foodstuff', 'zh-Hant': '食品' }],
    subs: [
      { c: ['CAT11', { en: 'Rice & Noodles', 'zh-Hant': '米麵' }], c3: [['CAT111', { en: 'Rice', 'zh-Hant': '白米' }], ['CAT112', { en: 'Instant Noodles', 'zh-Hant': '即食麵' }]] },
      { c: ['CAT12', { en: 'Snacks', 'zh-Hant': '零食' }], c3: [['CAT121', { en: 'Biscuits', 'zh-Hant': '餅乾' }], ['CAT122', { en: 'Chips', 'zh-Hant': '薯片' }]] },
    ],
  },
  {
    c: ['CAT2', { en: 'Drinks', 'zh-Hant': '飲品' }],
    subs: [
      { c: ['CAT21', { en: 'Soft Drinks', 'zh-Hant': '汽水' }], c3: [['CAT211', { en: 'Cola', 'zh-Hant': '可樂' }]] },
      { c: ['CAT22', { en: 'Water', 'zh-Hant': '蒸餾水' }], c3: [['CAT221', { en: 'Distilled Water', 'zh-Hant': '蒸餾水' }]] },
    ],
  },
  {
    c: ['CAT3', { en: 'Household', 'zh-Hant': '家居用品' }],
    subs: [
      { c: ['CAT31', { en: 'Paper Products', 'zh-Hant': '紙品' }], c3: [['CAT311', { en: 'Toilet Paper', 'zh-Hant': '廁紙' }], ['CAT312', { en: 'Tissue', 'zh-Hant': '紙巾' }]] },
      { c: ['CAT32', { en: 'Cleaning', 'zh-Hant': '清潔用品' }], c3: [['CAT321', { en: 'Detergent', 'zh-Hant': '洗衣液' }]] },
    ],
  },
];

const BRANDS = [
  { en: 'Nissin', 'zh-Hant': '日清' },
  { en: 'Vita', 'zh-Hant': '維他' },
  { en: 'Coca-Cola', 'zh-Hant': '可口可樂' },
  { en: 'Watsons', 'zh-Hant': '屈臣氏' },
  { en: 'Lee Kum Kee', 'zh-Hant': '李錦記' },
  { en: 'Vinda', 'zh-Hant': '維達' },
  { en: 'Doll', 'zh-Hant': '公仔' },
  { en: 'Yeo\'s', 'zh-Hant': '楊協成' },
];

const PRODUCT_WORDS = [
  { en: 'Instant Noodles 5-pack', 'zh-Hant': '即食麵五包裝' },
  { en: 'Sparkling Water 1.25L', 'zh-Hant': '有氣礦泉水1.25公升' },
  { en: 'Toilet Roll 10s', 'zh-Hant': '廁紙10卷裝' },
  { en: 'Soy Sauce 500ml', 'zh-Hant': '生抽500毫升' },
  { en: 'Potato Chips 160g', 'zh-Hant': '薯片160克' },
  { en: 'Jasmine Rice 5kg', 'zh-Hant': '茉莉香米5公斤' },
  { en: 'Cola 330ml x6', 'zh-Hant': '可樂330毫升6罐裝' },
  { en: 'Laundry Detergent 3L', 'zh-Hant': '洗衣液3公升' },
];

const STORES = ['PARKNSHOP', 'WELLCOME', 'AEON', 'DCHFOOD', 'MARKETPLACE'];

const OFFER_TEMPLATES = [
  { en: '2nd item half price', 'zh-Hant': '第二件半價' },
  { en: 'Buy 2 get 1 free', 'zh-Hant': '買二送一' },
  { en: '2 for $25', 'zh-Hant': '2件$25' },
  { en: '20% off', 'zh-Hant': '8折' },
  { en: '', 'zh-Hant': '' },
  { en: '3 for $50', 'zh-Hant': '任選3件$50' },
  { en: 'Member price $18.9', 'zh-Hant': '會員價$18.9' },
];

// Deterministic PRNG so mock output is stable across runs (Math.random is banned
// in some sandboxes and stable data makes diffs reviewable).
let seed = 20260711;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const products = [];
let n = 0;
for (const cat1 of CATS) {
  for (const cat2 of cat1.subs) {
    for (const c3 of cat2.c3) {
      for (let k = 0; k < 12; k++) {
        n++;
        const brand = pick(BRANDS);
        const word = pick(PRODUCT_WORDS);
        const prices = [];
        const offers = [];
        const nStores = 2 + Math.floor(rnd() * 3);
        const chosen = [...STORES].sort(() => rnd() - 0.5).slice(0, nStores);
        for (const s of chosen) {
          const base = 10 + Math.floor(rnd() * 400) / 10;
          prices.push({ supermarketCode: s, price: base.toFixed(1) });
          if (rnd() < 0.55) {
            const off = pick(OFFER_TEMPLATES);
            if (off.en || off['zh-Hant']) {
              offers.push({ supermarketCode: s, en: off.en, 'zh-Hant': off['zh-Hant'], 'zh-Hans': off['zh-Hant'] });
            }
          }
        }
        products.push({
          code: `MOCK${String(n).padStart(6, '0')}`,
          brand: { ...brand, 'zh-Hans': brand['zh-Hant'] },
          name: {
            en: `${brand.en} ${word.en}`,
            'zh-Hant': `${brand['zh-Hant']}${word['zh-Hant']}`,
            'zh-Hans': `${brand['zh-Hant']}${word['zh-Hant']}`,
          },
          cat1Code: cat1.c[0], cat1Name: { ...cat1.c[1], 'zh-Hans': cat1.c[1]['zh-Hant'] },
          cat2Code: cat2.c[0], cat2Name: { ...cat2.c[1], 'zh-Hans': cat2.c[1]['zh-Hant'] },
          cat3Code: c3[0], cat3Name: { ...c3[1], 'zh-Hans': c3[1]['zh-Hant'] },
          prices,
          offers,
        });
      }
    }
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(products));
console.log(`Wrote ${products.length} mock products to ${OUT}`);
