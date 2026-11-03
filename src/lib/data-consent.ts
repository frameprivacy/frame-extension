import type { BrowserTarget } from './platform';

/**
 * What the signed-in features send off this device, in Firefox's data-collection terms:
 * - authenticationInfo: the sign-in code and tokens exchanged with frameprivacy.com.
 * - browsingActivity: the one site hostname saved with an email alias when you make or fill one.
 * Nothing is sent without an account, so these are optional and asked for when you choose Sign in.
 */
export const OPTIONAL_DATA_COLLECTION = ['authenticationInfo', 'browsingActivity'] as const;

/** Only Firefox has built-in data-collection consent (Firefox 140 and later). */
export function needsDataConsent(target: BrowserTarget): boolean {
  return target === 'firefox';
}

/** The permissions request for the signed-in features. Not in WXT's types yet. */
export function dataConsentRequest(): { data_collection: string[] } {
  return { data_collection: [...OPTIONAL_DATA_COLLECTION] };
}

type PermissionsApi = { contains?: (request: never) => Promise<boolean> } | undefined;

/** True when the signed-in features may send data: always outside Firefox, otherwise once the person allowed it. */
export async function hasDataConsent(target: BrowserTarget, permissions: PermissionsApi): Promise<boolean> {
  if (!needsDataConsent(target)) return true;
  if (!permissions?.contains) return false;
  try {
    return await permissions.contains(dataConsentRequest() as never);
  } catch {
    return false;
  }
}
