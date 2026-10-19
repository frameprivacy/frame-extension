import { browser } from 'wxt/browser';
import type { ControlState } from '../lib/control';
import { GPC_RULE_ID, REFERRER_RULE_ID, headerRules } from '../lib/dnr';
import type { Settings } from '../lib/settings';

const HEADER_ERROR = 'Could not update header rules.';

export async function applyHeaderRules(
  settings: Settings,
): Promise<{ sendGpc: ControlState; trimReferrers: ControlState }> {
  const applied = { sendGpc: appliedState(), trimReferrers: appliedState() };
  if (!browser.declarativeNetRequest?.updateDynamicRules) {
    const unavailable: ControlState = {
      kind: 'unavailable',
      reason: 'This browser cannot change request headers from an extension.',
    };
    return {
      sendGpc: settings.sendGpc ? unavailable : appliedState(),
      trimReferrers: settings.trimReferrers ? unavailable : appliedState(),
    };
  }
  try {
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [GPC_RULE_ID, REFERRER_RULE_ID],
      addRules: headerRules(settings) as Parameters<
        typeof browser.declarativeNetRequest.updateDynamicRules
      >[0]['addRules'],
    });
    return applied;
  } catch {
    return {
      sendGpc: settings.sendGpc ? { kind: 'error', reason: HEADER_ERROR } : appliedState(),
      trimReferrers: settings.trimReferrers ? { kind: 'error', reason: HEADER_ERROR } : appliedState(),
    };
  }
}

function appliedState(): ControlState {
  return { kind: 'applied' };
}
