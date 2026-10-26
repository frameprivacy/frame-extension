import { describe, expect, it } from 'vitest';
import {
  TAB_SIGN_IN_TTL_MS,
  clientIdFromRedirect,
  codeChallenge,
  createVerifier,
  expiresAtFromSeconds,
  isReturnFor,
  isSignInReturn,
  isTokenExpired,
  parseAuthRedirect,
  randomState,
  readPendingSignIn,
  signInAvailable,
  signInClient,
  signInMethod,
  signInReturnOrigin,
  type PendingSignIn,
} from './auth';
import {
  CHROME_EXTENSION_ID,
  FIREFOX_ADDON_ID,
  FIREFOX_CLIENT_ID,
  SAFARI_CLIENT_ID,
  SAFARI_EXTENSION_BUNDLE_ID,
  SAFARI_REDIRECT_URI,
} from './extension-ids';

describe('sign-in helpers', () => {
  it('builds an unpadded S256 challenge from the RFC 7636 vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await codeChallenge(verifier);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    expect(challenge).toHaveLength(43);
    expect(challenge).not.toMatch(/=|\+|\//);
  });

  it('creates a verifier and a state in the unreserved set', () => {
    const verifier = createVerifier();
    expect(verifier).toHaveLength(64);
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    expect(createVerifier(43)).toHaveLength(43);
    expect(() => createVerifier(42)).toThrow(/43–128/);
    const state = randomState();
    expect(state.length).toBeGreaterThanOrEqual(16);
    expect(state.length).toBeLessThanOrEqual(128);
    expect(state).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('reads the client id from a Chrome or Firefox redirect', async () => {
    expect(clientIdFromRedirect(`https://${CHROME_EXTENSION_ID}.chromiumapp.org/`)).toBe(CHROME_EXTENSION_ID);
    expect(clientIdFromRedirect(`https://${CHROME_EXTENSION_ID}.chromiumapp.org/callback`)).toBe(CHROME_EXTENSION_ID);
    expect(clientIdFromRedirect(`https://${FIREFOX_CLIENT_ID}.extensions.allizom.org/`)).toBe(FIREFOX_CLIENT_ID);
    expect(clientIdFromRedirect(`https://${CHROME_EXTENSION_ID}.chromiumapp.org/a/b`)).toBeNull();
    expect(clientIdFromRedirect(`https://${CHROME_EXTENSION_ID}.chromiumapp.org/?code=1`)).toBeNull();
    expect(clientIdFromRedirect(`http://${CHROME_EXTENSION_ID}.chromiumapp.org/`)).toBeNull();
    expect(clientIdFromRedirect('https://frame.frameprivacy.com.extensions.allizom.org/')).toBeNull();

    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(FIREFOX_ADDON_ID));
    const host = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    expect(host).toBe(FIREFOX_CLIENT_ID);
    expect(await sha1('identity@mozilla.org')).toBe('35b64b676900f491c00e7f618d43f7040e88422e');
  });

  it('sends a client hint from Firefox and Safari, never from Chrome', () => {
    expect(signInClient('firefox')).toBe('firefox');
    expect(signInClient('safari')).toBe('safari');
    expect(signInClient('chrome')).toBeNull();
    expect(signInClient('edge')).toBeNull();
    expect(signInClient('')).toBeNull();
  });

  it('treats a token as expired inside the skew window', () => {
    const now = 1_000_000;
    expect(isTokenExpired(now + 30_000, now, 60_000)).toBe(true);
    expect(isTokenExpired(now + 120_000, now, 60_000)).toBe(false);
    expect(expiresAtFromSeconds(3600, now)).toBe(now + 3_600_000);
  });

  it('accepts a matching code and rejects a mismatched state', () => {
    expect(parseAuthRedirect('https://id.chromiumapp.org/frame?code=abc&state=xyz', 'xyz')).toEqual({
      ok: true,
      code: 'abc',
    });
    expect(parseAuthRedirect('https://id.chromiumapp.org/frame?code=abc&state=nope', 'xyz').ok).toBe(false);
    expect(parseAuthRedirect('https://id.chromiumapp.org/frame?error=access_denied&state=xyz', 'xyz')).toEqual({
      ok: false,
      message: 'Sign-in was cancelled.',
    });
  });
});

async function sha1(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('Safari sign-in', () => {
  const pending: PendingSignIn = {
    state: 'state-value-ok-1',
    verifier: 'verifier-value',
    redirectUri: SAFARI_REDIRECT_URI,
    clientId: SAFARI_CLIENT_ID,
    tabId: 7,
    startedAt: 1_000_000,
  };

  it('signs in through a tab on Safari and identity everywhere else', () => {
    expect(signInMethod('safari')).toBe('tab');
    expect(signInMethod('chrome')).toBe('identity');
    expect(signInMethod('firefox')).toBe('identity');
  });

  it('offers Safari sign-in only once the site is ready', () => {
    expect(signInAvailable('safari', false)).toBe(false);
    expect(signInAvailable('safari', true)).toBe(true);
    expect(signInAvailable('chrome', false)).toBe(true);
    expect(signInAvailable('firefox', false)).toBe(true);
  });

  it('uses the extension bundle id as the client id and an https return page', () => {
    expect(SAFARI_CLIENT_ID).toBe(SAFARI_EXTENSION_BUNDLE_ID);
    expect(new URL(SAFARI_REDIRECT_URI).protocol).toBe('https:');
    expect(signInReturnOrigin(SAFARI_REDIRECT_URI)).toBe('https://frameprivacy.com/*');
  });

  it('recognises only the exact return page with a result', () => {
    const base = SAFARI_REDIRECT_URI;
    expect(isSignInReturn(`${base}?code=frc_1&state=s`, base)).toBe(true);
    expect(isSignInReturn(`${base}?error=access_denied&state=s`, base)).toBe(true);
    expect(isSignInReturn(`${base}?code=frc_1`, base)).toBe(false);
    expect(isSignInReturn(`${base}?state=s`, base)).toBe(false);
    expect(isSignInReturn(`${base}/extra?code=frc_1&state=s`, base)).toBe(false);
    expect(isSignInReturn('https://frameprivacy.com.evil.test/connect/safari?code=a&state=s', base)).toBe(false);
    expect(isSignInReturn('http://frameprivacy.com/connect/safari?code=a&state=s', base)).toBe(false);
    expect(isSignInReturn(undefined, base)).toBe(false);
    expect(isSignInReturn('', base)).toBe(false);
    expect(isSignInReturn('not a url', base)).toBe(false);
  });

  it('matches a return to the sign-in that started it', () => {
    expect(isReturnFor(`${SAFARI_REDIRECT_URI}?code=frc_1&state=${pending.state}`, pending)).toBe(true);
    expect(isReturnFor(`${SAFARI_REDIRECT_URI}?code=frc_1&state=someone-else`, pending)).toBe(false);
  });

  it('reads a stored pending sign-in and drops stale or malformed ones', () => {
    const now = pending.startedAt + 1_000;
    expect(readPendingSignIn(pending, now)).toEqual(pending);
    expect(readPendingSignIn({ ...pending, tabId: null }, now)).toEqual({ ...pending, tabId: null });
    expect(readPendingSignIn(pending, pending.startedAt + TAB_SIGN_IN_TTL_MS + 1)).toBeNull();
    expect(readPendingSignIn({ ...pending, startedAt: now + 5_000 }, now)).toBeNull();
    expect(readPendingSignIn({ ...pending, state: '' }, now)).toBeNull();
    expect(readPendingSignIn({ ...pending, verifier: 3 }, now)).toBeNull();
    expect(readPendingSignIn(null, now)).toBeNull();
    expect(readPendingSignIn('pending', now)).toBeNull();
  });
});
