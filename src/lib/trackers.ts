import type { Settings } from './settings';
import { normalizeHost } from './settings';

export const TRACKER_RULE_ID = 3;
export const SHARE_LINK_RULE_ID = 4;

/**
 * Exact query keys removed from navigations. No wildcards: declarativeNetRequest
 * only removes names we list. Generic names such as `ref` and `id` are not included.
 *
 * `oly_*` and `vero_*` are the known Olytics and Vero keys, not every prefix.
 * `si` is only removed on YouTube and Spotify share links.
 */
export const TRACKER_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_name',
  'fbclid',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
  'gclsrc',
  'gad_source',
  'msclkid',
  'mc_eid',
  'mc_cid',
  'igshid',
  'igsh',
  'yclid',
  'twclid',
  'ttclid',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'oly_anon_id',
  'oly_enc_id',
  'vero_id',
  'vero_conv',
  'ref_src',
  'srsltid',
  'epik',
  '_kx',
  'irclickid',
  'pk_campaign',
  'pk_source',
  'pk_medium',
  'pk_kwd',
  'pk_content',
] as const;

export const SHARE_LINK_PARAMS = ['si'] as const;

/** Request domains match the host and its subdomains. */
export const SHARE_LINK_DOMAINS = ['youtube.com', 'youtu.be', 'spotify.com'] as const;

export interface TrackerRule {
  id: number;
  priority: number;
  action: {
    type: 'redirect';
    redirect: {
      transform: {
        queryTransform: {
          removeParams: string[];
        };
      };
    };
  };
  condition: {
    urlFilter?: string;
    requestDomains?: string[];
    excludedRequestDomains?: string[];
    resourceTypes: Array<'main_frame' | 'sub_frame'>;
  };
}

export function trackerRules(settings: Settings): TrackerRule[] {
  const excluded = domainsWhere(settings, false);
  const included = domainsWhere(settings, true);
  if (settings.stripTrackers) {
    return [
      rule(TRACKER_RULE_ID, 1, [...TRACKER_PARAMS], { excludedRequestDomains: excluded }),
      shareRule(excluded, null),
    ].filter((item): item is TrackerRule => item !== null);
  }
  if (included.length === 0) return [];
  return [
    rule(TRACKER_RULE_ID, 1, [...TRACKER_PARAMS], { requestDomains: included }),
    shareRule(excluded, included.filter(isShareDomain)),
  ].filter((item): item is TrackerRule => item !== null);
}

/** A declarativeNetRequest domain: lowercase hostname, no IPv6, no port. */
export function dnrDomain(host: string): string | null {
  const normalized = normalizeHost(host);
  if (!normalized || !/^[a-z0-9.-]+$/.test(normalized)) return null;
  if (normalized.startsWith('.') || normalized.endsWith('.') || normalized.includes('..')) return null;
  return normalized;
}

function domainsWhere(settings: Settings, enabled: boolean): string[] {
  const domains: string[] = [];
  for (const [host, value] of Object.entries(settings.trackerHosts)) {
    if (value !== enabled) continue;
    const domain = dnrDomain(host);
    if (domain) domains.push(domain);
  }
  return domains;
}

function shareRule(excluded: string[], requestDomains: string[] | null): TrackerRule | null {
  const params = [...TRACKER_PARAMS, ...SHARE_LINK_PARAMS];
  if (requestDomains) {
    if (requestDomains.length === 0) return null;
    return rule(SHARE_LINK_RULE_ID, 2, params, { requestDomains, excludedRequestDomains: excluded });
  }
  const domains = SHARE_LINK_DOMAINS.filter((domain) => !domainCovered(domain, excluded));
  if (domains.length === 0) return null;
  return rule(SHARE_LINK_RULE_ID, 2, params, {
    requestDomains: [...domains],
    excludedRequestDomains: excluded,
  });
}

function rule(
  id: number,
  priority: number,
  removeParams: string[],
  scope: { requestDomains?: string[]; excludedRequestDomains?: string[] },
): TrackerRule {
  const requestDomains = nonempty(scope.requestDomains);
  const excludedRequestDomains = nonempty(scope.excludedRequestDomains);
  return {
    id,
    priority,
    action: {
      type: 'redirect',
      redirect: { transform: { queryTransform: { removeParams } } },
    },
    condition: {
      ...(requestDomains ? { requestDomains } : { urlFilter: '*' }),
      ...(excludedRequestDomains ? { excludedRequestDomains } : {}),
      resourceTypes: ['main_frame', 'sub_frame'],
    },
  };
}

function nonempty(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) return undefined;
  return values;
}

function isShareDomain(domain: string): boolean {
  return SHARE_LINK_DOMAINS.some((share) => domain === share || domain.endsWith(`.${share}`));
}

function domainCovered(domain: string, excluded: string[]): boolean {
  return excluded.some((item) => item === domain || domain.endsWith(`.${item}`));
}
