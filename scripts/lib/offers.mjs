// Offer digestion.
//
// The Consumer Council feed gives, per supermarket, a *free-text* promotion
// string (English + Traditional Chinese) plus a regular price. This module turns
// that free text into structured numbers so the site can show, for every
// product/store:
//
//   - unitPrice            : the regular price of one sellable unit
//   - discountedUnitPrice  : the effective per-unit price once you buy enough
//                            to trigger the promotion
//   - minQuantity/minSpend : the "minimum consumption" required for the deal
//
// The matchers below are derived from the actual templates in the live feed
// (e.g. "Buy 2 item(s) for $16.00", "買2件慳$4.00", "Add 3 item(s) to cart and
// get 1 free", "Buy 2 to get 20% off", "第二件半價"). It is best-effort: the raw
// offer text is always kept for display, and anything unparseable simply leaves
// the discounted fields null. All parsing runs in GitHub Actions — no server,
// no paid API.

const CJK_NUM = {
  '零': 0, '一': 1, '兩': 2, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
};

/** Parse a small integer written in Arabic or simple Chinese numerals. */
function toInt(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (/^[0-9]+$/.test(s)) return parseInt(s, 10);
  if (/^[零一兩二三四五六七八九十]+$/.test(s)) {
    if (s === '十') return 10;
    const tenIdx = s.indexOf('十');
    if (tenIdx === -1) return CJK_NUM[s[0]] ?? null;
    const tens = tenIdx === 0 ? 1 : (CJK_NUM[s[tenIdx - 1]] ?? 1);
    const ones = tenIdx === s.length - 1 ? 0 : (CJK_NUM[s[tenIdx + 1]] ?? 0);
    return tens * 10 + ones;
  }
  return null;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// A "折" (Chinese discount) value: 8折 -> pay 0.8, 85折 -> 0.85, 95折 -> 0.95.
function zheMultiplier(n) {
  if (!Number.isFinite(n) || n <= 0 || n >= 100) return null;
  return n >= 10 ? n / 100 : n / 10;
}

const N = '([0-9]+|[零一兩二三四五六七八九十]+)';      // quantity
const P = '([0-9]+(?:\\.[0-9]+)?)';                   // price / percent

/**
 * Extract every plausible deal from one offer string.
 * @param {string} text     the offer text (either language)
 * @param {number|null} base the regular unit price for this store, if known
 */
function candidatesFor(text, base) {
  if (!text) return [];
  const t = String(text).replace(/\s+/g, ' ').trim();
  const out = [];
  const push = (kind, discountedUnitPrice, extra = {}) => {
    if (Number.isFinite(discountedUnitPrice) && discountedUnitPrice > 0) {
      out.push({ kind, minQuantity: null, minSpend: null, discountedTotal: null, discountedUnitPrice, ...extra });
    }
  };
  const hasBase = base != null && Number.isFinite(base);
  let m;

  // ---- N items for a fixed total (absolute; base not required) ----
  const nForTotal = [
    new RegExp(`buy\\s*${N}\\s*item\\(s\\)\\s*for\\s*\\$\\s*${P}`, 'i'), // Buy 2 item(s) for $16
    new RegExp(`buy\\s*${N}\\s*at\\s*\\$\\s*${P}`, 'i'),                 // Buy 2 at $16
    new RegExp(`^${N}\\s*for\\s*\\$\\s*${P}`, 'i'),                      // 2 For $16
    new RegExp(`買\\s*${N}\\s*件\\s*只需\\s*\\$\\s*${P}`),                 // 買2件只需$16
    new RegExp(`買\\s*${N}\\s*件\\s*\\$\\s*${P}`),                        // 買2件$16
  ];
  for (const re of nForTotal) {
    if ((m = t.match(re))) {
      const n = toInt(m[1]); const p = parseFloat(m[2]);
      if (n && n >= 1 && Number.isFinite(p)) {
        push('n-for-total', round2(p / n), { minQuantity: n, discountedTotal: round2(p) });
      }
      break;
    }
  }
  // "$16任揀2件" — price before quantity.
  if ((m = t.match(new RegExp(`\\$\\s*${P}\\s*任[揀選]\\s*${N}\\s*件`)))) {
    const p = parseFloat(m[1]); const n = toInt(m[2]);
    if (n && Number.isFinite(p)) push('n-for-total', round2(p / n), { minQuantity: n, discountedTotal: round2(p) });
  }

  // ---- Buy N, save $X off the total (needs base) ----
  if (hasBase) {
    const saveRes = [
      new RegExp(`buy\\s*${N}\\s*to\\s*save\\s*\\$\\s*${P}`, 'i'), // Buy 2 to save $4
      new RegExp(`買\\s*${N}\\s*件\\s*慳\\s*\\$\\s*${P}`),          // 買2件慳$4
    ];
    for (const re of saveRes) {
      if ((m = t.match(re))) {
        const n = toInt(m[1]); const save = parseFloat(m[2]);
        if (n && n >= 1 && Number.isFinite(save)) {
          const total = n * base - save;
          if (total > 0) push('buy-n-save', round2(total / n), { minQuantity: n, discountedTotal: round2(total) });
        }
        break;
      }
    }
  }

  // ---- Add N to cart, get M free (cheapest/most-expensive free) (needs base) ----
  if (hasBase) {
    const freeRes = [
      new RegExp(`add\\s*${N}\\s*item\\(s\\)\\s*to\\s*cart\\s*and\\s*get\\s*${N}\\s*free`, 'i'),
      new RegExp(`任[揀選]\\s*${N}\\s*件[，,][^0-9]{0,6}${N}\\s*件\\s*免費`),
    ];
    for (const re of freeRes) {
      if ((m = t.match(re))) {
        const n = toInt(m[1]); const free = toInt(m[2]);
        if (n && free && n > free) {
          const total = (n - free) * base;
          push('add-n-get-free', round2(total / n), { minQuantity: n, discountedTotal: round2(total) });
        }
        break;
      }
    }
  }

  // ---- Buy N, get M free (extra items) (needs base) ----
  if (hasBase) {
    const bogo = [
      new RegExp(`buy\\s*${N}\\s*get\\s*${N}\\s*free`, 'i'),
      new RegExp(`買\\s*${N}\\s*件?\\s*送\\s*${N}\\s*件?`),
    ];
    for (const re of bogo) {
      if ((m = t.match(re))) {
        const x = toInt(m[1]); const y = toInt(m[2]);
        if (x && y) {
          const total = x * base;
          push('buy-x-get-y', round2(total / (x + y)), { minQuantity: x + y, discountedTotal: round2(total) });
        }
        break;
      }
    }
  }

  // ---- Nth item at % off / half price / 折 (needs base) ----
  if (hasBase) {
    // "2nd Item For 20% off" / "20% for 2nd" / "第二件20%折扣" / "買第二件享20%折扣"
    let nth = null, pctOff = null;
    if ((m = t.match(new RegExp(`${N}(?:st|nd|rd|th)\\s*item\\s*for\\s*${P}\\s*%\\s*off`, 'i')))) { nth = toInt(m[1]); pctOff = parseFloat(m[2]); }
    else if ((m = t.match(new RegExp(`${P}\\s*%\\s*for\\s*${N}(?:st|nd|rd|th)`, 'i')))) { pctOff = parseFloat(m[1]); nth = toInt(m[2]); }
    else if ((m = t.match(new RegExp(`第\\s*${N}\\s*件[^0-9]{0,4}${P}\\s*%\\s*折扣`)))) { nth = toInt(m[1]); pctOff = parseFloat(m[2]); }
    if (nth && nth >= 2 && Number.isFinite(pctOff) && pctOff > 0 && pctOff < 100) {
      const total = (nth - 1) * base + base * (1 - pctOff / 100);
      push('nth-pct-off', round2(total / nth), { minQuantity: nth, discountedTotal: round2(total) });
    }
    // "第N件半價"
    if ((m = t.match(new RegExp(`第\\s*${N}\\s*件[^0-9]{0,4}半價`)))) {
      const n = toInt(m[1]);
      if (n && n >= 2) {
        const total = (n - 1) * base + 0.5 * base;
        push('nth-half', round2(total / n), { minQuantity: n, discountedTotal: round2(total) });
      }
    }
    if (/2nd\b.*half\s*price|half\s*price.*2nd|buy\s*one\s*get\s*one\s*half/i.test(t)) {
      push('nth-half', round2((base + 0.5 * base) / 2), { minQuantity: 2, discountedTotal: round2(1.5 * base) });
    }
    // "第N件X折" / "買第N件$X"
    if ((m = t.match(new RegExp(`第\\s*${N}\\s*件[^0-9]{0,4}${P}\\s*折`)))) {
      const n = toInt(m[1]); const mult = zheMultiplier(parseFloat(m[2]));
      if (n && n >= 2 && mult != null) {
        const total = (n - 1) * base + base * mult;
        push('nth-zhe', round2(total / n), { minQuantity: n, discountedTotal: round2(total) });
      }
    }
    if ((m = t.match(new RegExp(`(?:買第|第|buy\\s*)(?:${N})?\\s*(?:件|item)?\\s*(?:for\\s*)?\\$\\s*${P}`, 'i'))) && /第|second/i.test(t)) {
      // "買第2件$10" / "Buy Second for $10"
      let n = m[1] ? toInt(m[1]) : (/second/i.test(t) ? 2 : null);
      const px = parseFloat(m[2]);
      if (n && n >= 2 && Number.isFinite(px)) {
        const total = (n - 1) * base + px;
        push('nth-price', round2(total / n), { minQuantity: n, discountedTotal: round2(total) });
      }
    }
  }

  // ---- Buy N, then % off each (needs base) ----
  if (hasBase) {
    let n = null, pct = null;
    if ((m = t.match(new RegExp(`buy\\s*${N}\\s*to\\s*get\\s*${P}\\s*%\\s*off`, 'i')))) { n = toInt(m[1]); pct = parseFloat(m[2]); }
    else if ((m = t.match(new RegExp(`買\\s*${N}\\s*件\\s*享\\s*${P}\\s*%\\s*折扣`)))) { n = toInt(m[1]); pct = parseFloat(m[2]); }
    else if ((m = t.match(new RegExp(`${N}\\s*or\\s*more\\s*${P}\\s*%\\s*off`, 'i')))) { n = toInt(m[1]); pct = parseFloat(m[2]); }
    else if ((m = t.match(new RegExp(`(?:x|×)\\s*${N}\\s*,\\s*${P}\\s*%\\s*off`, 'i')))) { n = toInt(m[1]); pct = parseFloat(m[2]); }
    if (n && n >= 1 && Number.isFinite(pct) && pct > 0 && pct < 100) {
      push('buy-n-pct-off', round2(base * (1 - pct / 100)), { minQuantity: n });
    }
    // "買N件或以上X折" / "買N件X折" (selected products) / lone "N折"
    let zn = null, zhe = null;
    if ((m = t.match(new RegExp(`買\\s*${N}\\s*件\\s*或以上\\s*${P}\\s*折`)))) { zn = toInt(m[1]); zhe = parseFloat(m[2]); }
    else if ((m = t.match(new RegExp(`買\\s*${N}\\s*件\\s*${P}\\s*折`)))) { zn = toInt(m[1]); zhe = parseFloat(m[2]); }
    if (zn && zn >= 1) {
      const mult = zheMultiplier(zhe);
      if (mult != null) push('buy-n-zhe', round2(base * mult), { minQuantity: zn });
    }
  }

  // ---- Whole-order % off / lone 折 (minQty 1, needs base) ----
  if (hasBase) {
    if ((m = t.match(new RegExp(`${P}\\s*%\\s*off`, 'i'))) && !/buy|item|or\s*more|for\s*[0-9]/i.test(t)) {
      const pct = parseFloat(m[1]);
      if (Number.isFinite(pct) && pct > 0 && pct < 100) push('pct-off', round2(base * (1 - pct / 100)), { minQuantity: 1 });
    }
    if (!/件|%|買|item/i.test(t) && (m = t.match(new RegExp(`${P}\\s*折`)))) {
      const mult = zheMultiplier(parseFloat(m[1]));
      if (mult != null) push('zhe', round2(base * mult), { minQuantity: 1 });
    }
  }

  return out;
}

/**
 * Digest a single store's price + offer into structured fields.
 * @param {number|null} price   regular price for this store
 * @param {string|null} offerEn English offer text
 * @param {string|null} offerZh Traditional-Chinese offer text
 */
export function digestOffer(price, offerEn, offerZh) {
  const base = Number.isFinite(price) ? price : null;
  const hasOfferText = Boolean((offerEn && offerEn.trim()) || (offerZh && offerZh.trim()));

  const candidates = [
    ...candidatesFor(offerZh, base),
    ...candidatesFor(offerEn, base),
  ];

  let best = null;
  for (const c of candidates) {
    // A real discount must beat the regular price (when known).
    if (base != null && c.discountedUnitPrice >= base) continue;
    if (!best || c.discountedUnitPrice < best.discountedUnitPrice) best = c;
  }

  return {
    price: base,
    unitPrice: base,
    hasOffer: hasOfferText,
    offerParsed: Boolean(best),
    offerKind: best ? best.kind : null,
    minQuantity: best ? best.minQuantity : null,
    minSpend: best ? best.minSpend : null,
    discountedTotal: best ? best.discountedTotal : null,
    discountedUnitPrice: best ? best.discountedUnitPrice : null,
  };
}

export const __test = { toInt, candidatesFor, zheMultiplier };
