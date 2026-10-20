import { describe, expect, it } from 'vitest';
import { clientIdFromRedirect, codeChallenge, createVerifier, expiresAtFromSeconds, isTokenExpired, parseAuthRedirect, randomState, signInClient } from './auth';
import { CHROME_EXTENSION_ID, FIREFOX_ADDON_ID, FIREFOX_CLIENT_ID } from './extension-ids';

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

  it('sends a firefox client hint only from Firefox', () => {
    expect(signInClient('firefox')).toBe('firefox');
    expect(signInClient('chrome')).toBeNull();
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
