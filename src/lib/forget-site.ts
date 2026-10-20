import { normalizeHost } from './settings';

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
