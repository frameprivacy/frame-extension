import { browser } from 'wxt/browser';
import type { ControlState } from '../lib/control';
import { GPC_RULE_ID, REFERRER_RULE_ID, headerRules } from '../lib/dnr';
import type { Settings } from '../lib/settings';
import { trackerRuleIds, trackerRules } from '../lib/trackers';

const HEADER_ERROR = 'Could not update header rules.';
const TRACKER_ERROR = 'Could not update tracking-link rules.';

export async function applyHeaderRules(settings: Settings): Promise<{
  sendGpc: ControlState;
  trimReferrers: ControlState;
  stripTrackers: ControlState;
}> {
  const applied = { sendGpc: appliedState(), trimReferrers: appliedState(), stripTrackers: appliedState() };
  if (!browser.declarativeNetRequest?.updateDynamicRules) {
    const unavailable: ControlState = {
      kind: 'unavailable',
      reason: 'This browser cannot change requests from an extension.',
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
      addRules: [...headerRules(settings), ...trackerRules(settings)] as Parameters<
        typeof browser.declarativeNetRequest.updateDynamicRules
      >[0]['addRules'],
    });
    return applied;
  } catch {
    return {
      sendGpc: settings.sendGpc ? { kind: 'error', reason: HEADER_ERROR } : appliedState(),
      trimReferrers: settings.trimReferrers ? { kind: 'error', reason: HEADER_ERROR } : appliedState(),
      stripTrackers: settings.stripTrackers ? { kind: 'error', reason: TRACKER_ERROR } : appliedState(),
    };
  }
}

function appliedState(): ControlState {
  return { kind: 'applied' };
}
