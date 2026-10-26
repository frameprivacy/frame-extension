import { NETWORK_ERROR, SESSION_ENDED } from './frame/errors';
import { normalizeHost } from './settings';

/** One site an alias was used on. Times are ISO strings from the Frame API. */
export interface AliasUsage {
  site: string;
  firstSeenAt: string;
  lastSeenAt: string;
  timesSeen: number;
}

export interface Alias {
  id: string;
  address: string;
  domain: string;
  destination: string;
  label: string | null;
  enabled: boolean;
  /** Hostname the alias was made on, without www. Null when it was made on the website. */
  createdOrigin: string | null;
  usages: AliasUsage[];
  forwardedCount: number;
  lastForwardedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AliasList {
  aliases: Alias[];
  /** Where aliases forward to (the account email). */
  destination: string;
  domain: string;
  /** False when Frame has turned aliases off for now. */
  available: boolean;
  max: number;
}

export interface AliasPatch {
  enabled?: boolean;
  label?: string | null;
}

export const ALIAS_SCOPE = 'aliases';
export const ALIAS_LABEL_MAX = 80;
export const ALIAS_MAX = 100;
export const ALIAS_SITES_MAX = 50;

/** The extension asks for this. `aliases` is only granted when asked for. */
export function hasAliasScope(scope: string): boolean {
  return scope.split(/\s+/).includes(ALIAS_SCOPE);
}

/** The site an alias is recorded against: lowercased hostname, without a leading `www.`. */
export function aliasSite(urlOrHost: string | null | undefined): string | null {
  if (!urlOrHost) return null;
  let host: string | null = null;
  if (/^https?:\/\//i.test(urlOrHost)) {
    try {
      host = normalizeHost(new URL(urlOrHost).hostname);
    } catch {
      return null;
    }
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(urlOrHost)) {
    return null;
  } else {
    host = normalizeHost(urlOrHost);
  }
  if (!host) return null;
  return host.startsWith('www.') && host.length > 4 ? host.slice(4) : host;
}

export function usedOn(alias: Pick<Alias, 'usages' | 'createdOrigin'>, site: string | null): boolean {
  if (!site) return false;
  return alias.createdOrigin === site || alias.usages.some((usage) => usage.site === site);
}

/** Label for the label field: trimmed, at most 80 characters, empty becomes null. */
export function cleanLabel(value: string): string | null {
  const trimmed = value.trim().slice(0, ALIAS_LABEL_MAX);
  return trimmed ? trimmed : null;
}

/** Aliases used on `site` first, then newest first. */
export function sortForSite<T extends Pick<Alias, 'usages' | 'createdOrigin' | 'createdAt'>>(
  aliases: T[],
  site: string | null,
): T[] {
  return [...aliases].sort((a, b) => {
    const here = Number(usedOn(b, site)) - Number(usedOn(a, site));
    if (here !== 0) return here;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function parseAliasList(body: unknown): AliasList {
  const record = asRecord(body);
  if (!record || !Array.isArray(record.aliases)) throw new Error('Frame returned an unexpected alias list.');
  const aliases: Alias[] = [];
  for (const item of record.aliases) {
    const alias = readAlias(item);
    if (alias) aliases.push(alias);
  }
  return {
    aliases,
    destination: typeof record.destination === 'string' ? record.destination : '',
    domain: typeof record.domain === 'string' ? record.domain : '',
    available: record.available !== false,
    max: typeof record.max === 'number' && Number.isFinite(record.max) && record.max > 0 ? record.max : ALIAS_MAX,
  };
}

/** `{ alias }` from create, get, change and usage calls. */
export function parseAliasEnvelope(body: unknown): Alias {
  const alias = readAlias(asRecord(body)?.alias);
  if (!alias) throw new Error('Frame returned an unexpected alias.');
  return alias;
}

function readAlias(value: unknown): Alias | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== 'string' || !record.id) return null;
  if (typeof record.address !== 'string' || !record.address.includes('@')) return null;
  return {
    id: record.id,
    address: record.address,
    domain: typeof record.domain === 'string' ? record.domain : record.address.slice(record.address.indexOf('@') + 1),
    destination: typeof record.destination === 'string' ? record.destination : '',
    label: typeof record.label === 'string' && record.label.trim() ? record.label : null,
    enabled: record.enabled !== false,
    createdOrigin: typeof record.createdOrigin === 'string' && record.createdOrigin ? record.createdOrigin : null,
    usages: readUsages(record.usages),
    forwardedCount: count(record.forwardedCount),
    lastForwardedAt: typeof record.lastForwardedAt === 'string' ? record.lastForwardedAt : null,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
  };
}

function readUsages(value: unknown): AliasUsage[] {
  if (!Array.isArray(value)) return [];
  const usages: AliasUsage[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record || typeof record.site !== 'string' || !record.site) continue;
    usages.push({
      site: record.site,
      firstSeenAt: typeof record.firstSeenAt === 'string' ? record.firstSeenAt : '',
      lastSeenAt: typeof record.lastSeenAt === 'string' ? record.lastSeenAt : '',
      timesSeen: Math.max(1, count(record.timesSeen)),
    });
  }
  return usages.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export const ALIAS_RECONNECT = 'Frame needs your OK to manage email aliases. Sign in again to allow it.';

/** True when the fix is to sign in again and approve the aliases scope. */
export function needsReconnect(status: number | null, code: string | null): boolean {
  return status === 403 && code === 'insufficient_scope';
}

/** What to tell the person when an alias call fails. */
export function aliasErrorMessage(status: number | null, code: string | null, retryAfter: string | null): string {
  if (status === null) return NETWORK_ERROR;
  if (needsReconnect(status, code)) return ALIAS_RECONNECT;
  if (status === 401) return SESSION_ENDED;
  if (code === 'EMAIL_UNVERIFIED') return 'Verify your Frame account email first. Aliases forward to it.';
  if (code === 'ACCOUNT_READ_ONLY') return 'This Frame account is scheduled for deletion, so aliases can’t be changed.';
  if (code === 'ALIAS_LIMIT') return `You have the most aliases an account can have (${ALIAS_MAX}). Delete one you no longer use.`;
  if (code === 'ALIAS_RETRY') return 'That alias is still being set up. Try again in a minute.';
  if (code === 'ALIASES_UNAVAILABLE' || status === 503) return 'Email aliases aren’t available right now. Try again later.';
  if (code === 'NOT_FOUND' || status === 404) return 'That alias no longer exists.';
  if (status === 429) return rateLimitMessage(code, retryAfter);
  if (status === 403) return 'Frame refused that request from this browser.';
  if (code === 'INVALID' || status === 400) return `Frame didn’t accept that. Labels can be up to ${ALIAS_LABEL_MAX} characters.`;
  return 'Frame couldn’t complete that request.';
}

function rateLimitMessage(code: string | null, retryAfter: string | null): string {
  const wait = waitLabel(retryAfter);
  const lead =
    code === 'RATE_LIMITED'
      ? 'That’s the limit for now: 30 new aliases a day and 300 changes an hour.'
      : 'Frame is busy.';
  return wait ? `${lead} Try again ${wait}.` : `${lead} Try again later.`;
}

function waitLabel(retryAfter: string | null): string | null {
  if (!retryAfter || !/^\d+$/.test(retryAfter.trim())) return null;
  const seconds = Number(retryAfter.trim());
  if (seconds <= 0) return null;
  if (seconds <= 90) return `in ${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes <= 90) return `in about ${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return `in about ${hours} hours`;
}

/** What the content script reads from an input to decide if it takes an email address. */
export interface FieldHints {
  type: string;
  name: string;
  id: string;
  autocomplete: string;
  placeholder: string;
  ariaLabel: string;
}

const TEXTLIKE = new Set(['', 'text', 'email']);
const EMAIL_WORD = /e-?mail|courriel|correo/i;
const NOT_EMAIL = /(search|subject|message|comment|password|passwd|otp|code)/i;

/** `type=email`, `autocomplete=email`, or a text input whose name, id, placeholder or label says email. */
export function looksLikeEmailField(hints: FieldHints): boolean {
  const type = hints.type.trim().toLowerCase();
  if (!TEXTLIKE.has(type)) return false;
  const autocomplete = hints.autocomplete.toLowerCase().split(/\s+/);
  if (autocomplete.includes('email')) return true;
  if (type === 'email') return true;
  const words = [hints.name, hints.id, hints.placeholder, hints.ariaLabel];
  if (words.some((word) => NOT_EMAIL.test(word))) return false;
  return words.some((word) => EMAIL_WORD.test(word));
}

/** Formats an ISO time for lists. Empty input gives an empty string. */
export function shortDate(iso: string, locale = 'en'): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
