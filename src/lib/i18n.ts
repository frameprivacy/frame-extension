/**
 * The extension's own strings follow the browser language: French when it starts with "fr", English otherwise.
 * English strings are the keys, so a missing translation falls back to English rather than to a key name.
 * Placeholders are written {name}. src/lib/i18n.test.ts checks every t() and plural() string has French.
 */
import { FR } from './i18n.fr';

export type Locale = 'en' | 'fr';

export function detectLocale(language: string | undefined): Locale {
  return typeof language === 'string' && /^fr(?:-|$)/i.test(language) ? 'fr' : 'en';
}

let current: Locale = detectLocale(typeof navigator === 'undefined' ? undefined : navigator.language);

export function locale(): Locale {
  return current;
}

/** For tests. The extension itself never switches language while it runs. */
export function setLocale(next: Locale): void {
  current = next;
}

export type Vars = Record<string, string | number>;

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? formatValue(vars[key] as string | number) : match,
  );
}

function formatValue(value: string | number): string {
  return typeof value === 'number' ? new Intl.NumberFormat(current === 'fr' ? 'fr-CA' : 'en-CA').format(value) : value;
}

export function t(english: string, vars?: Vars): string {
  return fill(current === 'fr' ? (FR[english] ?? english) : english, vars);
}

/** Picks the singular or plural English string, then translates it. French treats 0 and 1 as singular. */
export function plural(count: number, one: string, other: string, vars?: Vars): string {
  const singular = current === 'fr' ? Math.abs(count) < 2 : count === 1;
  return t(singular ? one : other, { n: count, ...vars });
}
