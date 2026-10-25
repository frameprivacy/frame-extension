import { browser } from 'wxt/browser';
import { forgetTarget, pageTarget, type ForgetTarget } from '../lib/forget-site';

const ORIGIN_DATA = {
  cache: true,
  cacheStorage: true,
  cookies: true,
  indexedDB: true,
  localStorage: true,
  serviceWorkers: true,
} as const;

/**
 * Firefox has no `cacheStorage` type and no `origins` filter: either one makes
 * `browsingData.remove` throw, so up to 0.2.0 Forget this site always failed on Firefox.
 * The Cache API is cleared from open tabs instead (see clearOpenTabs).
 */
const FIREFOX_HOSTNAME_DATA = {
  cookies: true,
  indexedDB: true,
  localStorage: true,
  serviceWorkers: true,
} as const;

export async function clearSite(url: string | undefined): Promise<string> {
  const page = pageTarget(url);
  if (!page) throw new Error('Frame can’t clear data for this page.');
  if (!browser.browsingData?.remove) throw new Error('This browser can’t clear site data from an extension.');
  const target = forgetTarget(page, await cookieDomains());
  await removeSiteData(target);
  await clearOpenTabs(target.hostnames);
  const extra = target.truncated ? ' Some further subdomains were left.' : '';
  return `Cleared cookies and site data for ${target.host}.${extra}`;
}

async function cookieDomains(): Promise<string[]> {
  if (!browser.cookies?.getAll) return [];
  try {
    const cookies = await browser.cookies.getAll({});
    return cookies.map((cookie) => cookie.domain);
  } catch {
    return [];
  }
}

async function removeSiteData(target: ForgetTarget): Promise<void> {
  const origins = nonempty(target.origins);
  const hostnames = nonempty(target.hostnames);
  try {
    if (import.meta.env.BROWSER === 'firefox') {
      await browser.browsingData.remove(
        { hostnames } as unknown as Parameters<typeof browser.browsingData.remove>[0],
        FIREFOX_HOSTNAME_DATA,
      );
      try {
        await browser.browsingData.remove(
          { hostnames } as unknown as Parameters<typeof browser.browsingData.remove>[0],
          { cache: true },
        );
      } catch {
        /* Older Firefox may not clear the HTTP cache by hostname. Cookies and storage are already cleared. */
      }
      return;
    }
    await browser.browsingData.remove({ origins }, ORIGIN_DATA);
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    throw new Error(detail ? `Couldn’t clear site data. ${detail}` : 'Couldn’t clear site data for this site.');
  }
}

function nonempty(values: string[]): [string, ...string[]] {
  const [first, ...rest] = values;
  if (!first) throw new Error('Frame can’t clear data for this page.');
  return [first, ...rest];
}

/** Session storage and the Cache API, in open tabs of these hosts. Firefox can't clear either through browsingData. */
async function clearOpenTabs(hostnames: readonly string[]): Promise<void> {
  if (!browser.scripting?.executeScript) return;
  let tabs: { id?: number; url?: string }[] = [];
  try {
    tabs = await browser.tabs.query({});
  } catch {
    return;
  }
  const wanted = new Set(hostnames);
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined || !tab.url) return;
      const page = pageTarget(tab.url);
      if (!page || !wanted.has(page.host)) return;
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: clearPageStorage,
        });
      } catch {
        /* A restricted tab keeps its session storage. */
      }
    }),
  );
}

/** Runs in the page. It must not use anything from this module's scope. */
async function clearPageStorage(): Promise<void> {
  try {
    sessionStorage.clear();
  } catch {
    /* Storage can be blocked for this page. */
  }
  try {
    if (typeof caches === 'undefined') return;
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  } catch {
    /* The Cache API is only offered on secure pages. */
  }
}
