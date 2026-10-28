import { browser } from 'wxt/browser';
import type { ControlState } from '../lib/control';
import type { Settings } from '../lib/settings';
import {
  ALIAS_SCRIPT_ID,
  FINGERPRINT_SCRIPT_ID,
  GPC_SCRIPT_ID,
  fingerprintMatchPatterns,
  scriptRegistrations,
  withoutOriginFallback,
  type ScriptRegistration,
} from '../lib/scripts';
import { t } from '../lib/i18n';

const KNOWN_IDS = [GPC_SCRIPT_ID, FINGERPRINT_SCRIPT_ID, ALIAS_SCRIPT_ID];

export async function applyPageScripts(
  settings: Settings,
  aliasesReady = false,
): Promise<{ sendGpc: ControlState; fingerprintProtection: ControlState }> {
  if (!browser.scripting?.registerContentScripts || !browser.scripting.getRegisteredContentScripts) {
    const unavailable: ControlState = {
      kind: 'unavailable',
      reason: t('This browser cannot run Frame’s page scripts.'),
    };
    return {
      sendGpc: settings.sendGpc ? unavailable : { kind: 'applied' },
      fingerprintProtection: fingerprintWanted(settings) ? unavailable : { kind: 'applied' },
    };
  }
  const scripts = scriptRegistrations(settings, aliasesReady);
  try {
    const existing = await browser.scripting.getRegisteredContentScripts();
    const remove = existing.map((script) => script.id).filter((id) => KNOWN_IDS.includes(id));
    if (remove.length > 0) await browser.scripting.unregisterContentScripts({ ids: remove });
    if (scripts.length > 0) await registerScripts(scripts);
    return { sendGpc: { kind: 'applied' }, fingerprintProtection: { kind: 'applied' } };
  } catch {
    const reason = t('Could not install the page script. Reload Frame and try again.');
    return {
      sendGpc: settings.sendGpc ? { kind: 'error', reason } : { kind: 'applied' },
      fingerprintProtection: fingerprintWanted(settings) ? { kind: 'error', reason } : { kind: 'applied' },
    };
  }
}

function fingerprintWanted(settings: Settings): boolean {
  return fingerprintMatchPatterns(settings).length > 0;
}

async function registerScripts(scripts: ScriptRegistration[]): Promise<void> {
  const register = browser.scripting.registerContentScripts.bind(browser.scripting);
  const asParam = (value: ScriptRegistration[]) =>
    value as Parameters<typeof browser.scripting.registerContentScripts>[0];
  try {
    await register(asParam(scripts));
  } catch {
    if (!scripts.some((script) => script.matchOriginAsFallback)) throw new Error('register failed');
    await register(asParam(withoutOriginFallback(scripts)));
  }
}
