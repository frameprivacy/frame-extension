import { afterEach, describe, expect, it } from 'vitest';
import { detectLocale, plural, setLocale, t } from './i18n';
import { FR } from './i18n.fr';

const FILES = import.meta.glob(
  ['/src/**/*.{ts,tsx}', '/entrypoints/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}', '!**/i18n*.ts'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
) as Record<string, string>;
const LITERAL = String.raw`'((?:[^'\\]|\\.)*)'`;

function sources(): { file: string; text: string }[] {
  return Object.entries(FILES).map(([path, text]) => ({ file: path.replace(/^\//, ''), text }));
}

function unescape(value: string): string {
  return value.replace(/\\(.)/g, '$1');
}

function usedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const { text } of sources()) {
    for (const match of text.matchAll(new RegExp(String.raw`\bt\(\s*` + LITERAL, 'g'))) keys.add(unescape(match[1]!));
    for (const match of text.matchAll(
      new RegExp(String.raw`\bplural\(\s*[^,]+,\s*` + LITERAL + String.raw`,\s*` + LITERAL, 'g'),
    )) {
      keys.add(unescape(match[1]!));
      keys.add(unescape(match[2]!));
    }
  }
  return keys;
}

const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('French coverage', () => {
  const used = usedKeys();

  it('has French for every string passed to t() or plural()', () => {
    expect([...used].filter((key) => !(key in FR))).toEqual([]);
  });

  it('has no French left over for strings no longer used', () => {
    expect(Object.keys(FR).filter((key) => !used.has(key))).toEqual([]);
  });

  it('keeps the same placeholders in French', () => {
    const mismatched = Object.entries(FR).filter(([en, fr]) => placeholders(en).join() !== placeholders(fr).join());
    expect(mismatched).toEqual([]);
  });

  it('uses no en or em dashes in either language', () => {
    const dashed = Object.entries(FR).filter(([en, fr]) => /[\u2013\u2014]/.test(en + fr));
    expect(dashed).toEqual([]);
  });

  it('leaves no English sentence outside t() in user-facing code', () => {
    const skip = [
      /^src\/lib\/fingerprint-/,
      /^src\/lib\/manifest\.ts$/,
      /^src\/lib\/frame\/live\.ts$/,
      /^src\/lib\/dnr\.ts$/,
    ];
    const allowed = new Set(['Host access, http and https', 'Segoe UI', 'Frame', 'FrameApiError']);
    const found: string[] = [];
    for (const { file, text } of sources()) {
      if (skip.some((pattern) => pattern.test(file))) continue;
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(new RegExp(String.raw`\bt\(\s*` + LITERAL, 'g'), 't(')
        .replace(
          new RegExp(String.raw`\bplural\(\s*([^,]+),\s*` + LITERAL + String.raw`,\s*` + LITERAL, 'g'),
          'plural($1',
        );
      for (const match of code.matchAll(/'([A-Z][a-z\u2019]+(?: [^ ']+)+)'|`([A-Z][a-z\u2019]+ [^`$]*)`/g)) {
        const value = match[1] ?? match[2]!;
        if (!allowed.has(value)) found.push(`${file}: ${value}`);
      }
      if (file.endsWith('.tsx')) {
        for (const match of code.matchAll(/>\s*([A-Z][a-z\u2019]+(?: [a-z\u2019]+)+[.…]?)\s*</g))
          found.push(`${file}: ${match[1]}`);
      }
    }
    expect(found).toEqual([]);
  });
});

describe('t and plural', () => {
  afterEach(() => setLocale('en'));

  it('picks French only for French browsers', () => {
    expect(detectLocale('fr')).toBe('fr');
    expect(detectLocale('fr-CA')).toBe('fr');
    expect(detectLocale('en-CA')).toBe('en');
    expect(detectLocale('fri')).toBe('en');
    expect(detectLocale(undefined)).toBe('en');
  });

  it('fills placeholders in both languages', () => {
    expect(t('Forget {host}', { host: 'example.com' })).toBe('Forget example.com');
    setLocale('fr');
    expect(t('Forget {host}', { host: 'example.com' })).toBe('Oublier example.com');
  });

  it('treats 0 and 1 as singular in French but only 1 in English', () => {
    expect(plural(0, '{n} open breach', '{n} open breaches')).toBe('0 open breaches');
    expect(plural(1, '{n} open breach', '{n} open breaches')).toBe('1 open breach');
    setLocale('fr');
    expect(plural(0, '{n} open breach', '{n} open breaches')).toBe('0 fuite ouverte');
    expect(plural(2, '{n} open breach', '{n} open breaches')).toBe('2 fuites ouvertes');
  });

  it('falls back to English for a string with no French', () => {
    setLocale('fr');
    expect(t('Not a real key')).toBe('Not a real key');
  });
});
