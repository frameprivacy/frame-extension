import { normalizeHost } from './settings';
import { plural, t } from './i18n';

/** How many hosts one clear will cover. The open site is always first. */
export const MAX_FORGET_HOSTS = 50;

export interface ForgetTarget {
  host: string;
  /** Chrome `browsingData` origins, including the open page's scheme and port. */
  origins: string[];
  /** Firefox `browsingData` hostnames. Subdomains are listed one by one. */
  hostnames: string[];
  truncated: boolean;
}

export interface PageTarget {
  url: string;
  host: string;
  origin: string;
}

export function pageTarget(url: string | undefined): PageTarget | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const host = normalizeHost(parsed.hostname);
    if (!host || parsed.origin === 'null') return null;
    return { url, host, origin: parsed.origin };
  } catch {
    return null;
  }
}

/**
 * Hosts whose storage should be cleared: the open host, plus cookie domains that
 * are that host or a subdomain of it. A parent domain is not added. Chrome still
 * deletes cookies for the whole registrable domain when any of its origins is cleared.
 */
export function forgetTarget(page: PageTarget, cookieDomains: readonly string[]): ForgetTarget {
  const hosts = new Set<string>([page.host]);
  for (const domain of cookieDomains) {
    const host = normalizeHost(domain.replace(/^\./, ''));
    if (!host) continue;
    if (host === page.host || host.endsWith(`.${page.host}`)) hosts.add(host);
  }
  const ordered = [page.host, ...[...hosts].filter((host) => host !== page.host).sort()];
  const truncated = ordered.length > MAX_FORGET_HOSTS;
  const kept = ordered.slice(0, MAX_FORGET_HOSTS);
  const origins = new Set<string>([page.origin]);
  for (const host of kept) {
    const literal = host.includes(':') ? `[${host}]` : host;
    origins.add(`https://${literal}`);
    origins.add(`http://${literal}`);
  }
  return {
    host: page.host,
    origins: [...origins],
    hostnames: kept,
    truncated,
  };
}

/** The parts of a `cookies.Cookie` needed to find and remove it. */
export interface CookieRef {
  name: string;
  domain: string;
  path: string;
  secure: boolean;
  storeId?: string;
}

/**
 * Cookies to remove when a browser has no `browsingData` (Safari): every cookie
 * the open site can read (its own, and ones set for a parent domain such as
 * `.example.com`), plus cookies of the subdomains in `hostnames`.
 */
export function cookiesToForget<T extends CookieRef>(cookies: readonly T[], page: string, hostnames: readonly string[]): T[] {
  const hosts = new Set(hostnames);
  return cookies.filter((cookie) => {
    const domain = normalizeHost(cookie.domain.replace(/^\./, ''));
    if (!domain) return false;
    if (hosts.has(domain)) return true;
    // A parent-domain cookie is sent to the open site too. Single-label parents (`com`) never match.
    return domain.includes('.') && page.endsWith(`.${domain}`);
  });
}

/** The URL `cookies.remove` needs to address one cookie. */
export function cookieUrl(cookie: CookieRef): string {
  const host = cookie.domain.replace(/^\./, '');
  const literal = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
  const path = cookie.path.startsWith('/') ? cookie.path : '/';
  return `${cookie.secure ? 'https' : 'http'}://${literal}${path}`;
}

/** The result line for a clear done with cookies and open tabs only (Safari). */
export function cookieClearMessage(host: string, tabsCleared: number, failed: number): string {
  const cleared =
    tabsCleared > 0
      ? t('Cleared cookies for {host} and its storage in open tabs.', { host })
      : t('Cleared cookies for {host}.', { host });
  const missed =
    failed > 0 ? ` ${plural(failed, '{n} cookie couldn’t be removed.', '{n} cookies couldn’t be removed.')}` : '';
  const limit =
    tabsCleared > 0
      ? t('Safari doesn’t let extensions clear the cache, or storage for tabs that aren’t open.')
      : t('Safari doesn’t let extensions clear the cache, or storage unless the site is open in a tab.');
  return `${cleared}${missed} ${limit}`;
}
