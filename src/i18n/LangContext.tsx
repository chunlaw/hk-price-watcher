import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { t as translate, type Lang } from './strings';
import type { Loc } from '../lib/types';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  loc: (value: Loc | null | undefined) => string;
}

const Ctx = createContext<LangCtx | null>(null);

const STORAGE_KEY = 'hkpw.lang';

function initialLang(): Lang {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved === 'en' || saved === 'zhHant') return saved;
  // Default to Traditional Chinese unless the browser clearly prefers English.
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'zh-hant';
  return nav.startsWith('en') ? 'en' : 'zhHant';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l === 'en' ? 'en' : 'zh-Hant';
  }, []);

  const t = useCallback((key: string) => translate(key, lang), [lang]);
  const loc = useCallback(
    (value: Loc | null | undefined) => {
      if (!value) return '';
      // Fall back to the other language if one side is empty.
      return (lang === 'en' ? value.en || value.zhHant : value.zhHant || value.en) ?? '';
    },
    [lang],
  );

  const val = useMemo(() => ({ lang, setLang, t, loc }), [lang, setLang, t, loc]);
  return <Ctx.Provider value={val}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
