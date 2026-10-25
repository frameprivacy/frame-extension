import { describe, expect, it } from 'vitest';
import { defaultSettings, setBooleanSetting, setTrackerHost } from './settings';
import {
  SHARE_LINK_DOMAINS,
  SHARE_LINK_PARAMS,
  SHARE_LINK_RULE_ID_BASE,
  TRACKER_PARAMS,
  TRACKER_RULE_ID_BASE,
  trackerRuleIds,
  trackerRules,
  type TrackerRule,
} from './trackers';

const tracker = (rules: TrackerRule[]) => rules.filter((rule) => rule.id >= TRACKER_RULE_ID_BASE && rule.id < SHARE_LINK_RULE_ID_BASE);
const share = (rules: TrackerRule[]) => rules.filter((rule) => rule.id >= SHARE_LINK_RULE_ID_BASE);

/** Same matching as declarativeNetRequest for `^name^` filters: `^` is a separator or the end of the URL. */
function matches(rule: TrackerRule, url: string): boolean {
  const name = rule.condition.urlFilter.slice(1, -1);
  const sep = '[^A-Za-z0-9_.%-]';
  return new RegExp(`${sep}${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(${sep}|$)`).test(url);
}

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
    const global = tracker(rules);
    const shares = share(rules);
    expect(global).toHaveLength(TRACKER_PARAMS.length);
    for (const rule of global) {
      expect(rule.condition.resourceTypes).toEqual(['main_frame', 'sub_frame']);
      expect(rule.condition.isUrlFilterCaseSensitive).toBe(true);
      expect(rule.condition.requestDomains).toBeUndefined();
      expect(rule.action.redirect.transform.queryTransform.removeParams).toEqual([...TRACKER_PARAMS]);
    }
    expect(shares).toHaveLength(TRACKER_PARAMS.length + SHARE_LINK_PARAMS.length);
    for (const rule of shares) {
      expect(rule.condition.requestDomains).toEqual([...SHARE_LINK_DOMAINS]);
      expect(rule.action.redirect.transform.queryTransform.removeParams).toEqual([...TRACKER_PARAMS, ...SHARE_LINK_PARAMS]);
      expect(rule.priority).toBeGreaterThan(global[0]?.priority ?? 0);
    }
  });

  it('only matches links that carry a tracker, so header rules still apply to other page loads', () => {
    const rules = trackerRules(defaultSettings());
    const hit = (url: string) => rules.some((rule) => matches(rule, url));
    expect(rules.some((rule) => rule.condition.urlFilter === '*')).toBe(false);
    expect(hit('https://example.com/')).toBe(false);
    expect(hit('https://example.com/?a=1&page=2')).toBe(false);
    expect(hit('https://example.com/?utm_sourcex=1')).toBe(false);
    expect(hit('https://example.com/?myfbclid=1')).toBe(false);
    expect(hit('https://example.com/?utm_source=ad')).toBe(true);
    expect(hit('https://example.com/?a=1&fbclid=abc')).toBe(true);
    expect(hit('https://example.com/?gclid')).toBe(true);
  });

  it('gives every rule a unique id that the cleanup list covers', () => {
    const ids = trackerRules(defaultSettings()).map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    const cleanup = new Set(trackerRuleIds());
    for (const id of ids) expect(cleanup.has(id)).toBe(true);
    expect(cleanup.has(3)).toBe(true);
    expect(cleanup.has(4)).toBe(true);
    expect(Math.max(...ids)).toBeLessThan(1000);
  });

  it('turns stripping off for a site and its matching rule domain', () => {
    const settings = setTrackerHost(defaultSettings(), 'Shop.Example.com', false);
    const rules = trackerRules(settings);
    for (const rule of rules) expect(rule.condition.excludedRequestDomains).toEqual(['shop.example.com']);
  });

  it('drops the share-link rules when those domains are excluded', () => {
    let settings = defaultSettings();
    for (const domain of SHARE_LINK_DOMAINS) settings = setTrackerHost(settings, domain, false);
    const rules = trackerRules(settings);
    expect(share(rules)).toEqual([]);
    expect(tracker(rules)).toHaveLength(TRACKER_PARAMS.length);
  });

  it('adds rules only for chosen sites when the default is off', () => {
    const settings = setTrackerHost(setBooleanSetting(defaultSettings(), 'stripTrackers', false), 'news.example', true);
    const rules = trackerRules(settings);
    expect(rules).toHaveLength(TRACKER_PARAMS.length);
    for (const rule of rules) expect(rule.condition.requestDomains).toEqual(['news.example']);
  });

  it('removes every rule when cleaning is off and no site opts in', () => {
    expect(trackerRules(setBooleanSetting(defaultSettings(), 'stripTrackers', false))).toEqual([]);
  });
});
