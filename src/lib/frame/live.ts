import { FrameApiError, NETWORK_ERROR } from './errors';
import {
  ACCOUNT_PATH,
  EXPOSURE_PATH,
  FRAME_ORIGIN,
  REVOKE_PATH,
  TOKEN_PATH,
  buildAuthorizeUrl,
  parseAccount,
  parseExposure,
  parseTokenResponse,
  readJson,
} from './parse';
import type { ExchangeInput, FrameAccount, FrameClient, FrameExposure, TokenSet } from './types';

/**
 * Calls run from the background script, with credentials omitted so the
 * frameprivacy.com session cookie is never sent.
 *
 * Chrome’s Origin is chrome-extension://<id>.
 * Firefox’s Origin is moz-extension://<per-install uuid>. Firefox builds
 * also send client=firefox so the site can allow that origin.
 */
export class LiveFrameClient implements FrameClient {
  readonly mode = 'live' as const;
  private readonly browserName: string;

  constructor(browserName: string = import.meta.env.BROWSER) {
    this.browserName = browserName;
  }

  buildAuthorizeUrl = buildAuthorizeUrl;

  exchangeCode(input: ExchangeInput): Promise<TokenSet> {
    return this.token({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
      client_id: input.clientId,
      code_verifier: input.codeVerifier,
    });
  }

  refresh(refreshToken: string, clientId: string): Promise<TokenSet> {
    return this.token({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    });
  }

  async revoke(token: string, clientId: string): Promise<void> {
    await this.post(REVOKE_PATH, this.withClient({ token, client_id: clientId }));
  }

  async getAccount(accessToken: string): Promise<FrameAccount> {
    return parseAccount(await this.get(ACCOUNT_PATH, accessToken));
  }

  async getExposure(accessToken: string): Promise<FrameExposure> {
    return parseExposure(await this.get(EXPOSURE_PATH, accessToken));
  }

  private async token(body: Record<string, string>): Promise<TokenSet> {
    const clientId = body.client_id ?? '';
    return parseTokenResponse(await this.post(TOKEN_PATH, this.withClient(body)), clientId);
  }

  /** Firefox only. Chrome bodies stay exactly as the live contract. */
  private withClient(body: Record<string, string>): Record<string, string> {
    if (this.browserName !== 'firefox') return body;
    return { ...body, client: 'firefox' };
  }

  private post(path: string, body: Record<string, string>): Promise<unknown> {
    return this.send(path, { method: 'POST', body: JSON.stringify(body) });
  }

  private get(path: string, accessToken: string): Promise<unknown> {
    return this.send(path, { method: 'GET', accessToken });
  }

  private async send(
    path: string,
    init: { method: 'GET' | 'POST'; body?: string; accessToken?: string },
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(new URL(path, FRAME_ORIGIN), {
        method: init.method,
        credentials: 'omit',
        cache: 'no-store',
        headers: {
          accept: 'application/json',
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...(init.accessToken ? { authorization: `Bearer ${init.accessToken}` } : {}),
        },
        body: init.body,
      });
    } catch {
      throw new FrameApiError(NETWORK_ERROR, null);
    }
    return readJson(response);
  }
}
