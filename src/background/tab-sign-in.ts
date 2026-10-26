import { browser } from 'wxt/browser';
import { isReturnFor, readPendingSignIn, signInReturnOrigin, type PendingSignIn } from '../lib/auth';

const PENDING_KEY = 'pendingSignIn';

/** Session storage when the browser has it (Safari 16.4+), so a pending sign-in never outlives the browser. */
function area() {
  return browser.storage.session ?? browser.storage.local;
}

export async function loadPendingSignIn(): Promise<PendingSignIn | null> {
  const stored = await area().get(PENDING_KEY);
  const pending = readPendingSignIn(stored[PENDING_KEY]);
  if (!pending && stored[PENDING_KEY] !== undefined) await clearPendingSignIn();
  return pending;
}

export async function savePendingSignIn(pending: PendingSignIn): Promise<void> {
  await area().set({ [PENDING_KEY]: pending });
}

export async function clearPendingSignIn(): Promise<void> {
  await area().remove(PENDING_KEY);
}

/**
 * Safari only shows a tab's address to an extension the person has allowed on
 * that site. Frame needs the return page's address to finish sign-in.
 */
export async function canReadReturnPage(redirectUri: string): Promise<boolean> {
  if (!browser.permissions?.contains) return true;
  try {
    return await browser.permissions.contains({ origins: [signInReturnOrigin(redirectUri)] });
  } catch {
    return false;
  }
}

/**
 * Opens the authorize page in a normal tab. The popup closes when the tab opens,
 * so the result arrives through `watchTabSignIn`, not through this call.
 */
export async function startTabSignIn(input: {
  authorizeUrl: string;
  pending: Omit<PendingSignIn, 'tabId' | 'startedAt'>;
}): Promise<void> {
  // Saved before the tab opens, so a fast return can't arrive before Frame knows about it.
  const pending: PendingSignIn = { ...input.pending, tabId: null, startedAt: Date.now() };
  await savePendingSignIn(pending);
  const tab = await browser.tabs.create({ url: input.authorizeUrl, active: true });
  if (typeof tab.id === 'number') await savePendingSignIn({ ...pending, tabId: tab.id });
}

/**
 * Listens for the sign-in tab reaching the return page (Safari). Registered at
 * the top level of the background so a woken worker still hears it.
 */
export function watchTabSignIn(finish: (returnedUrl: string, pending: PendingSignIn) => Promise<void>): void {
  browser.tabs.onUpdated.addListener((tabId, change, tab) => {
    const url = change.url ?? tab.url;
    if (!url) return;
    void (async () => {
      const pending = await loadPendingSignIn();
      if (!pending || !isReturnFor(url, pending)) return;
      await clearPendingSignIn();
      try {
        await browser.tabs.remove(tabId);
      } catch {
        /* The person may have closed it already. */
      }
      await finish(url, pending);
    })();
  });
  browser.tabs.onRemoved.addListener((tabId) => {
    void (async () => {
      const pending = await loadPendingSignIn();
      if (pending && pending.tabId === tabId) await clearPendingSignIn();
    })();
  });
}
