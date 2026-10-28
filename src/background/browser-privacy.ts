import { browser } from 'wxt/browser';
import { aggregateControls, lockForLevel, UNAVAILABLE_REASON, type ControlState } from '../lib/control';
import { privacyWrites, type PrivacyGroup, type PrivacyWrite } from '../lib/privacy-plan';
import type { BooleanSettingId, Settings } from '../lib/settings';
import { t } from '../lib/i18n';

interface ChromeSettingApi {
  get(details: Record<string, never>): Promise<{ value?: unknown; levelOfControl?: string }>;
  set(details: { value: unknown; scope?: string }): Promise<void>;
  clear(details: { scope?: string }): Promise<void>;
}

export async function applyPrivacySettings(
  settings: Settings,
): Promise<Partial<Record<BooleanSettingId, ControlState>>> {
  const grouped = new Map<BooleanSettingId, ControlState[]>();
  for (const write of privacyWrites(settings)) {
    const result = await applyWrite(write);
    const list = grouped.get(write.toggle) ?? [];
    list.push(result);
    grouped.set(write.toggle, list);
  }
  const controls: Partial<Record<BooleanSettingId, ControlState>> = {};
  for (const [toggle, states] of grouped) controls[toggle] = aggregateControls(states);
  return controls;
}

async function applyWrite(write: PrivacyWrite): Promise<ControlState> {
  const setting = resolveSetting(write.group, write.name);
  if (!setting) return { kind: 'unavailable', reason: UNAVAILABLE_REASON };
  let current: { value?: unknown; levelOfControl?: string };
  try {
    current = await setting.get({});
  } catch {
    return { kind: 'error', reason: t('Could not read this setting.') };
  }
  const locked = lockForLevel(current.levelOfControl);
  if (locked) return locked;
  try {
    if (write.op === 'clear') await clearSetting(setting);
    else await setSetting(setting, write.value);
  } catch {
    return { kind: 'error', reason: t('The browser rejected this change.') };
  }
  try {
    const after = await setting.get({});
    return lockForLevel(after.levelOfControl) ?? { kind: 'applied' };
  } catch {
    return { kind: 'applied' };
  }
}

function resolveSetting(group: PrivacyGroup, name: string): ChromeSettingApi | null {
  const privacy = browser.privacy as
    | Partial<Record<PrivacyGroup, Record<string, ChromeSettingApi | undefined>>>
    | undefined;
  const setting = privacy?.[group]?.[name];
  if (!setting || typeof setting.get !== 'function' || typeof setting.set !== 'function') return null;
  return setting;
}

async function setSetting(setting: ChromeSettingApi, value: unknown): Promise<void> {
  try {
    await setting.set({ value, scope: 'regular' });
  } catch {
    await setting.set({ value });
  }
}

async function clearSetting(setting: ChromeSettingApi): Promise<void> {
  try {
    await setting.clear({ scope: 'regular' });
  } catch {
    await setting.clear({});
  }
}
