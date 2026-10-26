import { browser } from 'wxt/browser';
import {
  cookieClearMessage,
  cookieUrl,
  cookiesToForget,
  forgetTarget,
  pageTarget,
  type ForgetTarget,
  type PageTarget,
} from '../lib/forget-site';

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
  // Safari has no browsingData API. It clears cookies and the storage of open tabs instead.
  if (!browser.browsingData?.remove) return clearWithoutBrowsingData(page);
  const target = forgetTarget(page, await cookieDomains());
  await removeSiteData(target);
  await clearOpenTabs(target.hostnames, clearPageStorage);
  const extra = target.truncated ? ' Some further subdomains were left.' : '';
  return `Cleared cookies and site data for ${target.host}.${extra}`;
}

/**
 * Safari: remove the site's cookies one by one, then clear local storage,
 * session storage, IndexedDB, the Cache API, and service workers from inside
 * the site's open tabs. The HTTP cache can't be cleared, and neither can storage
 * for a site with no open tab. The result says so.
 */
async function clearWithoutBrowsingData(page: PageTarget): Promise<string> {
  if (!browser.cookies?.getAll || !browser.cookies.remove) {
    throw new Error('This browser can’t clear site data from an extension.');
  }
  const cookies = await browser.cookies.getAll({}).catch(() => {
    throw new Error('Couldn’t read this site’s cookies.');
  });
  const target = forgetTarget(
    page,
    cookies.map((cookie) => cookie.domain),
  );
  let failed = 0;
  for (const cookie of cookiesToForget(cookies, page.host, target.hostnames)) {
    try {
      await browser.cookies.remove({
        url: cookieUrl(cookie),
        name: cookie.name,
        ...(cookie.storeId ? { storeId: cookie.storeId } : {}),
      });
    } catch {
      failed += 1;
    }
  }
  const tabs = await clearOpenTabs(target.hostnames, clearAllPageStorage);
  const extra = target.truncated ? ' Some further subdomains were left.' : '';
  return `${cookieClearMessage(target.host, tabs, failed)}${extra}`;
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

/**
 * Runs `clear` in open tabs of these hosts and returns how many tabs it ran in.
 * Chrome and Firefox use it for session storage and the Cache API, which
 * browsingData can't reach. Safari uses it for all page storage.
 */
async function clearOpenTabs(hostnames: readonly string[], clear: () => Promise<void>): Promise<number> {
  if (!browser.scripting?.executeScript) return 0;
  let tabs: { id?: number; url?: string }[] = [];
  try {
    tabs = await browser.tabs.query({});
  } catch {
    return 0;
  }
  const wanted = new Set(hostnames);
  const results = await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined || !tab.url) return false;
      const page = pageTarget(tab.url);
      if (!page || !wanted.has(page.host)) return false;
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: clear,
        });
        return true;
      } catch {
        /* A restricted tab, or one Frame isn't allowed on, keeps its storage. */
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
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

/** Runs in the page (Safari). It must not use anything from this module's scope. */
async function clearAllPageStorage(): Promise<void> {
  try {
    localStorage.clear();
  } catch {
    /* Storage can be blocked for this page. */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* Storage can be blocked for this page. */
  }
  try {
    if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
      const databases = await indexedDB.databases();
      for (const database of databases) {
        if (database.name) indexedDB.deleteDatabase(database.name);
      }
    }
  } catch {
    /* IndexedDB can be unavailable in private windows. */
  }
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch {
    /* The Cache API is only offered on secure pages. */
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    /* Service workers are only offered on secure pages. */
  }
}
