import type { StoredSession } from '../session';
import { buildAuthorizeUrl } from './parse';
import type { ExchangeInput, FrameAccount, FrameClient, FrameExposure, TokenSet } from './types';

export const STUB_ACCOUNT: FrameAccount = {
  id: 'user_preview',
  email: 'ada@example.com',
  name: 'Ada',
  plan: 'plus',
};

export const STUB_EXPOSURE: FrameExposure = {
  month: '2026-10',
  score: 72,
  areas: [
    { key: 'data_brokers', score: 80 },
    { key: 'breaches', score: null },
  ],
  openFindings: 3,
  openBreaches: 2,
};

function stubToken(clientId: string): TokenSet {
  return {
    accessToken: 'frx_preview_access',
    refreshToken: 'frx_preview_refresh',
    expiresAt: Date.now() + 900 * 1000,
    scope: 'account exposure',
    tokenType: 'Bearer',
    clientId,
  };
}

export function createPreviewSession(): StoredSession {
  return {
    token: stubToken('preview'),
    account: STUB_ACCOUNT,
    exposure: STUB_EXPOSURE,
  };
}

/** Local preview account. Used only when the extension is built with `--mode stub`. */
export class StubFrameClient implements FrameClient {
  readonly mode = 'stub' as const;

  buildAuthorizeUrl = buildAuthorizeUrl;

  exchangeCode(input: ExchangeInput): Promise<TokenSet> {
    return Promise.resolve(stubToken(input.clientId));
  }

  refresh(_refreshToken: string, clientId: string): Promise<TokenSet> {
    return Promise.resolve(stubToken(clientId));
  }

  revoke(_token: string, _clientId: string): Promise<void> {
    return Promise.resolve();
  }

  getAccount(_accessToken: string): Promise<FrameAccount> {
    return Promise.resolve(STUB_ACCOUNT);
  }

  getExposure(_accessToken: string): Promise<FrameExposure> {
    return Promise.resolve(STUB_EXPOSURE);
  }
}
