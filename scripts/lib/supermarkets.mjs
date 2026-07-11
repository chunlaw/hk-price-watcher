// Supermarket code -> display name (English + Traditional Chinese).
// Codes come from the Consumer Council feed's `supermarketCode`. Unknown codes
// fall back to a title-cased version of the code itself so the site never shows
// a blank store name.

export const SUPERMARKETS = {
  PARKNSHOP: { en: 'PARKnSHOP', zhHant: '百佳' },
  WELLCOME: { en: 'Wellcome', zhHant: '惠康' },
  MARKETPLACE: { en: 'MARKET PLACE', zhHant: 'MARKET PLACE' },
  JASONS: { en: 'JASONS', zhHant: 'JASONS' },
  GREATFOOD: { en: 'GREAT', zhHant: 'GREAT' },
  INTERNATIONAL: { en: 'INTERNATIONAL by PARKnSHOP', zhHant: 'INTERNATIONAL by PARKnSHOP' },
  FUSION: { en: 'FUSION by PARKnSHOP', zhHant: 'FUSION by PARKnSHOP' },
  AEON: { en: 'AEON', zhHant: '永旺' },
  DCHFOOD: { en: 'DCH Food Mart', zhHant: '大昌食品專門店' },
  YATA: { en: 'YATA', zhHant: '一田' },
  VANGO: { en: 'VanGO', zhHant: 'VanGO' },
  CRVANGUARD: { en: 'CR Vanguard', zhHant: '華潤萬家' },
  '759': { en: '759 Store', zhHant: '759阿信屋' },
};

export function supermarketName(code) {
  if (!code) return { en: 'Unknown', zhHant: '未知' };
  const key = String(code).toUpperCase();
  if (SUPERMARKETS[key]) return SUPERMARKETS[key];
  if (SUPERMARKETS[code]) return SUPERMARKETS[code];
  const pretty = String(code)
    .toLowerCase()
    .replace(/(^|\s)\S/g, (s) => s.toUpperCase());
  return { en: pretty, zhHant: pretty };
}
