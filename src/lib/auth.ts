const VERIFIER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

export function randomState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

/** RFC 7636 verifier. Rejection sampling avoids modulo bias. */
export function createVerifier(length = 64): string {
  if (length < 43 || length > 128) throw new Error('PKCE verifier length must be 43–128.');
  const limit = 256 - (256 % VERIFIER_ALPHABET.length);
  let verifier = '';
  const bytes = new Uint8Array(length);
  while (verifier.length < length) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= limit) continue;
      verifier += VERIFIER_ALPHABET[byte % VERIFIER_ALPHABET.length];
      if (verifier.length === length) break;
    }
  }
  return verifier;
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function isTokenExpired(expiresAt: number, now = Date.now(), skewMs = 60_000): boolean {
  return now + skewMs >= expiresAt;
}

export function expiresAtFromSeconds(expiresIn: number, now = Date.now()): number {
  const seconds = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 0;
  return now + seconds * 1000;
}

const CHROME_HOST = /^([a-p]{32})\.chromiumapp\.org$/;
const FIREFOX_HOST = /^([a-f0-9]{40})\.extensions\.allizom\.org$/;

/**
 * client_id is the label in the redirect host.
 * Chrome: https://<id>.chromiumapp.org/
 * Firefox: https://<sha1>.extensions.allizom.org/
 * Path is / or a single segment. No port, query, or hash.
 */
export function clientIdFromRedirect(redirectUri: string): string | null {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.port || url.search || url.hash) return null;
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length > 1) return null;
  const host = url.hostname.toLowerCase();
  return host.match(CHROME_HOST)?.[1] ?? host.match(FIREFOX_HOST)?.[1] ?? null;
}

export type SignInClient = 'firefox' | 'safari';

/**
 * Firefox fetches send Origin: moz-extension://<per-install uuid>, and Safari
 * sends safari-web-extension://<per-install uuid>. The site cannot allowlist
 * those uuids. Firefox and Safari builds send this hint on the authorize URL
 * and on token and revoke bodies. Chrome omits it.
 */
export function signInClient(browserName: string): SignInClient | null {
  if (browserName === 'firefox') return 'firefox';
  if (browserName === 'safari') return 'safari';
  return null;
}

/**
 * Chrome and Firefox sign in with `identity.launchWebAuthFlow`. Safari has no
 * `identity` API, so it opens frameprivacy.com in a normal tab and watches that
 * tab for the redirect page.
 */
export function signInMethod(browserName: string): 'identity' | 'tab' {
  return browserName === 'safari' ? 'tab' : 'identity';
}

/** Whether this build offers Frame sign-in. Safari waits until the site allows it. */
export function signInAvailable(browserName: string, safariReady: boolean): boolean {
  return browserName === 'safari' ? safariReady : true;
}

/**
 * True when a tab has landed on the sign-in redirect page with a result.
 * Origin and path must match exactly, so a look-alike host or a longer path
 * never counts. `state` is still checked afterwards by parseAuthRedirect.
 */
export function isSignInReturn(tabUrl: string | undefined, redirectUri: string): boolean {
  if (!tabUrl) return false;
  let url: URL;
  let expected: URL;
  try {
    url = new URL(tabUrl);
    expected = new URL(redirectUri);
  } catch {
    return false;
  }
  if (url.origin !== expected.origin || url.pathname !== expected.pathname) return false;
  return url.searchParams.has('state') && (url.searchParams.has('code') || url.searchParams.has('error'));
}

/** How long a tab sign-in (Safari) may take before it's dropped. */
export const TAB_SIGN_IN_TTL_MS = 10 * 60 * 1000;

/**
 * A tab sign-in in progress. It lives in extension storage, not memory, because
 * Safari can suspend the background worker while someone is signing in.
 */
export interface PendingSignIn {
  state: string;
  verifier: string;
  redirectUri: string;
  clientId: string;
  tabId: number | null;
  startedAt: number;
}

/** Reads a stored pending sign-in, or null when it's malformed or older than the TTL. */
export function readPendingSignIn(value: unknown, now = Date.now()): PendingSignIn | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const text = (key: string) => (typeof item[key] === 'string' && item[key] !== '' ? (item[key] as string) : null);
  const state = text('state');
  const verifier = text('verifier');
  const redirectUri = text('redirectUri');
  const clientId = text('clientId');
  const startedAt = typeof item.startedAt === 'number' && Number.isFinite(item.startedAt) ? item.startedAt : null;
  const tabId = typeof item.tabId === 'number' && Number.isInteger(item.tabId) ? item.tabId : null;
  if (!state || !verifier || !redirectUri || !clientId || startedAt === null) return null;
  if (startedAt > now || now - startedAt > TAB_SIGN_IN_TTL_MS) return null;
  return { state, verifier, redirectUri, clientId, tabId, startedAt };
}

/** True when a tab has landed on the sign-in return page for this exact sign-in (same state). */
export function isReturnFor(tabUrl: string | undefined, pending: PendingSignIn): boolean {
  if (!isSignInReturn(tabUrl, pending.redirectUri)) return false;
  return new URL(tabUrl as string).searchParams.get('state') === pending.state;
}

/** The origin pattern Safari must allow so Frame can read the return page's address. */
export function signInReturnOrigin(redirectUri: string): string {
  return `${new URL(redirectUri).origin}/*`;
}

export type RedirectResult = { ok: true; code: string } | { ok: false; message: string };

export function parseAuthRedirect(redirectUrl: string, expectedState: string): RedirectResult {
  let url: URL;
  try {
    url = new URL(redirectUrl);
  } catch {
    return { ok: false, message: 'Frame returned an unreadable sign-in response.' };
  }
  const error = url.searchParams.get('error');
  if (error === 'access_denied') return { ok: false, message: 'Sign-in was cancelled.' };
  if (error) return { ok: false, message: 'Frame could not complete sign-in.' };
  const state = url.searchParams.get('state');
  if (!state || state !== expectedState) {
    return { ok: false, message: 'Sign-in response did not match this attempt. Try again.' };
  }
  const code = url.searchParams.get('code');
  if (!code) return { ok: false, message: 'Frame did not return a sign-in code.' };
  return { ok: true, code };
}
