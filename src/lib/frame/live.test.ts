import { afterEach, describe, expect, it, vi } from 'vitest';
import { endsSession, FrameApiError, SIGN_IN_UNAVAILABLE } from './errors';
import { LiveFrameClient } from './live';

const CLIENT_ID = 'mhemokfamnabliomlhigbkclcfcplfln';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('live Frame client', () => {
  it('rotates the refresh token and does not send cookies', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return Promise.resolve(jsonResponse({
        access_token: 'frx_new_access',
        refresh_token: 'frx_new_refresh',
        expires_in: 900,
        token_type: 'Bearer',
        scope: 'account exposure',
      }));
    });

    const token = await new LiveFrameClient().refresh('frx_old_refresh', CLIENT_ID);
    expect(token.refreshToken).toBe('frx_new_refresh');
    expect(token.accessToken).toBe('frx_new_access');
    expect(token.clientId).toBe(CLIENT_ID);
    expect(token.refreshToken).not.toBe('frx_old_refresh');

    const init = calls[0]?.init;
    expect(init?.credentials).toBe('omit');
    expect(init?.cache).toBe('no-store');
    expect(String(calls[0]?.url)).toBe('https://frameprivacy.com/api/extension/token');
    expect(JSON.parse(String(init?.body))).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'frx_old_refresh',
      client_id: CLIENT_ID,
    });
    expect(String(init?.body)).not.toContain('frx_new_refresh');
  });

  it('treats a reused refresh token as a dead connection', async () => {
    vi.stubGlobal(
      'fetch',
      () => Promise.resolve(jsonResponse({ error: 'invalid_grant', error_description: 'reused' }, 400)),
    );
    const error = await new LiveFrameClient().refresh('frx_old_refresh', CLIENT_ID).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(FrameApiError);
    expect(endsSession(error as FrameApiError)).toBe(true);
  });

  it('keeps a calm message when sign-in is not configured', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(jsonResponse({ error: 'not_configured' }, 503)));
    const error = await new LiveFrameClient()
      .exchangeCode({
        code: 'frc_code',
        codeVerifier: 'verifier',
        redirectUri: `https://${CLIENT_ID}.chromiumapp.org/`,
        clientId: CLIENT_ID,
      })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(FrameApiError);
    expect((error as FrameApiError).message).toBe(SIGN_IN_UNAVAILABLE);
    expect(endsSession(error as FrameApiError)).toBe(false);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
