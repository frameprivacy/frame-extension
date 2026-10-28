import type { ControlState } from './control';
import { fingerprintMatchPatterns } from './scripts';
import type { BrowserTarget } from './platform';
import type { Settings } from './settings';
import { t } from './i18n';

/**
 * The website access in the manifest. Firefox lets people turn it off for an add-on.
 * Safari asks per site: until someone allows Frame on every website, it only runs
 * on the sites they allowed.
 */
export const SITE_ORIGINS = ['http://*/*', 'https://*/*'] as const;

export const SITE_ACCESS_REASON = t('Frame doesn’t have access to websites, so this isn’t working. Allow access above.');
export const SAFARI_SITE_ACCESS_REASON =
  t('Safari hasn’t allowed Frame on every website, so this only runs on sites you’ve allowed. Allow access above.');

export function siteAccessReason(target: BrowserTarget): string {
  return target === 'safari' ? SAFARI_SITE_ACCESS_REASON : SITE_ACCESS_REASON;
}

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
export function siteAccessControls(
  access: boolean,
  settings: Settings,
  controls: SiteControls,
  target: BrowserTarget = 'chrome',
): SiteControls {
  if (access) return controls;
  const reason = siteAccessReason(target);
  const blocked = (wanted: boolean, state: ControlState): ControlState =>
    wanted && state.kind === 'applied' ? { kind: 'error', reason } : state;
  const anyTrackerHost = Object.values(settings.trackerHosts).some(Boolean);
  return {
    sendGpc: blocked(settings.sendGpc, controls.sendGpc),
    trimReferrers: blocked(settings.trimReferrers, controls.trimReferrers),
    fingerprintProtection: blocked(fingerprintMatchPatterns(settings).length > 0, controls.fingerprintProtection),
    stripTrackers: blocked(settings.stripTrackers || anyTrackerHost, controls.stripTrackers),
  };
}
