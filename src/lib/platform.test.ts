import { describe, expect, it } from 'vitest';
import { SAFARI_MIN_VERSION, browserTarget } from './platform';

describe('browser target', () => {
  it('maps WXT browser names to the three builds', () => {
    expect(browserTarget('safari')).toBe('safari');
    expect(browserTarget('firefox')).toBe('firefox');
    expect(browserTarget('chrome')).toBe('chrome');
    expect(browserTarget('edge')).toBe('chrome');
    expect(browserTarget('')).toBe('chrome');
  });

  it('needs Safari 16.4 for registered page scripts and request-header rules', () => {
    expect(SAFARI_MIN_VERSION).toBe('16.4');
  });
});
