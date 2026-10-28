import { ALIAS_SITES_MAX, type Alias, type AliasList, type AliasPatch } from '../aliases';
import type { StoredSession } from '../session';
import { FrameApiError } from './errors';
import { buildAuthorizeUrl, FRAME_SCOPE } from './parse';
import type { CreateAliasInput, ExchangeInput, FrameAccount, FrameClient, FrameExposure, TokenSet } from './types';
import { t } from '../i18n';

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
    scope: FRAME_SCOPE,
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

  private aliases: Alias[] = [];
  private serial = 0;

  listAliases(_accessToken: string): Promise<AliasList> {
    return Promise.resolve({
      aliases: this.aliases.map(copyAlias),
      destination: STUB_ACCOUNT.email,
      domain: STUB_ALIAS_DOMAIN,
      available: true,
      max: 100,
    });
  }

  createAlias(_accessToken: string, input: CreateAliasInput): Promise<Alias> {
    this.serial += 1;
    const now = new Date().toISOString();
    const site = input.site ?? null;
    const alias: Alias = {
      id: `00000000-0000-4000-8000-${String(this.serial).padStart(12, '0')}`,
      address: `preview.${this.serial}.${Math.random().toString(36).slice(2, 7)}@${STUB_ALIAS_DOMAIN}`,
      domain: STUB_ALIAS_DOMAIN,
      destination: STUB_ACCOUNT.email,
      label: input.label ?? null,
      enabled: true,
      createdOrigin: site,
      usages: site ? [{ site, firstSeenAt: now, lastSeenAt: now, timesSeen: 1 }] : [],
      forwardedCount: 0,
      lastForwardedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.aliases.unshift(alias);
    return Promise.resolve(copyAlias(alias));
  }

  getAlias(_accessToken: string, id: string): Promise<Alias> {
    return Promise.resolve(copyAlias(this.find(id)));
  }

  updateAlias(_accessToken: string, id: string, patch: AliasPatch): Promise<Alias> {
    const alias = this.find(id);
    if (patch.enabled !== undefined) alias.enabled = patch.enabled;
    if (patch.label !== undefined) alias.label = patch.label;
    alias.updatedAt = new Date().toISOString();
    return Promise.resolve(copyAlias(alias));
  }

  deleteAlias(_accessToken: string, id: string): Promise<void> {
    this.find(id);
    this.aliases = this.aliases.filter((alias) => alias.id !== id);
    return Promise.resolve();
  }

  recordAliasUsage(_accessToken: string, id: string, site: string): Promise<Alias> {
    const alias = this.find(id);
    const now = new Date().toISOString();
    const usage = alias.usages.find((item) => item.site === site);
    if (usage) {
      usage.timesSeen += 1;
      usage.lastSeenAt = now;
    } else if (alias.usages.length < ALIAS_SITES_MAX) {
      alias.usages.unshift({ site, firstSeenAt: now, lastSeenAt: now, timesSeen: 1 });
    }
    return Promise.resolve(copyAlias(alias));
  }

  private find(id: string): Alias {
    const alias = this.aliases.find((item) => item.id === id);
    if (!alias) throw new FrameApiError(t('That alias no longer exists.'), 404, 'NOT_FOUND');
    return alias;
  }
}

const STUB_ALIAS_DOMAIN = 'framealias.com';

function copyAlias(alias: Alias): Alias {
  return { ...alias, usages: alias.usages.map((usage) => ({ ...usage })) };
}
