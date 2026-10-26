import { describe, expect, it } from 'vitest';
import { CHROME_EXTENSION_ID, FIREFOX_CLIENT_ID, SAFARI_CLIENT_ID, SAFARI_REDIRECT_URI } from '../extension-ids';
import { parseStoredSession, toPublicAccount, withToken } from '../session';
import { endsSession, FrameApiError, messageForApiError, SIGN_IN_UNAVAILABLE } from './errors';
import { FRAME_ORIGIN, buildAuthorizeUrl, parseAccount, parseExposure, parseTokenResponse, readJson } from './parse';

const CHROME_REDIRECT = `https://${CHROME_EXTENSION_ID}.chromiumapp.org/`;

describe('Frame API parsing', () => {
  it('builds the authorize URL on /connect', () => {
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
    const url = new URL(
      buildAuthorizeUrl({
        redirectUri: CHROME_REDIRECT,
        state: 'state-value-ok-1',
        codeChallenge: challenge,
        clientId: CHROME_EXTENSION_ID,
      }),
    );
    expect(url.origin).toBe(FRAME_ORIGIN);
    expect(url.pathname).toBe('/connect');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(challenge);
    expect(url.searchParams.get('code_challenge')).toHaveLength(43);
    expect(url.searchParams.get('scope')).toBe('account exposure aliases');
    expect(url.searchParams.get('client_id')).toBe(CHROME_EXTENSION_ID);
    expect(url.searchParams.get('redirect_uri')).toBe(CHROME_REDIRECT);
    expect(url.searchParams.has('client')).toBe(false);
  });

  it('adds client=firefox on the Firefox authorize URL only', () => {
    const redirect = `https://${FIREFOX_CLIENT_ID}.extensions.allizom.org/`;
    const url = new URL(
      buildAuthorizeUrl({
        redirectUri: redirect,
        state: 'state-value-ok-1',
        codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        clientId: FIREFOX_CLIENT_ID,
        client: 'firefox',
      }),
    );
    expect(url.searchParams.get('client')).toBe('firefox');
    expect(url.searchParams.get('client_id')).toBe(FIREFOX_CLIENT_ID);
    expect(url.searchParams.get('redirect_uri')).toBe(redirect);
    expect(url.searchParams.get('response_type')).toBe('code');
  });

  it('adds client=safari on the Safari authorize URL', () => {
    const url = new URL(
      buildAuthorizeUrl({
        redirectUri: SAFARI_REDIRECT_URI,
        state: 'state-value-ok-1',
        codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        clientId: SAFARI_CLIENT_ID,
        client: 'safari',
      }),
    );
    expect(url.searchParams.get('client')).toBe('safari');
    expect(url.searchParams.get('client_id')).toBe(SAFARI_CLIENT_ID);
    expect(url.searchParams.get('redirect_uri')).toBe(SAFARI_REDIRECT_URI);
  });

  it('reads a 15-minute token, account, and exposure', () => {
    const now = 1_000;
    expect(
      parseTokenResponse(
        {
          access_token: 'frx_access',
          refresh_token: 'frx_refresh',
          expires_in: 900,
          scope: 'account exposure',
          token_type: 'Bearer',
        },
        CHROME_EXTENSION_ID,
        now,
      ),
    ).toEqual({
      accessToken: 'frx_access',
      refreshToken: 'frx_refresh',
      expiresAt: now + 900_000,
      scope: 'account exposure',
      tokenType: 'Bearer',
      clientId: CHROME_EXTENSION_ID,
    });

    expect(parseAccount({ id: 'user_1', email: 'ada@example.com', name: 'Ada', plan: 'plus' })).toEqual({
      id: 'user_1',
      email: 'ada@example.com',
      name: 'Ada',
      plan: 'plus',
    });
    expect(parseAccount({ id: 'user_1', email: 'ada@example.com', name: null, plan: 'nope' }).plan).toBeNull();
  });

  it('keeps a null exposure score null', () => {
    const exposure = parseExposure({
      month: '2026-10',
      score: null,
      areas: [
        { key: 'data_brokers', score: null },
        { key: 'breaches', score: 2 },
      ],
      openFindings: 1,
      openBreaches: null,
    });
    expect(exposure.score).toBeNull();
    expect(exposure.areas[0]?.score).toBeNull();
    expect(exposure.areas[1]?.score).toBe(2);
    expect(exposure.openBreaches).toBeNull();
    expect(exposure.openFindings).toBe(1);
    expect(parseExposure({ score: '72' }).score).toBeNull();
  });

  it('rejects a token that is not an frx_ credential', () => {
    expect(() =>
      parseTokenResponse({ access_token: 'supabase-jwt', refresh_token: 'frx_refresh' }, CHROME_EXTENSION_ID),
    ).toThrow(FrameApiError);
  });

  it('does not put tokens on the account shown in the popup', () => {
    const account = toPublicAccount(
      {
        token: {
          accessToken: 'frx_secret',
          refreshToken: 'frx_secret_refresh',
          expiresAt: 1,
          scope: '',
          tokenType: 'Bearer',
          clientId: CHROME_EXTENSION_ID,
        },
        account: { id: 'user_1', email: 'ada@example.com', name: 'Ada', plan: 'free' },
        exposure: null,
      },
      false,
    );
    expect(JSON.stringify(account)).not.toContain('frx_secret');
    expect(account.email).toBe('ada@example.com');
    expect(account.name).toBe('Ada');
  });

  it('drops a rotated-out refresh token when the session is updated', () => {
    const session = {
      token: {
        accessToken: 'frx_old_access',
        refreshToken: 'frx_old_refresh',
        expiresAt: 1,
        scope: 'account exposure',
        tokenType: 'Bearer' as const,
        clientId: CHROME_EXTENSION_ID,
      },
      account: { id: 'user_1', email: 'ada@example.com', name: 'Ada', plan: 'free' as const },
      exposure: null,
    };
    const next = withToken(session, {
      ...session.token,
      accessToken: 'frx_new_access',
      refreshToken: 'frx_new_refresh',
    });
    expect(next.token.refreshToken).toBe('frx_new_refresh');
    expect(JSON.stringify(next)).not.toContain('frx_old_refresh');
    expect(JSON.stringify(next)).not.toContain('frx_old_access');
  });

  it('does not turn an old privacy score into the new score', () => {
    const session = parseStoredSession({
      token: {
        accessToken: 'frx_access',
        refreshToken: 'frx_refresh',
        expiresAt: 1,
        clientId: CHROME_EXTENSION_ID,
        scope: '',
      },
      account: { id: 'user_1', email: 'ada@example.com', displayName: 'Ada' },
      exposure: { privacyScore: 72, lastScanAt: '2026-10-12T15:04:00.000Z', openBreaches: 2, summary: 'old' },
    });
    expect(session?.account.name).toBe('Ada');
    expect(session?.exposure).toBeNull();
  });

  it('maps API errors without signing the person out of a busy or unconfigured site', async () => {
    expect(messageForApiError(503, null, null)).toBe(SIGN_IN_UNAVAILABLE);
    expect(messageForApiError(429, null, '15')).toMatch(/15 seconds/);
    expect(messageForApiError(429, null, 'Wed, 21 Oct 2015 07:28:00 GMT')).toMatch(/shortly/);
    expect(messageForApiError(400, 'unsupported_grant_type', null)).toMatch(/couldn’t complete/i);
    expect(messageForApiError(403, 'insufficient_scope', null)).toMatch(/did not grant/);
    expect(messageForApiError(401, 'invalid_client', null)).toMatch(/isn’t allowed/);

    const denied = await errorResponse(400, { error: 'invalid_grant', error_description: 'reused' });
    expect(denied.code).toBe('invalid_grant');
    expect(endsSession(denied)).toBe(true);

    const dead = await errorResponse(401, { error: 'invalid_token' });
    expect(endsSession(dead)).toBe(true);

    const busy = await errorResponse(429, { error: 'slow_down' }, { 'retry-after': '8' });
    expect(endsSession(busy)).toBe(false);
    expect(busy.retryAfter).toBe('8');
    expect(busy.message).toMatch(/8 seconds/);

    const unavailable = await errorResponse(503, { error: 'not_configured' });
    expect(endsSession(unavailable)).toBe(false);
    expect(unavailable.message).toBe(SIGN_IN_UNAVAILABLE);

    const origin = await errorResponse(403, { error: 'origin_not_allowed' });
    expect(endsSession(origin)).toBe(false);

    const bareUnauthorized = await errorResponse(401, {});
    expect(endsSession(bareUnauthorized)).toBe(true);
    const unknownClient = await errorResponse(401, { error: 'invalid_client' });
    expect(endsSession(unknownClient)).toBe(false);
  });
});

async function errorResponse(
  status: number,
  body: Record<string, string>,
  headers?: Record<string, string>,
): Promise<FrameApiError> {
  try {
    await readJson(new Response(JSON.stringify(body), { status, headers }));
  } catch (error) {
    if (error instanceof FrameApiError) return error;
  }
  throw new Error('expected FrameApiError');
}
