export type FramePlan = 'free' | 'plus' | 'family';

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  scope: string;
  tokenType: 'Bearer';
  /** Host label from the redirect URI. Sent again on refresh and revoke. */
  clientId: string;
}

export interface FrameAccount {
  id: string;
  email: string;
  name: string | null;
  plan: FramePlan | null;
}

export interface ExposureArea {
  key: string;
  score: number | null;
}

export interface FrameExposure {
  /** YYYY-MM. */
  month: string | null;
  /** Null until something was checked. Never invent a number. */
  score: number | null;
  areas: ExposureArea[];
  openFindings: number | null;
  openBreaches: number | null;
}

export interface AuthorizeInput {
  redirectUri: string;
  state: string;
  codeChallenge: string;
  clientId: string;
  scope?: string;
}

export interface ExchangeInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}

export interface FrameClient {
  readonly mode: 'live' | 'stub';
  buildAuthorizeUrl(input: AuthorizeInput): string;
  exchangeCode(input: ExchangeInput): Promise<TokenSet>;
  refresh(refreshToken: string, clientId: string): Promise<TokenSet>;
  revoke(token: string, clientId: string): Promise<void>;
  getAccount(accessToken: string): Promise<FrameAccount>;
  getExposure(accessToken: string): Promise<FrameExposure>;
}
