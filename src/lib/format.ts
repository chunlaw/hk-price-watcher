export function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  // HK dollar, trim trailing .00 but keep cents when present.
  const fixed = Math.round(n * 100) / 100;
  const s = fixed.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
  return `$${s}`;
}

export function formatDate(iso: string | null, lang: 'en' | 'zhHant'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === 'en' ? 'en-HK' : 'zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
