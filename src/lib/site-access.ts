import type { ControlState } from './control';
import { fingerprintMatchPatterns } from './scripts';
import type { Settings } from './settings';

/** The website access in the manifest. Firefox lets people turn it off for an add-on. */
export const SITE_ORIGINS = ['http://*/*', 'https://*/*'] as const;

export const SITE_ACCESS_REASON = 'Frame doesn’t have access to websites, so this isn’t working. Allow access above.';

export interface SiteControls {
  sendGpc: ControlState;
  trimReferrers: ControlState;
  fingerprintProtection: ControlState;
  stripTrackers: ControlState;
}

/**
 * Header rules, link cleaning, and page scripts only reach sites Frame has access to.
 * Without access, a protection that is on is shown as not working instead of as applied.
 */
export function siteAccessControls(access: boolean, settings: Settings, controls: SiteControls): SiteControls {
  if (access) return controls;
  const blocked = (wanted: boolean, state: ControlState): ControlState =>
    wanted && state.kind === 'applied' ? { kind: 'error', reason: SITE_ACCESS_REASON } : state;
  const anyTrackerHost = Object.values(settings.trackerHosts).some(Boolean);
  return {
    sendGpc: blocked(settings.sendGpc, controls.sendGpc),
    trimReferrers: blocked(settings.trimReferrers, controls.trimReferrers),
    fingerprintProtection: blocked(fingerprintMatchPatterns(settings).length > 0, controls.fingerprintProtection),
    stripTrackers: blocked(settings.stripTrackers || anyTrackerHost, controls.stripTrackers),
  };
}
