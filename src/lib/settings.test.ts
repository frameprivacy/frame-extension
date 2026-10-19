import { describe, expect, it } from 'vitest';
import {
  classifyUrl,
  clearFingerprintHost,
  defaultSettings,
  fingerprintEnabledForHost,
  hostMatchPattern,
  parseSettings,
  setBooleanSetting,
  setFingerprintHost,
} from './settings';

describe('settings', () => {
  it('starts with the protections on', () => {
    const settings = defaultSettings();
    expect(settings.protectWebRtc).toBe(true);
    expect(settings.fingerprintProtection).toBe(true);
    expect(settings.sendGpc).toBe(true);
    expect(settings.trimReferrers).toBe(true);
    expect(settings.fingerprintHosts).toEqual({});
  });

  it('keeps known booleans and drops bad host exceptions', () => {
    const settings = parseSettings({
      protectWebRtc: false,
      sendGpc: 'yes',
      fingerprintHosts: {
        'Example.COM': false,
        'not a host': true,
        '*.example.com': false,
        localhost: true,
      },
    });
    expect(settings.protectWebRtc).toBe(false);
    expect(settings.sendGpc).toBe(true);
    expect(settings.fingerprintHosts).toEqual({
      'example.com': false,
      localhost: true,
    });
  });

  it('stores a site exception only when it differs from the default', () => {
    const settings = defaultSettings();
    const off = setFingerprintHost(settings, 'News.Example.com', false);
    expect(off.fingerprintHosts).toEqual({ 'news.example.com': false });
    expect(fingerprintEnabledForHost(off, 'news.example.com')).toBe(false);
    expect(fingerprintEnabledForHost(off, 'example.com')).toBe(true);
    const back = setFingerprintHost(off, 'news.example.com', true);
    expect(back.fingerprintHosts).toEqual({});
  });

  it('removes an exception without touching other hosts', () => {
    const settings = setFingerprintHost(
      setFingerprintHost(defaultSettings(), 'a.test', false),
      'b.test',
      false,
    );
    expect(clearFingerprintHost(settings, 'a.test').fingerprintHosts).toEqual({ 'b.test': false });
  });

  it('updates one toggle immutably', () => {
    const settings = defaultSettings();
    const next = setBooleanSetting(settings, 'protectWebRtc', false);
    expect(next.protectWebRtc).toBe(false);
    expect(settings.protectWebRtc).toBe(true);
  });

  it('classifies web pages and browser pages', () => {
    expect(classifyUrl('https://www.Example.com/path')).toEqual({
      host: 'www.example.com',
      restricted: false,
    });
    expect(classifyUrl('chrome://extensions')).toEqual({ host: null, restricted: true });
    expect(classifyUrl(undefined)).toEqual({ host: null, restricted: false });
    expect(classifyUrl('http://[::1]/')).toEqual({ host: '::1', restricted: false });
    expect(classifyUrl('https://münchen.de/a').host).toBeTruthy();
    expect(hostMatchPattern('www.example.com')).toBe('*://www.example.com/*');
    expect(hostMatchPattern('::1')).toBe('*://[::1]/*');
    expect(hostMatchPattern('bad host')).toBeNull();
  });
});
