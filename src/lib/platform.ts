/** The three browser families Frame builds for. `import.meta.env.BROWSER` is the WXT target name. */
export type BrowserTarget = 'chrome' | 'firefox' | 'safari';

export function browserTarget(name: string | undefined): BrowserTarget {
  if (name === 'firefox') return 'firefox';
  if (name === 'safari') return 'safari';
  return 'chrome';
}

/**
 * Oldest Safari Frame supports, on macOS and iOS. 16.4 is the first Safari with
 * `scripting.registerContentScripts` (page scripts) and declarativeNetRequest
 * `requestHeaders` (the Sec-GPC header).
 */
export const SAFARI_MIN_VERSION = '16.4';
