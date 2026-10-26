import { expiresAtFromSeconds } from '../auth';
import { FrameApiError, messageForApiError } from './errors';
import type { AuthorizeInput, ExposureArea, FrameAccount, FrameExposure, FramePlan, TokenSet } from './types';

export const FRAME_ORIGIN = 'https://frameprivacy.com';
/** `aliases` is opt-in on the site, so the extension asks for it by name. */
export const FRAME_SCOPE = 'account exposure aliases';
export const AUTHORIZE_PATH = '/connect';
export const TOKEN_PATH = '/api/extension/token';
export const REVOKE_PATH = '/api/extension/revoke';
export const ACCOUNT_PATH = '/api/extension/account';
export const EXPOSURE_PATH = '/api/extension/exposure';
export const ALIASES_PATH = '/api/aliases';

const DEFAULT_EXPIRES_IN = 900;

export function buildAuthorizeUrl(input: AuthorizeInput): string {
  const url = new URL(AUTHORIZE_PATH, FRAME_ORIGIN);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', input.state);
  const scope = input.scope ?? FRAME_SCOPE;
  if (scope) url.searchParams.set('scope', scope);
  if (input.client === 'firefox' || input.client === 'safari') url.searchParams.set('client', input.client);
  return url.toString();
}

export function parseTokenResponse(body: unknown, clientId: string, now = Date.now()): TokenSet {
  const record = asRecord(body);
  if (!record || !isFrameToken(record.access_token) || !isFrameToken(record.refresh_token) || !clientId) {
    throw new FrameApiError('Frame returned an unexpected token response.', null);
  }
  const expiresIn = typeof record.expires_in === 'number' && record.expires_in > 0 ? record.expires_in : DEFAULT_EXPIRES_IN;
  return {
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    expiresAt: expiresAtFromSeconds(expiresIn, now),
    scope: typeof record.scope === 'string' ? record.scope : '',
    tokenType: 'Bearer',
    clientId,
  };
}

export function parseAccount(body: unknown): FrameAccount {
  const record = asRecord(body);
  if (typeof record?.id !== 'string' || typeof record.email !== 'string') {
    throw new FrameApiError('Frame returned an unexpected account.', null);
  }
  return {
    id: record.id,
    email: record.email,
    name: parseName(record.name),
    plan: parsePlan(record.plan),
  };
}

export function parseExposure(body: unknown): FrameExposure {
  const record = asRecord(body);
  if (!record) throw new FrameApiError('Frame returned an unexpected exposure status.', null);
  return {
    month: parseMonth(record.month),
    score: parseScore(record.score),
    areas: parseAreas(record.areas),
    openFindings: parseCount(record.openFindings),
    openBreaches: parseCount(record.openBreaches),
  };
}

export async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  const body = text ? safeJson(text) : null;
  if (response.ok) return body;
  const record = asRecord(body);
  const code = typeof record?.error === 'string' ? record.error : null;
  const retryAfter = response.headers.get('retry-after');
  throw new FrameApiError(messageForApiError(response.status, code, retryAfter), response.status, code, retryAfter);
}

function isFrameToken(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('frx_') && value.length > 'frx_'.length;
}

function parseName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parsePlan(value: unknown): FramePlan | null {
  if (value === 'free' || value === 'plus' || value === 'family') return value;
  return null;
}

function parseMonth(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  return value;
}

function parseScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function parseCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function parseAreas(value: unknown): ExposureArea[] {
  if (!Array.isArray(value)) return [];
  const areas: ExposureArea[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (typeof record?.key !== 'string' || !record.key) continue;
    areas.push({ key: record.key, score: parseScore(record.score) });
  }
  return areas;
}

function asRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  return body as Record<string, unknown>;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
