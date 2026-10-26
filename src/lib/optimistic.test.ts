import { describe, expect, it } from 'vitest';
import type { UiState } from './messages';
import { optimisticState } from './optimistic';
import { defaultSettings, fingerprintEnabledForHost, trackersEnabledForHost } from './settings';

function state(): UiState {
  return {
    settings: defaultSettings(),
    controls: {},
    account: null,
    authError: null,
    signingIn: false,
    siteAccess: true,
    tab: { host: 'example.com', restricted: false },
    siteNotice: null,
    aliasAccess: 'signed-out',
  browser: 'chrome',
  signInAvailable: true,
  };
}

describe('optimistic switch state', () => {
  it('flips a protection right away so a second press toggles it back', () => {
    const first = optimisticState(state(), { type: 'frame.set-setting', id: 'protectWebRtc', value: false });
    expect(first?.settings.protectWebRtc).toBe(false);
    const second = optimisticState(first, {
      type: 'frame.set-setting',
      id: 'protectWebRtc',
      value: !first!.settings.protectWebRtc,
    });
    expect(second?.settings.protectWebRtc).toBe(true);
  });

  it('applies per-site switches', () => {
    const fp = optimisticState(state(), { type: 'frame.set-host', host: 'example.com', enabled: false });
    expect(fingerprintEnabledForHost(fp!.settings, 'example.com')).toBe(false);
    const links = optimisticState(state(), { type: 'frame.set-tracker-host', host: 'example.com', enabled: false });
    expect(trackersEnabledForHost(links!.settings, 'example.com')).toBe(false);
  });

  it('leaves other messages and unknown ids alone', () => {
    const base = state();
    expect(optimisticState(base, { type: 'frame.forget-site' })).toBe(base);
    expect(optimisticState(base, { type: 'frame.set-setting', id: 'nope' as never, value: true })).toBe(base);
    expect(optimisticState(null, { type: 'frame.sign-in' })).toBeNull();
  });
});
