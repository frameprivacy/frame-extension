import { browser } from 'wxt/browser';
import type { ControlState } from '../lib/control';
import { GPC_RULE_ID, REFERRER_RULE_ID, canSetResponseHeaders, headerRules } from '../lib/dnr';
import { browserTarget } from '../lib/platform';
import type { Settings } from '../lib/settings';
import { trackerRuleIds, trackerRules } from '../lib/trackers';
import { t } from '../lib/i18n';

const HEADER_ERROR = t('Could not update header rules.');
const TRACKER_ERROR = t('Could not update tracking-link rules.');
export const RESPONSE_HEADERS_UNAVAILABLE = t('Safari doesn’t let extensions change response headers, so Frame can’t set a Referrer-Policy here.');

export async function applyHeaderRules(settings: Settings): Promise<{
  sendGpc: ControlState;
  trimReferrers: ControlState;
  stripTrackers: ControlState;
}> {
  const target = browserTarget(import.meta.env.BROWSER);
  const referrerState: ControlState = canSetResponseHeaders(target)
    ? appliedState()
    : { kind: 'unavailable', reason: RESPONSE_HEADERS_UNAVAILABLE };
  const applied = { sendGpc: appliedState(), trimReferrers: referrerState, stripTrackers: appliedState() };
  if (!browser.declarativeNetRequest?.updateDynamicRules) {
    const unavailable: ControlState = {
      kind: 'unavailable',
      reason: t('This browser cannot change requests from an extension.'),
    };
    return {
      sendGpc: settings.sendGpc ? unavailable : appliedState(),
      trimReferrers: settings.trimReferrers ? unavailable : appliedState(),
      stripTrackers: settings.stripTrackers ? unavailable : appliedState(),
    };
  }
  try {
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [GPC_RULE_ID, REFERRER_RULE_ID, ...trackerRuleIds()],
      addRules: [...headerRules(settings, target), ...trackerRules(settings)] as Parameters<
        typeof browser.declarativeNetRequest.updateDynamicRules
      >[0]['addRules'],
    });
    return applied;
  } catch {
    return {
      sendGpc: settings.sendGpc ? { kind: 'error', reason: HEADER_ERROR } : appliedState(),
      trimReferrers:
        referrerState.kind === 'unavailable'
          ? referrerState
          : settings.trimReferrers
            ? { kind: 'error', reason: HEADER_ERROR }
            : appliedState(),
      stripTrackers: settings.stripTrackers ? { kind: 'error', reason: TRACKER_ERROR } : appliedState(),
    };
  }
}

function appliedState(): ControlState {
  return { kind: 'applied' };
}
