import { describe, expect, it } from 'vitest';
import { OPTIONAL_DATA_COLLECTION, dataConsentRequest, hasDataConsent, needsDataConsent } from './data-consent';

describe('Firefox data-collection consent', () => {
  it('is only needed on Firefox', () => {
    expect(needsDataConsent('firefox')).toBe(true);
    expect(needsDataConsent('chrome')).toBe(false);
    expect(needsDataConsent('safari')).toBe(false);
  });

  it('asks for exactly the categories the signed-in features use', () => {
    expect(dataConsentRequest()).toEqual({ data_collection: ['authenticationInfo', 'browsingActivity'] });
    expect(OPTIONAL_DATA_COLLECTION).not.toContain('technicalAndInteraction');
  });

  it('allows other browsers, and Firefox only once granted', async () => {
    expect(await hasDataConsent('chrome', undefined)).toBe(true);
    expect(await hasDataConsent('firefox', undefined)).toBe(false);
    expect(await hasDataConsent('firefox', { contains: async () => true })).toBe(true);
    expect(await hasDataConsent('firefox', { contains: async () => false })).toBe(false);
    expect(
      await hasDataConsent('firefox', {
        contains: async () => {
          throw new Error('unknown key');
        },
      }),
    ).toBe(false);
  });
});
