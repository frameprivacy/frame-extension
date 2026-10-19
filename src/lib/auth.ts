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

/** Live Firefox cannot omit Origin, and the site rejects moz-extension origins. */
export function canSignIn(browserName: string, mode: 'live' | 'stub'): boolean {
  if (mode === 'stub') return true;
  return browserName !== 'firefox';
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
