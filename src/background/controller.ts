import { browser } from 'wxt/browser';
import { clientIdFromRedirect, codeChallenge, createVerifier, isTokenExpired, parseAuthRedirect, randomState, signInClient } from '../lib/auth';
import { aggregateControls } from '../lib/control';
import { createFrameClient } from '../lib/frame/create-client';
import { endsSession, FrameApiError, SESSION_ENDED } from '../lib/frame/errors';
import { buildAuthorizeUrl } from '../lib/frame/parse';
import { createPreviewSession } from '../lib/frame/stub';
import type { FrameExposure } from '../lib/frame/types';
import {
  isExtensionMessage,
  type ExtensionMessage,
  type PublicAccount,
  type SiteNotice,
  type UiState,
} from '../lib/messages';
import { toPublicAccount, withToken, type StoredSession } from '../lib/session';
import {
  classifyUrl,
  clearFingerprintHost,
  isBooleanSettingId,
  setBooleanSetting,
  setFingerprintHost,
  setTrackerHost,
  clearTrackerHost,
  type Settings,
} from '../lib/settings';
import { applyPrivacySettings } from './browser-privacy';
import { applyHeaderRules } from './network';
import { applyPageScripts } from './page-scripts';
import { clearSite } from './forget-site';
import { clearSession, loadSession, loadSettings, saveSession, saveSettings } from './store';

const client = createFrameClient();
const EXPOSURE_TTL_MS = 5 * 60 * 1000;

let controls: UiState['controls'] = {};
let authError: string | null = null;
let signingIn = false;
let exposureFetchedAt = 0;
let siteNotice: SiteNotice | null = null;
let appliedSignature = '';
let chain: Promise<unknown> = Promise.resolve();

export function startBackground(): void {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isExtensionMessage(message)) return false;
    void enqueue(() => handle(message))
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({
          error: error instanceof Error ? error.message : 'Frame hit an unexpected error.',
        });
      });
    return true;
  });
  browser.runtime.onInstalled.addListener(() => {
    void enqueue(applyCurrent);
  });
  browser.runtime.onStartup.addListener(() => {
    void enqueue(applyCurrent);
  });
  void enqueue(applyCurrent);
}

async function handle(message: ExtensionMessage): Promise<UiState> {
  switch (message.type) {
    case 'frame.get-state':
      return getState();
    case 'frame.set-setting':
      return setSetting(message.id, message.value);
    case 'frame.set-host':
      return setHost(message.host, message.enabled);
    case 'frame.clear-host':
      return clearHost(message.host);
    case 'frame.set-tracker-host':
      return setTracker(message.host, message.enabled);
    case 'frame.clear-tracker-host':
      return clearTracker(message.host);
    case 'frame.forget-site':
      return forgetActiveSite();
    case 'frame.reload-tab':
      return reloadActiveTab();
    case 'frame.sign-in':
      return signIn();
    case 'frame.sign-out':
      return signOut();
    default:
      return getState();
  }
}

async function getState(): Promise<UiState> {
  siteNotice = null;
  const settings = await loadSettings();
  await applyAll(settings);
  const session = await refreshedSession(await loadSession());
  return uiState(settings, session);
}

async function setSetting(id: unknown, value: unknown): Promise<UiState> {
  if (!isBooleanSettingId(id) || typeof value !== 'boolean') return getState();
  const settings = setBooleanSetting(await loadSettings(), id, value);
  await saveSettings(settings);
  await applyAll(settings);
  return uiState(settings, await loadSession());
}

async function setHost(host: unknown, enabled: unknown): Promise<UiState> {
  if (typeof host !== 'string' || typeof enabled !== 'boolean') return getState();
  const settings = setFingerprintHost(await loadSettings(), host, enabled);
  await saveSettings(settings);
  await applyAll(settings);
  return uiState(settings, await loadSession());
}

async function setTracker(host: unknown, enabled: unknown): Promise<UiState> {
  if (typeof host !== 'string' || typeof enabled !== 'boolean') return getState();
  const settings = setTrackerHost(await loadSettings(), host, enabled);
  await saveSettings(settings);
  await applyAll(settings);
  return uiState(settings, await loadSession());
}

async function clearTracker(host: unknown): Promise<UiState> {
  if (typeof host !== 'string') return getState();
  const settings = clearTrackerHost(await loadSettings(), host);
  await saveSettings(settings);
  await applyAll(settings);
  return uiState(settings, await loadSession());
}

async function forgetActiveSite(): Promise<UiState> {
  const settings = await loadSettings();
  const tab = await browsingTab();
  if (!tab.url || !tab.host) {
    siteNotice = { tone: 'error', text: 'Open a site to clear its data.', host: tab.host, canReload: false };
    return uiState(settings, await loadSession());
  }
  try {
    siteNotice = { tone: 'ok', text: await clearSite(tab.url), host: tab.host, canReload: tab.id !== null };
  } catch (error) {
    siteNotice = {
      tone: 'error',
      text: error instanceof Error ? error.message : 'Couldn’t clear site data for this site.',
      host: tab.host,
      canReload: false,
    };
  }
  return uiState(settings, await loadSession());
}

async function reloadActiveTab(): Promise<UiState> {
  const settings = await loadSettings();
  const tab = await browsingTab();
  if (tab.id === null) {
    siteNotice = { tone: 'error', text: 'That tab is gone. Reload it yourself.', host: tab.host, canReload: false };
    return uiState(settings, await loadSession());
  }
  try {
    await browser.tabs.reload(tab.id);
    siteNotice = { tone: 'ok', text: 'Reloaded this tab.', host: tab.host, canReload: false };
  } catch {
    siteNotice = { tone: 'error', text: 'Couldn’t reload this tab.', host: tab.host, canReload: true };
  }
  return uiState(settings, await loadSession());
}

async function clearHost(host: unknown): Promise<UiState> {
  if (typeof host !== 'string') return getState();
  const settings = clearFingerprintHost(await loadSettings(), host);
  await saveSettings(settings);
  await applyAll(settings);
  return uiState(settings, await loadSession());
}

async function signIn(): Promise<UiState> {
  if (signingIn) return uiState(await loadSettings(), await loadSession());
  signingIn = true;
  authError = null;
  try {
    if (client.mode === 'stub') {
      await saveSession(createPreviewSession());
      exposureFetchedAt = Date.now();
    } else {
      authError = await liveSignIn();
    }
  } finally {
    signingIn = false;
  }
  return uiState(await loadSettings(), await loadSession());
}

async function liveSignIn(): Promise<string | null> {
  const redirectUri = browser.identity.getRedirectURL();
  const clientId = clientIdFromRedirect(redirectUri);
  if (!clientId) return 'This browser returned an unexpected sign-in address.';
  const verifier = createVerifier();
  const state = randomState();
  const challenge = await codeChallenge(verifier);
  let returned: string | undefined;
  try {
    returned = await browser.identity.launchWebAuthFlow({
      url: buildAuthorizeUrl({
        redirectUri,
        state,
        codeChallenge: challenge,
        clientId,
        client: signInClient(import.meta.env.BROWSER),
      }),
      interactive: true,
    });
  } catch {
    return 'Sign-in was cancelled.';
  }
  if (!returned) return 'Sign-in was cancelled.';
  const parsed = parseAuthRedirect(returned, state);
  if (!parsed.ok) return parsed.message;
  try {
    const token = await client.exchangeCode({
      code: parsed.code,
      codeVerifier: verifier,
      redirectUri,
      clientId,
    });
    const account = await client.getAccount(token.accessToken);
    let exposure: FrameExposure | null = null;
    try {
      exposure = await client.getExposure(token.accessToken);
    } catch (error) {
      if (error instanceof FrameApiError && endsSession(error)) throw error;
      exposure = null;
    }
    await saveSession({ token, account, exposure });
    exposureFetchedAt = Date.now();
    return null;
  } catch (error) {
    if (error instanceof FrameApiError) return error.message;
    return 'Frame could not complete sign-in.';
  }
}

async function signOut(): Promise<UiState> {
  authError = null;
  const session = await loadSession();
  if (session && client.mode === 'live') {
    try {
      await client.revoke(session.token.refreshToken, session.token.clientId);
    } catch {
      /* Local sign-out still proceeds when the site is unreachable. */
    }
  }
  await clearSession();
  exposureFetchedAt = 0;
  return uiState(await loadSettings(), null);
}

async function applyCurrent(): Promise<void> {
  await applyAll(await loadSettings());
}

async function applyAll(settings: Settings): Promise<void> {
  const signature = JSON.stringify(settings);
  if (signature === appliedSignature) {
    controls = { ...controls, ...(await applyPrivacySettings(settings)) };
    return;
  }
  const privacy = await applyPrivacySettings(settings);
  const headers = await applyHeaderRules(settings);
  const scripts = await applyPageScripts(settings);
  controls = {
    ...privacy,
    sendGpc: aggregateControls([headers.sendGpc, scripts.sendGpc]),
    trimReferrers: headers.trimReferrers,
    fingerprintProtection: scripts.fingerprintProtection,
    stripTrackers: headers.stripTrackers,
  };
  const failed = [
    headers.sendGpc,
    headers.trimReferrers,
    headers.stripTrackers,
    scripts.sendGpc,
    scripts.fingerprintProtection,
  ].some((state) => state.kind === 'error');
  if (!failed) appliedSignature = signature;
}

async function refreshedSession(session: StoredSession | null): Promise<StoredSession | null> {
  if (!session) return null;
  let current = session;
  if (isTokenExpired(current.token.expiresAt)) {
    try {
      const token = await client.refresh(current.token.refreshToken, current.token.clientId);
      current = withToken(current, token);
      await saveSession(current);
    } catch (error) {
      if (error instanceof FrameApiError && endsSession(error)) {
        await clearSession();
        authError = SESSION_ENDED;
        return null;
      }
      if (error instanceof FrameApiError) authError = error.message;
      return current;
    }
  }
  if (Date.now() - exposureFetchedAt < EXPOSURE_TTL_MS && current.exposure) return current;
  try {
    const exposure = await client.getExposure(current.token.accessToken);
    exposureFetchedAt = Date.now();
    if (JSON.stringify(exposure) !== JSON.stringify(current.exposure)) {
      current = { ...current, exposure };
      await saveSession(current);
    }
  } catch (error) {
    if (error instanceof FrameApiError && endsSession(error)) {
      await clearSession();
      authError = SESSION_ENDED;
      return null;
    }
    exposureFetchedAt = Date.now();
  }
  return current;
}

async function uiState(settings: Settings, session: StoredSession | null): Promise<UiState> {
  return {
    settings,
    controls,
    account: session ? publicAccount(session) : null,
    authError,
    signingIn,
    tab: await currentTab(),
    siteNotice,
  };
}

function publicAccount(session: StoredSession): PublicAccount {
  return toPublicAccount(session, client.mode === 'stub');
}

async function currentTab(): Promise<UiState['tab']> {
  const tab = await browsingTab();
  return { host: tab.host, restricted: tab.restricted };
}

async function browsingTab(): Promise<{ id: number | null; url: string | null; host: string | null; restricted: boolean }> {
  try {
    const [active] = await browser.tabs.query({ active: true, currentWindow: true });
    const direct = describeTab(active);
    if (direct.host || !direct.url?.startsWith(browser.runtime.getURL(''))) return direct;
    const tabs = await browser.tabs.query({ currentWindow: true });
    const web = tabs
      .filter((tab) => tab.id !== active?.id)
      .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))
      .map((tab) => describeTab(tab))
      .find((item) => item.host);
    return web ?? direct;
  } catch {
    return { id: null, url: null, host: null, restricted: false };
  }
}

function describeTab(tab: { id?: number; url?: string } | undefined): {
  id: number | null;
  url: string | null;
  host: string | null;
  restricted: boolean;
} {
  const classified = classifyUrl(tab?.url);
  return { id: tab?.id ?? null, url: tab?.url ?? null, host: classified.host, restricted: classified.restricted };
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
