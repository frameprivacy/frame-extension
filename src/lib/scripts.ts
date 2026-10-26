import { hostMatchPattern, type Settings } from './settings';

export const GPC_SCRIPT_ID = 'frame-gpc';
export const FINGERPRINT_SCRIPT_ID = 'frame-fingerprint';
export const GPC_SCRIPT_FILE = 'content-scripts/gpc.js';
export const FINGERPRINT_SCRIPT_FILE = 'content-scripts/fingerprint.js';
export const ALIAS_SCRIPT_ID = 'frame-aliases';
export const ALIAS_SCRIPT_FILE = 'content-scripts/aliases.js';

const PAGE_MATCHES = ['http://*/*', 'https://*/*'];

export interface ScriptRegistration {
  id: string;
  js: string[];
  matches: string[];
  excludeMatches?: string[];
  runAt: 'document_start' | 'document_idle';
  /** Omitted means the content script's own isolated world. */
  world?: 'MAIN';
  allFrames: true;
  matchOriginAsFallback?: true;
  persistAcrossSessions: true;
}

/** Older browsers reject `matchOriginAsFallback`. Retry without it. */
export function withoutOriginFallback(scripts: ScriptRegistration[]): ScriptRegistration[] {
  return scripts.map((script) => {
    const { matchOriginAsFallback: _ignored, ...rest } = script;
    return rest;
  });
}

export function fingerprintMatchPatterns(settings: Settings): string[] {
  if (settings.fingerprintProtection) return [...PAGE_MATCHES];
  const patterns: string[] = [];
  for (const [host, enabled] of Object.entries(settings.fingerprintHosts)) {
    if (!enabled) continue;
    const pattern = hostMatchPattern(host);
    if (pattern) patterns.push(pattern);
  }
  return patterns;
}

export function fingerprintExcludePatterns(settings: Settings): string[] {
  if (!settings.fingerprintProtection) return [];
  const patterns: string[] = [];
  for (const [host, enabled] of Object.entries(settings.fingerprintHosts)) {
    if (enabled) continue;
    const pattern = hostMatchPattern(host);
    if (pattern) patterns.push(pattern);
  }
  return patterns;
}

/**
 * `aliasesReady`: signed in with the aliases scope. The alias menu runs in Frame's isolated world, not the
 * page's, and is only registered while it can do something.
 */
export function scriptRegistrations(settings: Settings, aliasesReady = false): ScriptRegistration[] {
  const scripts: ScriptRegistration[] = [];
  if (settings.sendGpc) {
    scripts.push({
      id: GPC_SCRIPT_ID,
      js: [GPC_SCRIPT_FILE],
      matches: [...PAGE_MATCHES],
      runAt: 'document_start',
      world: 'MAIN',
      allFrames: true,
      matchOriginAsFallback: true,
      persistAcrossSessions: true,
    });
  }
  const matches = fingerprintMatchPatterns(settings);
  if (matches.length > 0) {
    const excludeMatches = fingerprintExcludePatterns(settings);
    scripts.push({
      id: FINGERPRINT_SCRIPT_ID,
      js: [FINGERPRINT_SCRIPT_FILE],
      matches,
      ...(excludeMatches.length > 0 ? { excludeMatches } : {}),
      runAt: 'document_start',
      world: 'MAIN',
      allFrames: true,
      matchOriginAsFallback: true,
      persistAcrossSessions: true,
    });
  }
  if (aliasesReady && settings.aliasAutofill) {
    scripts.push({
      id: ALIAS_SCRIPT_ID,
      js: [ALIAS_SCRIPT_FILE],
      matches: [...PAGE_MATCHES],
      runAt: 'document_idle',
      allFrames: true,
      persistAcrossSessions: true,
    });
  }
  return scripts;
}
