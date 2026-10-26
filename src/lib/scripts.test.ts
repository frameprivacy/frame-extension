import { describe, expect, it } from 'vitest';
import { defaultSettings, setBooleanSetting, setFingerprintHost } from './settings';
import { ALIAS_SCRIPT_ID, FINGERPRINT_SCRIPT_ID, GPC_SCRIPT_ID, scriptRegistrations, withoutOriginFallback } from './scripts';

describe('page script registration', () => {
  it('covers every site when the defaults are on', () => {
    const scripts = scriptRegistrations(defaultSettings());
    expect(scripts.map((script) => script.id)).toEqual([GPC_SCRIPT_ID, FINGERPRINT_SCRIPT_ID]);
    expect(scripts.every((script) => script.world === 'MAIN' && script.runAt === 'document_start')).toBe(true);
  });

  it('excludes a site without turning the default off', () => {
    const settings = setFingerprintHost(defaultSettings(), 'broken.example', false);
    const fingerprint = scriptRegistrations(settings).find((script) => script.id === FINGERPRINT_SCRIPT_ID);
    expect(fingerprint?.matches).toEqual(['http://*/*', 'https://*/*']);
    expect(fingerprint?.excludeMatches).toEqual(['*://broken.example/*']);
  });

  it('limits injection to chosen sites when the default is off', () => {
    const settings = setFingerprintHost(setBooleanSetting(defaultSettings(), 'fingerprintProtection', false), 'ok.example', true);
    const scripts = scriptRegistrations(setBooleanSetting(settings, 'sendGpc', false));
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatchObject({
      id: FINGERPRINT_SCRIPT_ID,
      matches: ['*://ok.example/*'],
    });
    expect(scripts[0]?.excludeMatches).toBeUndefined();
  });

  it('can drop the origin fallback for older browsers', () => {
    const scripts = withoutOriginFallback(scriptRegistrations(defaultSettings()));
    expect(scripts.every((script) => script.matchOriginAsFallback === undefined)).toBe(true);
    expect(scripts.map((script) => script.id)).toEqual([GPC_SCRIPT_ID, FINGERPRINT_SCRIPT_ID]);
  });
});

describe('alias menu registration', () => {
  it('registers only when aliases are ready and the setting is on', () => {
    expect(scriptRegistrations(defaultSettings()).some((script) => script.id === ALIAS_SCRIPT_ID)).toBe(false);
    const ready = scriptRegistrations(defaultSettings(), true).find((script) => script.id === ALIAS_SCRIPT_ID);
    expect(ready).toMatchObject({ runAt: 'document_idle', matches: ['http://*/*', 'https://*/*'] });
    expect(ready?.world).toBeUndefined();
    const off = scriptRegistrations(setBooleanSetting(defaultSettings(), 'aliasAutofill', false), true);
    expect(off.some((script) => script.id === ALIAS_SCRIPT_ID)).toBe(false);
  });
});
