import { aliasErrorMessage, aliasSite, cleanLabel, needsReconnect, sortForSite, usedOn, type AliasPatch } from '../lib/aliases';
import { endsSession, FrameApiError } from '../lib/frame/errors';
import type { FrameClient } from '../lib/frame/types';
import type { AliasMessage, AliasResult, PageAlias } from '../lib/messages';
import { t } from '../lib/i18n';

export interface AliasDeps {
  client: FrameClient;
  enqueue: <T>(task: () => Promise<T>) => Promise<T>;
  /** A usable access token, refreshed if needed, or null when signed out. */
  refreshedToken: () => Promise<string | null>;
  /** Host of the tab the popup was opened over. */
  browsingTabHost: () => Promise<string | null>;
  /** The server said the token is dead. Sign out locally. */
  sessionEnded: () => Promise<void>;
}

interface Sender {
  url?: string;
  tab?: { url?: string };
}

const SIGNED_OUT: AliasResult<never> = {
  ok: false,
  error: t('Sign in to Frame to use email aliases.'),
  code: 'signed_out',
  reconnect: true,
};

/** How many existing aliases the menu in a web page offers. */
const PAGE_LIST_MAX = 8;

export async function handleAliasMessage(message: AliasMessage, sender: Sender, deps: AliasDeps): Promise<unknown> {
  const token = await deps.enqueue(deps.refreshedToken);
  if (!token) return SIGNED_OUT;
  const { client } = deps;
  try {
    switch (message.type) {
      case 'alias.list': {
        const list = await client.listAliases(token);
        return ok({ ...list, site: aliasSite(await deps.browsingTabHost()) });
      }
      case 'alias.create': {
        const site = message.forCurrentSite ? aliasSite(await deps.browsingTabHost()) : null;
        const label = typeof message.label === 'string' ? cleanLabel(message.label) : null;
        return ok(await client.createAlias(token, { label, site }));
      }
      case 'alias.update': {
        const patch: AliasPatch = {};
        if (typeof message.enabled === 'boolean') patch.enabled = message.enabled;
        if (message.label === null) patch.label = null;
        else if (typeof message.label === 'string') patch.label = cleanLabel(message.label);
        if (patch.enabled === undefined && patch.label === undefined) return invalid();
        if (!validId(message.id)) return invalid();
        return ok(await client.updateAlias(token, message.id, patch));
      }
      case 'alias.delete': {
        if (!validId(message.id)) return invalid();
        await client.deleteAlias(token, message.id);
        return ok({ id: message.id });
      }
      case 'alias.page-list': {
        const site = senderSite(sender);
        const list = await client.listAliases(token);
        const aliases: PageAlias[] = sortForSite(
          list.aliases.filter((alias) => alias.enabled),
          site,
        )
          .slice(0, PAGE_LIST_MAX)
          .map((alias) => ({ id: alias.id, address: alias.address, label: alias.label, usedHere: usedOn(alias, site) }));
        return ok({ site, aliases, canCreate: list.available && list.aliases.length < list.max });
      }
      case 'alias.page-create': {
        const alias = await client.createAlias(token, { site: senderSite(sender) });
        return ok({ id: alias.id, address: alias.address });
      }
      case 'alias.page-use': {
        if (!validId(message.id)) return invalid();
        const site = senderSite(sender);
        if (site) {
          const alias = await client.getAlias(token, message.id);
          if (!alias.usages.some((usage) => usage.site === site)) await client.recordAliasUsage(token, message.id, site);
        }
        return ok({ id: message.id });
      }
      default:
        return invalid();
    }
  } catch (error) {
    return failure(error, deps);
  }
}

/** The top-level page the person is on, so an alias filled in a sign-up iframe is recorded against the site. */
function senderSite(sender: Sender): string | null {
  return aliasSite(sender.tab?.url) ?? aliasSite(sender.url);
}

function validId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 64;
}

function ok<T>(data: T): AliasResult<T> {
  return { ok: true, data };
}

function invalid(): AliasResult<never> {
  return { ok: false, error: t('Frame couldn’t complete that request.'), code: 'invalid_message', reconnect: false };
}

async function failure(error: unknown, deps: AliasDeps): Promise<AliasResult<never>> {
  if (!(error instanceof FrameApiError)) {
    return { ok: false, error: t('Frame returned something unexpected. Try again.'), code: null, reconnect: false };
  }
  if (!needsReconnect(error.status, error.code) && endsSession(error)) {
    await deps.enqueue(deps.sessionEnded);
  }
  return {
    ok: false,
    error: aliasErrorMessage(error.status, error.code, error.retryAfter),
    code: error.code,
    reconnect: needsReconnect(error.status, error.code) || error.status === 401,
  };
}
