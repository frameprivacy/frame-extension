import { browser } from 'wxt/browser';
import { parseStoredSession, type StoredSession } from '../lib/session';
import { parseSettings, type Settings } from '../lib/settings';

export const SETTINGS_KEY = 'settings';
export const SESSION_KEY = 'session';

export async function loadSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  return parseSettings(stored[SETTINGS_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function loadSession(): Promise<StoredSession | null> {
  const stored = await browser.storage.local.get(SESSION_KEY);
  return parseStoredSession(stored[SESSION_KEY]);
}

export async function saveSession(session: StoredSession): Promise<void> {
  await browser.storage.local.set({ [SESSION_KEY]: session });
}

export async function clearSession(): Promise<void> {
  await browser.storage.local.remove(SESSION_KEY);
}
