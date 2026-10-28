import { describe, expect, it } from 'vitest';
import { FIREFOX_ADDON_ID } from './extension-ids';
import { buildManifest } from './manifest';

describe('manifest per browser', () => {
  it('keeps the Chrome key and minimum version on Chrome only', () => {
    const chrome = buildManifest('chrome');
    expect(chrome.key).toEqual(expect.any(String));
    expect(chrome.minimum_chrome_version).toBe('111');
    expect(chrome.browser_specific_settings).toBeUndefined();
    expect(chrome.permissions).toEqual(expect.arrayContaining(['privacy', 'identity', 'browsingData']));
  });

  it('gives Firefox its gecko id and no Chrome key', () => {
    const firefox = buildManifest('firefox');
    expect(firefox.key).toBeUndefined();
    expect(firefox.browser_specific_settings?.gecko?.id).toBe(FIREFOX_ADDON_ID);
    expect(firefox.permissions).toEqual(expect.arrayContaining(['privacy', 'identity', 'browsingData']));
  });

  it('asks Safari only for APIs Safari has, with no Chrome key or gecko block', () => {
    const safari = buildManifest('safari');
    expect(safari.key).toBeUndefined();
    expect(safari.minimum_chrome_version).toBeUndefined();
    expect(safari.browser_specific_settings).toEqual({ safari: { strict_min_version: '16.4' } });
    expect(safari.permissions).toEqual(['storage', 'scripting', 'declarativeNetRequest', 'cookies']);
    expect(safari.host_permissions).toEqual(buildManifest('chrome').host_permissions);
  });

  it('mentions a Frame account on Safari only once sign-in is ready', () => {
    expect(description('en', buildManifest('safari', false).description)).not.toMatch(/account/);
    expect(description('en', buildManifest('safari', true).description)).toMatch(/Frame account/);
    expect(description('en', buildManifest('chrome').description)).toMatch(/Chrome and Firefox/);
    expect(description('fr', buildManifest('safari', false).description)).not.toMatch(/compte/);
    expect(description('fr', buildManifest('safari', true).description)).toMatch(/compte Frame/);
  });

  it('localizes the listing in English and French, within the store length limit', () => {
    const en = messages('en');
    const fr = messages('fr');
    expect(buildManifest('chrome').default_locale).toBe('en');
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    for (const set of [en, fr]) {
      for (const entry of Object.values(set)) {
        expect(entry.message.length).toBeGreaterThan(0);
        expect(entry.message.length).toBeLessThanOrEqual(132);
        expect(entry.message).not.toMatch(/[\u2013\u2014]/);
      }
    }
  });
});

type Messages = Record<string, { message: string; description?: string }>;

const LOCALES = import.meta.glob('/public/_locales/*/messages.json', { eager: true, import: 'default' }) as Record<
  string,
  Messages
>;

function messages(locale: 'en' | 'fr'): Messages {
  const set = LOCALES[`/public/_locales/${locale}/messages.json`];
  if (!set) throw new Error(`Missing _locales/${locale}`);
  return set;
}

/** Resolves a __MSG_key__ reference the way the browser does. */
function description(locale: 'en' | 'fr', value: string | undefined): string {
  const key = /^__MSG_(\w+)__$/.exec(value ?? '')?.[1];
  if (!key) throw new Error(`Description is not localized: ${value}`);
  const entry = messages(locale)[key];
  if (!entry) throw new Error(`Missing ${locale} message ${key}`);
  return entry.message;
}
