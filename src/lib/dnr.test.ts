import { describe, expect, it } from 'vitest';
import { GPC_RULE_ID, REFERRER_POLICY_VALUE, REFERRER_RULE_ID, canSetResponseHeaders, headerRules, resourceTypesFor } from './dnr';

describe('header rules', () => {
  it('sends Sec-GPC and a same-origin referrer policy when those toggles are on', () => {
    const rules = headerRules({ sendGpc: true, trimReferrers: true });
    expect(rules.map((rule) => rule.id)).toEqual([GPC_RULE_ID, REFERRER_RULE_ID]);
    expect(rules[0]?.action.requestHeaders?.[0]).toEqual({ header: 'Sec-GPC', operation: 'set', value: '1' });
    expect(rules[1]?.action.responseHeaders?.[0]).toEqual({
      header: 'Referrer-Policy',
      operation: 'set',
      value: REFERRER_POLICY_VALUE,
    });
    expect(rules[1]?.condition.resourceTypes).toEqual(['main_frame', 'sub_frame']);
  });

  it('removes both rules when the toggles are off', () => {
    expect(headerRules({ sendGpc: false, trimReferrers: false })).toEqual([]);
  });
});

describe('header rules on Safari', () => {
  it('keeps Sec-GPC and leaves out the Referrer-Policy response rule', () => {
    expect(canSetResponseHeaders('safari')).toBe(false);
    expect(canSetResponseHeaders('chrome')).toBe(true);
    expect(canSetResponseHeaders('firefox')).toBe(true);
    const rules = headerRules({ sendGpc: true, trimReferrers: true }, 'safari');
    expect(rules.map((rule) => rule.id)).toEqual([GPC_RULE_ID]);
  });

  it('lists only resource types WebKit knows', () => {
    const [gpc] = headerRules({ sendGpc: true, trimReferrers: false }, 'safari');
    expect(gpc?.condition.resourceTypes).not.toContain('csp_report');
    expect(gpc?.condition.resourceTypes).not.toContain('object');
    expect(gpc?.condition.resourceTypes).toContain('main_frame');
    const [chromeGpc] = headerRules({ sendGpc: true, trimReferrers: false }, 'chrome');
    expect(chromeGpc?.condition.resourceTypes).toContain('csp_report');
    expect(resourceTypesFor('safari', ['main_frame', 'object', 'ping'])).toEqual(['main_frame', 'ping']);
    expect(resourceTypesFor('firefox', ['main_frame', 'object'])).toEqual(['main_frame', 'object']);
  });
});
