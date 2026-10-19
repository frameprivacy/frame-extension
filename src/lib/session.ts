import type { FrameAccount, FrameExposure, FramePlan, TokenSet } from './frame/types';
import type { PublicAccount } from './messages';

export interface StoredSession {
  token: TokenSet;
  account: FrameAccount;
  exposure: FrameExposure | null;
}

/** Replaces the token set. The previous refresh token is not kept. */
export function withToken(session: StoredSession, token: TokenSet): StoredSession {
  return {
    token,
    account: session.account,
    exposure: session.exposure,
  };
}

export function parseStoredSession(value: unknown): StoredSession | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const token = raw.token;
  const account = raw.account;
  if (!token || typeof token !== 'object' || !account || typeof account !== 'object') return null;
  const tokenRecord = token as Record<string, unknown>;
  const accountRecord = account as Record<string, unknown>;
  if (typeof tokenRecord.accessToken !== 'string' || typeof tokenRecord.refreshToken !== 'string') return null;
  if (typeof tokenRecord.expiresAt !== 'number' || typeof tokenRecord.clientId !== 'string' || !tokenRecord.clientId) {
    return null;
  }
  if (typeof accountRecord.id !== 'string' || typeof accountRecord.email !== 'string') return null;
  return {
    token: {
      accessToken: tokenRecord.accessToken,
      refreshToken: tokenRecord.refreshToken,
      expiresAt: tokenRecord.expiresAt,
      scope: typeof tokenRecord.scope === 'string' ? tokenRecord.scope : '',
      tokenType: 'Bearer',
      clientId: tokenRecord.clientId,
    },
    account: {
      id: accountRecord.id,
      email: accountRecord.email,
      name: storedName(accountRecord),
      plan: storedPlan(accountRecord.plan),
    },
    exposure: parseStoredExposure(raw.exposure),
  };
}

export function toPublicAccount(session: StoredSession, preview: boolean): PublicAccount {
  return {
    preview,
    email: session.account.email,
    name: session.account.name,
    plan: session.account.plan,
    exposure: session.exposure,
  };
}

function storedName(account: Record<string, unknown>): string | null {
  if (typeof account.name === 'string' && account.name.trim()) return account.name.trim();
  if (typeof account.displayName === 'string' && account.displayName.trim()) return account.displayName.trim();
  return null;
}

function storedPlan(value: unknown): FramePlan | null {
  if (value === 'free' || value === 'plus' || value === 'family') return value;
  return null;
}

function parseStoredExposure(value: unknown): FrameExposure | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!('score' in raw) && !('month' in raw) && !('areas' in raw)) return null;
  const areas = Array.isArray(raw.areas)
    ? raw.areas.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const area = item as Record<string, unknown>;
        if (typeof area.key !== 'string' || !area.key) return [];
        return [{ key: area.key, score: typeof area.score === 'number' && Number.isFinite(area.score) ? area.score : null }];
      })
    : [];
  return {
    month: typeof raw.month === 'string' ? raw.month : null,
    score: typeof raw.score === 'number' && Number.isFinite(raw.score) ? raw.score : null,
    areas,
    openFindings: typeof raw.openFindings === 'number' && Number.isFinite(raw.openFindings) ? raw.openFindings : null,
    openBreaches: typeof raw.openBreaches === 'number' && Number.isFinite(raw.openBreaches) ? raw.openBreaches : null,
  };
}
