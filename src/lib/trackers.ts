import type { Settings } from './settings';
import { normalizeHost } from './settings';

/** Rule ids 3 and 4 were the single tracker and share-link rules up to 0.2.0. They are still removed on update. */
const LEGACY_RULE_IDS = [3, 4];
/** One rule per parameter: tracker rules use ids from 100, share-link rules from 200. */
export const TRACKER_RULE_ID_BASE = 100;
export const SHARE_LINK_RULE_ID_BASE = 200;

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
    urlFilter: string;
    isUrlFilterCaseSensitive: true;
    requestDomains?: string[];
    excludedRequestDomains?: string[];
    resourceTypes: Array<'main_frame' | 'sub_frame'>;
  };
}

/**
 * Each rule matches only a URL that carries its parameter (`^name^`, where `^` is a separator such as
 * `?`, `&`, `=` or the end). A redirect rule that matches a request outranks modifyHeaders rules for
 * it, even when the redirect changes nothing. Up to 0.2.0 one rule matched every navigation, so the
 * Sec-GPC header and the referrer policy were never applied to page loads.
 * Every rule removes the whole list, so one redirect cleans every tracker in the link.
 */
export function trackerRules(settings: Settings): TrackerRule[] {
  const excluded = domainsWhere(settings, false);
  const included = domainsWhere(settings, true);
  if (settings.stripTrackers) {
    return [...trackerSet({ excludedRequestDomains: excluded }), ...shareRules(excluded, null)];
  }
  if (included.length === 0) return [];
  return [
    ...trackerSet({ requestDomains: included }),
    ...shareRules(excluded, included.filter(isShareDomain)),
  ];
}

/** Every id this module may use, for removing old rules before adding new ones. */
export function trackerRuleIds(): number[] {
  const share = [...TRACKER_PARAMS, ...SHARE_LINK_PARAMS];
  return [
    ...LEGACY_RULE_IDS,
    ...TRACKER_PARAMS.map((_, index) => TRACKER_RULE_ID_BASE + index),
    ...share.map((_, index) => SHARE_LINK_RULE_ID_BASE + index),
  ];
}

function trackerSet(scope: { requestDomains?: string[]; excludedRequestDomains?: string[] }): TrackerRule[] {
  const removeParams = [...TRACKER_PARAMS];
  return TRACKER_PARAMS.map((name, index) => rule(TRACKER_RULE_ID_BASE + index, 1, name, removeParams, scope));
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

function shareRules(excluded: string[], requestDomains: string[] | null): TrackerRule[] {
  const params = [...TRACKER_PARAMS, ...SHARE_LINK_PARAMS];
  let domains: string[];
  if (requestDomains) {
    domains = requestDomains;
  } else {
    domains = SHARE_LINK_DOMAINS.filter((domain) => !domainCovered(domain, excluded));
  }
  if (domains.length === 0) return [];
  return params.map((name, index) =>
    rule(SHARE_LINK_RULE_ID_BASE + index, 2, name, params, { requestDomains: domains, excludedRequestDomains: excluded }),
  );
}

function rule(
  id: number,
  priority: number,
  name: string,
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
      urlFilter: `^${name}^`,
      isUrlFilterCaseSensitive: true,
      ...(requestDomains ? { requestDomains } : {}),
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
