import { create } from 'zustand';
import en from './en.js';
import es from './es.js';
import type { Translations, TranslationKey } from './en.js';

export type Locale = 'en' | 'es';

const locales: Record<Locale, Translations> = { en, es };

function isLocale(s: string): s is Locale {
  return s === 'en' || s === 'es';
}

function detectLocale(): Locale {
  const flag = process.argv.find((a) => a.startsWith('--lang='));
  if (flag) {
    const code = flag.split('=')[1];
    if (code && isLocale(code)) return code;
  }
  const env = process.env.LANG ?? process.env.LC_ALL ?? process.env.LC_MESSAGES ?? '';
  const prefix = env.split(/[_.]/)[0] ?? '';
  if (isLocale(prefix)) return prefix;
  return 'en';
}

// ── Locale store ──
interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: detectLocale(),
  setLocale: (locale) => set({ locale }),
}));

// ── Translation function ──
export function t(key: TranslationKey, values?: Record<string, string | number>): string {
  const locale = useLocaleStore.getState().locale;
  let text: string = locales[locale][key] ?? locales['en'][key] ?? key;
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      text = text.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return text;
}

// ── Plural helper ──
export function tp(baseKey: string, count: number, values?: Record<string, string | number>): string {
  const suffix = count === 1 ? '_one' : '_other';
  return t(`${baseKey}${suffix}` as TranslationKey, { count, ...values });
}

export type { TranslationKey, Translations };
