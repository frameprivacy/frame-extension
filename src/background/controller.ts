import { browser } from 'wxt/browser';
import {
  clientIdFromRedirect,
  codeChallenge,
  createVerifier,
  isTokenExpired,
  parseAuthRedirect,
  randomState,
  signInAvailable,
  signInClient,
  signInMethod,
  type PendingSignIn,
} from '../lib/auth';
import { SAFARI_CLIENT_ID, SAFARI_REDIRECT_URI, SAFARI_SIGN_IN_READY } from '../lib/extension-ids';
import { browserTarget } from '../lib/platform';
import { aggregateControls } from '../lib/control';
import { createFrameClient } from '../lib/frame/create-client';
import { endsSession, FrameApiError, SESSION_ENDED } from '../lib/frame/errors';
import { buildAuthorizeUrl } from '../lib/frame/parse';
import { createPreviewSession } from '../lib/frame/stub';
import type { FrameExposure } from '../lib/frame/types';
import {
  isAliasMessage,
  isExtensionMessage,
  isPageAliasMessage,
  type AliasAccess,
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
import { hasSiteAccess } from './site-access';
import { siteAccessControls } from '../lib/site-access';
import { hasAliasScope } from '../lib/aliases';
import { canReadReturnPage, clearPendingSignIn, startTabSignIn, watchTabSignIn } from './tab-sign-in';
import { handleAliasMessage } from './aliases';

const client = createFrameClient();
const target = browserTarget(import.meta.env.BROWSER);
const canSignIn = signInAvailable(target, SAFARI_SIGN_IN_READY);
export const SAFARI_SIGN_IN_UNAVAILABLE = 'Sign-in isn’t available in Safari yet. Every protection works without an account.';
export const SAFARI_NEEDS_SITE_ACCESS =
  'Allow Frame on frameprivacy.com so Safari lets it finish sign-in, then try again.';
const EXPOSURE_TTL_MS = 5 * 60 * 1000;

let controls: UiState['controls'] = {};
let authError: string | null = null;
let signingIn = false;
let exposureFetchedAt = 0;
let siteNotice: SiteNotice | null = null;
let siteAccess = true;
let appliedSignature = '';
let chain: Promise<unknown> = Promise.resolve();

export function startBackground(): void {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isAliasMessage(message)) {
      const allowed = isPageAliasMessage(message) ? fromOwnContentScript(sender) : fromExtensionPage(sender);
      if (!allowed) return false;
      void handleAliasMessage(message, sender, {
        client,
        enqueue,
        refreshedToken,
        browsingTabHost: async () => (await browsingTab()).host,
        sessionEnded: async () => {
          await clearSession();
          authError = SESSION_ENDED;
          await applyAll(await loadSettings());
        },
      })
        .then(sendResponse)
        .catch(() => sendResponse({ ok: false, error: 'Frame hit an unexpected error.', code: null, reconnect: false }));
      return true;
    }
    if (!isExtensionMessage(message) || !fromExtensionPage(sender)) return false;
    // Sign-in waits on the browser's sign-in window, which can stay open for minutes.
    // It runs beside the queue so the popup and options page keep working meanwhile.
    const run = message.type === 'frame.sign-in' ? signIn() : enqueue(() => handle(message));
    void run
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
  // Firefox lets people take away website access from the add-on's page in about:addons.
  const reapply = () => {
    appliedSignature = '';
    void enqueue(applyCurrent);
  };
  browser.permissions?.onAdded?.addListener(reapply);
  browser.permissions?.onRemoved?.addListener(reapply);
  // Safari signs in through a normal tab; this finishes it, even after the worker was suspended.
  if (signInMethod(target) === 'tab' && canSignIn) {
    watchTabSignIn(async (returnedUrl, pending) => {
      authError = await completeSignIn(returnedUrl, pending);
      await enqueue(applyCurrent);
    });
  }
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
    case 'frame.sign-out':
      return signOut();
    default:
      return getState();
  }
}

async function getState(): Promise<UiState> {
  siteNotice = null;
  const settings = await loadSettings();
  const session = await refreshedSession(await loadSession());
  await applyAll(settings);
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
  if (signingIn) return enqueue(async () => uiState(await loadSettings(), await loadSession()));
  if (!canSignIn) {
    authError = SAFARI_SIGN_IN_UNAVAILABLE;
    return enqueue(async () => uiState(await loadSettings(), await loadSession()));
  }
  signingIn = true;
  authError = null;
  try {
    if (client.mode === 'stub') {
      await enqueue(() => saveSession(createPreviewSession()));
      exposureFetchedAt = Date.now();
    } else if (signInMethod(target) === 'tab') {
      authError = await tabSignIn();
    } else {
      authError = await liveSignIn();
    }
  } finally {
    signingIn = false;
  }
  return enqueue(async () => {
    const settings = await loadSettings();
    // A new sign-in may have granted (or dropped) the aliases scope, which turns the email-field menu on or off.
    await applyAll(settings);
    return uiState(settings, await loadSession());
  });
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
  return completeSignIn(returned, { state, verifier, redirectUri, clientId });
}

/**
 * Safari: opens frameprivacy.com in a tab. The tab watcher finishes sign-in
 * when the tab reaches the return page, after this popup has closed.
 */
async function tabSignIn(): Promise<string | null> {
  if (!(await canReadReturnPage(SAFARI_REDIRECT_URI))) return SAFARI_NEEDS_SITE_ACCESS;
  const verifier = createVerifier();
  const state = randomState();
  const challenge = await codeChallenge(verifier);
  try {
    await startTabSignIn({
      authorizeUrl: buildAuthorizeUrl({
        redirectUri: SAFARI_REDIRECT_URI,
        state,
        codeChallenge: challenge,
        clientId: SAFARI_CLIENT_ID,
        client: signInClient(target),
      }),
      pending: { state, verifier, redirectUri: SAFARI_REDIRECT_URI, clientId: SAFARI_CLIENT_ID },
    });
  } catch {
    await clearPendingSignIn();
    return 'Frame could not open the sign-in page.';
  }
  return null;
}

/** Exchanges the returned code and saves the session. Shared by both sign-in methods. */
async function completeSignIn(
  returned: string,
  pending: Pick<PendingSignIn, 'state' | 'verifier' | 'redirectUri' | 'clientId'>,
): Promise<string | null> {
  const parsed = parseAuthRedirect(returned, pending.state);
  if (!parsed.ok) return parsed.message;
  try {
    const token = await client.exchangeCode({
      code: parsed.code,
      codeVerifier: pending.verifier,
      redirectUri: pending.redirectUri,
      clientId: pending.clientId,
    });
    const account = await client.getAccount(token.accessToken);
    let exposure: FrameExposure | null = null;
    try {
      exposure = await client.getExposure(token.accessToken);
    } catch (error) {
      if (error instanceof FrameApiError && endsSession(error)) throw error;
      exposure = null;
    }
    await enqueue(() => saveSession({ token, account, exposure }));
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
  const settings = await loadSettings();
  await applyAll(settings);
  return uiState(settings, null);
}

async function applyCurrent(): Promise<void> {
  await applyAll(await loadSettings());
}

async function applyAll(settings: Settings): Promise<void> {
  siteAccess = await hasSiteAccess();
  const aliasesReady = siteAccess && aliasAccess(await loadSession()) === 'ready';
  const signature = JSON.stringify({ settings, siteAccess, aliasesReady });
  if (signature === appliedSignature) {
    controls = { ...controls, ...(await applyPrivacySettings(settings)) };
    return;
  }
  const privacy = await applyPrivacySettings(settings);
  const headers = await applyHeaderRules(settings);
  const scripts = await applyPageScripts(settings, aliasesReady);
  controls = {
    ...privacy,
    ...siteAccessControls(
      siteAccess,
      settings,
      {
      sendGpc: aggregateControls([headers.sendGpc, scripts.sendGpc]),
      trimReferrers: headers.trimReferrers,
      fingerprintProtection: scripts.fingerprintProtection,
        stripTrackers: headers.stripTrackers,
      },
      target,
    ),
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
      authError = null;
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
    // A refresh that failed for a moment earlier left its message behind. This call proves the session works.
    authError = null;
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
    siteAccess,
    browser: target,
    signInAvailable: canSignIn,
    tab: await currentTab(),
    siteNotice,
    aliasAccess: aliasAccess(session),
  };
}

function aliasAccess(session: StoredSession | null): AliasAccess {
  if (!session) return 'signed-out';
  return hasAliasScope(session.token.scope) ? 'ready' : 'needs-scope';
}

/**
 * An access token that is good for at least another minute. Runs in the queue, so two alias calls never
 * rotate the same refresh token (a reused refresh token ends the session).
 */
async function refreshedToken(): Promise<string | null> {
  const session = await loadSession();
  if (!session) return null;
  if (!isTokenExpired(session.token.expiresAt)) return session.token.accessToken;
  const current = await refreshedSession(session);
  return current?.token.accessToken ?? null;
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

/** Only Frame's own popup and options page may change settings. */
function fromExtensionPage(sender: { id?: string; url?: string }): boolean {
  if (sender.id !== browser.runtime.id) return false;
  return typeof sender.url === 'string' && sender.url.startsWith(browser.runtime.getURL('/'));
}

/** Frame's own content script, running in a normal web page tab. */
function fromOwnContentScript(sender: { id?: string; url?: string; tab?: { id?: number } }): boolean {
  if (sender.id !== browser.runtime.id || sender.tab?.id === undefined) return false;
  return typeof sender.url === 'string' && /^https?:\/\//i.test(sender.url);
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
