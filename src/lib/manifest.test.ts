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
    expect(buildManifest('safari', false).description).not.toMatch(/account/);
    expect(buildManifest('safari', true).description).toMatch(/Frame account/);
    expect(buildManifest('chrome').description).toMatch(/Chrome and Firefox/);
  });
});
