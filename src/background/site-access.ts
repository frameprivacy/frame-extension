import { browser } from 'wxt/browser';
import { SITE_ORIGINS } from '../lib/site-access';

export async function hasSiteAccess(): Promise<boolean> {
  if (!browser.permissions?.contains) return true;
  try {
    return await browser.permissions.contains({ origins: [...SITE_ORIGINS] });
  } catch {
    return true;
  }
}
