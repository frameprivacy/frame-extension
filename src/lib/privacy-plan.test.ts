import { describe, expect, it } from 'vitest';
import { defaultSettings, setBooleanSetting } from './settings';
import { privacyWrites } from './privacy-plan';

describe('privacy writes', () => {
  it('disables ad APIs and never sets them back to true', () => {
    const enabled = privacyWrites(defaultSettings()).filter((write) => write.toggle === 'disableAdPrivacyApis');
    expect(enabled.map((write) => [write.name, write.op, write.value])).toEqual([
      ['topicsEnabled', 'set', false],
      ['fledgeEnabled', 'set', false],
      ['adMeasurementEnabled', 'set', false],
    ]);

    const cleared = privacyWrites(setBooleanSetting(defaultSettings(), 'disableAdPrivacyApis', false)).filter(
      (write) => write.toggle === 'disableAdPrivacyApis',
    );
    expect(cleared.every((write) => write.op === 'clear')).toBe(true);
    expect(cleared.some((write) => write.value === true)).toBe(false);
  });

  it('maps the WebRTC toggle to non-proxied UDP, and clears it when off', () => {
    const on = privacyWrites(defaultSettings()).find((write) => write.name === 'webRTCIPHandlingPolicy');
    expect(on).toMatchObject({ op: 'set', value: 'disable_non_proxied_udp' });
    const off = privacyWrites(setBooleanSetting(defaultSettings(), 'protectWebRtc', false)).find(
      (write) => write.name === 'webRTCIPHandlingPolicy',
    );
    expect(off).toMatchObject({ op: 'clear' });
  });

  it('does not pretend header features are privacy settings', () => {
    const names = privacyWrites(defaultSettings()).map((write) => write.name);
    expect(names).not.toContain('globalPrivacyControl');
    expect(names).toContain('thirdPartyCookiesAllowed');
    expect(names).toContain('hyperlinkAuditingEnabled');
    expect(names).toContain('networkPredictionEnabled');
    expect(names).toContain('doNotTrackEnabled');
  });
});
