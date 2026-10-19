import { describe, expect, it } from 'vitest';
import { GPC_RULE_ID, REFERRER_POLICY_VALUE, REFERRER_RULE_ID, headerRules } from './dnr';

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
