import { describe, expect, it } from 'vitest';
import { defaultSettings, setBooleanSetting } from './settings';
import {
  SAFARI_SITE_ACCESS_REASON,
  SITE_ACCESS_REASON,
  siteAccessControls,
  siteAccessReason,
  type SiteControls,
} from './site-access';

const applied: SiteControls = {
  sendGpc: { kind: 'applied' },
  trimReferrers: { kind: 'applied' },
  fingerprintProtection: { kind: 'applied' },
  stripTrackers: { kind: 'applied' },
};

describe('website access', () => {
  it('keeps controls as they are when Frame has access', () => {
    expect(siteAccessControls(true, defaultSettings(), applied)).toEqual(applied);
  });

  it('marks protections that are on as not working without access', () => {
    const controls = siteAccessControls(false, defaultSettings(), applied);
    for (const state of Object.values(controls)) expect(state).toEqual({ kind: 'error', reason: SITE_ACCESS_REASON });
  });

  it('leaves switched-off protections and other errors alone', () => {
    const settings = setBooleanSetting(defaultSettings(), 'sendGpc', false);
    const controls = siteAccessControls(false, settings, {
      ...applied,
      trimReferrers: { kind: 'error', reason: 'Could not update header rules.' },
    });
    expect(controls.sendGpc).toEqual({ kind: 'applied' });
    expect(controls.trimReferrers).toEqual({ kind: 'error', reason: 'Could not update header rules.' });
  });
});

describe('website access on Safari', () => {
  it('says Frame only runs on the sites Safari allowed', () => {
    const controls = siteAccessControls(false, defaultSettings(), applied, 'safari');
    for (const state of Object.values(controls)) {
      expect(state).toEqual({ kind: 'error', reason: SAFARI_SITE_ACCESS_REASON });
    }
    expect(siteAccessReason('firefox')).toBe(SITE_ACCESS_REASON);
    expect(siteAccessReason('chrome')).toBe(SITE_ACCESS_REASON);
  });

  it('keeps a protection Safari never offers as not offered', () => {
    const controls = siteAccessControls(
      false,
      defaultSettings(),
      { ...applied, trimReferrers: { kind: 'unavailable', reason: 'no response headers' } },
      'safari',
    );
    expect(controls.trimReferrers).toEqual({ kind: 'unavailable', reason: 'no response headers' });
  });
});
