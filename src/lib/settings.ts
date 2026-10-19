export const BOOLEAN_SETTING_IDS = [
  'protectWebRtc',
  'blockThirdPartyCookies',
  'sendGpc',
  'disableAdPrivacyApis',
  'disableHyperlinkAuditing',
  'disableNetworkPrediction',
  'trimReferrers',
  'fingerprintProtection',
  'sendDoNotTrack',
  'disableSearchSuggestions',
  'disableAlternateErrorPages',
] as const;

export type BooleanSettingId = (typeof BOOLEAN_SETTING_IDS)[number];

export interface Settings {
  version: 1;
  fingerprintHosts: Record<string, boolean>;
  protectWebRtc: boolean;
  blockThirdPartyCookies: boolean;
  sendGpc: boolean;
  disableAdPrivacyApis: boolean;
  disableHyperlinkAuditing: boolean;
  disableNetworkPrediction: boolean;
  trimReferrers: boolean;
  fingerprintProtection: boolean;
  sendDoNotTrack: boolean;
  disableSearchSuggestions: boolean;
  disableAlternateErrorPages: boolean;
}

export function defaultSettings(): Settings {
  return {
    version: 1,
    fingerprintHosts: {},
    protectWebRtc: true,
    blockThirdPartyCookies: true,
    sendGpc: true,
    disableAdPrivacyApis: true,
    disableHyperlinkAuditing: true,
    disableNetworkPrediction: true,
    trimReferrers: true,
    fingerprintProtection: true,
    sendDoNotTrack: true,
    disableSearchSuggestions: true,
    disableAlternateErrorPages: true,
  };
}

export function isBooleanSettingId(value: unknown): value is BooleanSettingId {
  return typeof value === 'string' && (BOOLEAN_SETTING_IDS as readonly string[]).includes(value);
}

export function parseSettings(value: unknown): Settings {
  const settings = defaultSettings();
  if (!value || typeof value !== 'object') return settings;
  const raw = value as Record<string, unknown>;
  for (const id of BOOLEAN_SETTING_IDS) {
    if (typeof raw[id] === 'boolean') settings[id] = raw[id];
  }
  if (raw.fingerprintHosts && typeof raw.fingerprintHosts === 'object') {
    const hosts: Record<string, boolean> = {};
    for (const [host, enabled] of Object.entries(raw.fingerprintHosts as Record<string, unknown>)) {
      const normalized = normalizeHost(host);
      if (normalized && typeof enabled === 'boolean') hosts[normalized] = enabled;
    }
    settings.fingerprintHosts = hosts;
  }
  return settings;
}

export function setBooleanSetting(
  settings: Settings,
  id: BooleanSettingId,
  value: boolean,
): Settings {
  return { ...settings, [id]: value };
}

/** Exact host only. `www.example.com` and `example.com` are different sites. */
export function normalizeHost(host: string): string | null {
  const trimmed = host.trim().replace(/\.$/, '');
  if (!trimmed || trimmed.length > 253 || /[\s/@\\*]/.test(trimmed)) return null;
  const literal = trimmed.startsWith('[') ? trimmed : trimmed.includes(':') ? `[${trimmed}]` : trimmed;
  try {
    const parsed = new URL(`http://${literal}/`);
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') return null;
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
    if (!hostname || hostname.length > 253) return null;
    return hostname;
  } catch {
    return null;
  }
}

export function hostMatchPattern(host: string): string | null {
  const normalized = normalizeHost(host);
  if (!normalized) return null;
  const hostPart = normalized.includes(':') ? `[${normalized}]` : normalized;
  return `*://${hostPart}/*`;
}

export function fingerprintEnabledForHost(settings: Settings, host: string): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return settings.fingerprintProtection;
  if (Object.prototype.hasOwnProperty.call(settings.fingerprintHosts, normalized)) {
    return settings.fingerprintHosts[normalized]!;
  }
  return settings.fingerprintProtection;
}

export function setFingerprintHost(settings: Settings, host: string, enabled: boolean): Settings {
  const normalized = normalizeHost(host);
  if (!normalized) return settings;
  const fingerprintHosts = { ...settings.fingerprintHosts };
  if (enabled === settings.fingerprintProtection) delete fingerprintHosts[normalized];
  else fingerprintHosts[normalized] = enabled;
  return { ...settings, fingerprintHosts };
}

export function clearFingerprintHost(settings: Settings, host: string): Settings {
  const normalized = normalizeHost(host);
  if (!normalized || !Object.prototype.hasOwnProperty.call(settings.fingerprintHosts, normalized)) {
    return settings;
  }
  const fingerprintHosts = { ...settings.fingerprintHosts };
  delete fingerprintHosts[normalized];
  return { ...settings, fingerprintHosts };
}

export function classifyUrl(url: string | undefined): { host: string | null; restricted: boolean } {
  if (!url) return { host: null, restricted: false };
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return { host: normalizeHost(parsed.hostname), restricted: false };
    }
    return { host: null, restricted: true };
  } catch {
    return { host: null, restricted: false };
  }
}
