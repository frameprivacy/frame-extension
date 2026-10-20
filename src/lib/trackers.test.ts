import { describe, expect, it } from 'vitest';
import { defaultSettings, setBooleanSetting, setTrackerHost } from './settings';
import {
  SHARE_LINK_DOMAINS,
  SHARE_LINK_PARAMS,
  SHARE_LINK_RULE_ID,
  TRACKER_PARAMS,
  TRACKER_RULE_ID,
  trackerRules,
} from './trackers';

const BLOCKED = new Set<string>(['ref', 'id', 'source', 'campaign', 'q', 'search']);

describe('tracking parameter rules', () => {
  it('lists specific tracker names and leaves functional parameters alone', () => {
    expect(TRACKER_PARAMS).toEqual(
      expect.arrayContaining(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_name', 'fbclid']),
    );
    expect(TRACKER_PARAMS).not.toContain('si');
    for (const name of TRACKER_PARAMS) {
      expect(BLOCKED.has(name)).toBe(false);
      expect(name.includes('*')).toBe(false);
    }
    expect(new Set(TRACKER_PARAMS).size).toBe(TRACKER_PARAMS.length);
  });

  it('strips navigations by default, and si only on share-link domains', () => {
    const rules = trackerRules(defaultSettings());
    const global = rules.find((rule) => rule.id === TRACKER_RULE_ID);
    const share = rules.find((rule) => rule.id === SHARE_LINK_RULE_ID);
    expect(global?.condition.resourceTypes).toEqual(['main_frame', 'sub_frame']);
    expect(global?.condition.urlFilter).toBe('*');
    expect(global?.action.redirect.transform.queryTransform.removeParams).toEqual([...TRACKER_PARAMS]);
    expect(share?.condition.requestDomains).toEqual([...SHARE_LINK_DOMAINS]);
    expect(share?.action.redirect.transform.queryTransform.removeParams).toEqual([
      ...TRACKER_PARAMS,
      ...SHARE_LINK_PARAMS,
    ]);
    expect(share?.priority).toBeGreaterThan(global?.priority ?? 0);
  });

  it('turns stripping off for a site and its matching rule domain', () => {
    const settings = setTrackerHost(defaultSettings(), 'Shop.Example.com', false);
    const rules = trackerRules(settings);
    expect(rules.find((rule) => rule.id === TRACKER_RULE_ID)?.condition.excludedRequestDomains).toEqual(['shop.example.com']);
    expect(rules.find((rule) => rule.id === SHARE_LINK_RULE_ID)?.condition.excludedRequestDomains).toEqual([
      'shop.example.com',
    ]);
  });

  it('drops the share-link rule when those domains are excluded', () => {
    let settings = defaultSettings();
    for (const domain of SHARE_LINK_DOMAINS) settings = setTrackerHost(settings, domain, false);
    const rules = trackerRules(settings);
    expect(rules.map((rule) => rule.id)).toEqual([TRACKER_RULE_ID]);
  });

  it('adds rules only for chosen sites when the default is off', () => {
    const settings = setTrackerHost(setBooleanSetting(defaultSettings(), 'stripTrackers', false), 'news.example', true);
    const rules = trackerRules(settings);
    expect(rules).toHaveLength(1);
    expect(rules[0]?.condition.requestDomains).toEqual(['news.example']);
    expect(rules[0]?.condition.urlFilter).toBeUndefined();
  });

  it('removes every rule when cleaning is off and no site opts in', () => {
    expect(trackerRules(setBooleanSetting(defaultSettings(), 'stripTrackers', false))).toEqual([]);
  });
});
