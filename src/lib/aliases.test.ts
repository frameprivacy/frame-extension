import { describe, expect, it } from 'vitest';
import {
  aliasErrorMessage,
  aliasSite,
  cleanLabel,
  hasAliasScope,
  looksLikeEmailField,
  needsReconnect,
  parseAliasEnvelope,
  parseAliasList,
  sortForSite,
  usedOn,
  type FieldHints,
} from './aliases';
import { FRAME_SCOPE } from './frame/parse';

const ALIAS = {
  id: '6f1c2c55-6a39-4a34-9d4f-3f6b7b0b3f10',
  address: 'quiet.otter.42@framealias.com',
  domain: 'framealias.com',
  destination: 'ada@example.com',
  label: 'Newsletter',
  enabled: true,
  createdOrigin: 'shop.example',
  usages: [
    { site: 'shop.example', firstSeenAt: '2026-10-01T00:00:00.000Z', lastSeenAt: '2026-10-02T00:00:00.000Z', timesSeen: 2 },
    { site: 'news.example', firstSeenAt: '2026-10-03T00:00:00.000Z', lastSeenAt: '2026-10-05T00:00:00.000Z', timesSeen: 1 },
  ],
  forwardedCount: 0,
  lastForwardedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
};

function hints(partial: Partial<FieldHints>): FieldHints {
  return { type: 'text', name: '', id: '', autocomplete: '', placeholder: '', ariaLabel: '', ...partial };
}

describe('email aliases', () => {
  it('asks for the aliases scope on sign-in', () => {
    expect(FRAME_SCOPE).toBe('account exposure aliases');
    expect(hasAliasScope('account exposure aliases')).toBe(true);
    expect(hasAliasScope('account exposure')).toBe(false);
    expect(hasAliasScope('')).toBe(false);
    expect(hasAliasScope('account aliasesx')).toBe(false);
  });

  it('records a site as the lowercased hostname without www', () => {
    expect(aliasSite('https://WWW.Shop.Example/checkout?x=1')).toBe('shop.example');
    expect(aliasSite('http://sub.shop.example:8080/')).toBe('sub.shop.example');
    expect(aliasSite('www.example.com')).toBe('example.com');
    expect(aliasSite('chrome://settings')).toBeNull();
    expect(aliasSite('moz-extension://abc/popup.html')).toBeNull();
    expect(aliasSite('')).toBeNull();
    expect(aliasSite(null)).toBeNull();
  });

  it('reads the alias list and keeps unknown fields out', () => {
    const list = parseAliasList({
      aliases: [ALIAS, { id: 'broken' }, { ...ALIAS, id: 'x2', usages: 'nope', forwardedCount: -3, label: '  ' }],
      destination: 'ada@example.com',
      domain: 'framealias.com',
      available: true,
      max: 100,
    });
    expect(list.aliases).toHaveLength(2);
    expect(list.aliases[0]?.usages.map((usage) => usage.site)).toEqual(['news.example', 'shop.example']);
    expect(list.aliases[1]).toMatchObject({ usages: [], forwardedCount: 0, label: null });
    expect(list.max).toBe(100);
    expect(parseAliasEnvelope({ alias: ALIAS }).address).toBe(ALIAS.address);
    expect(() => parseAliasEnvelope({})).toThrow();
    expect(() => parseAliasList({ nope: true })).toThrow();
  });

  it('puts aliases used on this site first', () => {
    const older = { ...ALIAS, id: 'a', createdOrigin: null, usages: [], createdAt: '2026-09-01T00:00:00.000Z' };
    const newer = { ...ALIAS, id: 'b', createdOrigin: null, usages: [], createdAt: '2026-10-20T00:00:00.000Z' };
    const here = { ...ALIAS, id: 'c', createdAt: '2026-08-01T00:00:00.000Z' };
    expect(sortForSite([older, newer, here], 'news.example').map((alias) => alias.id)).toEqual(['c', 'b', 'a']);
    expect(usedOn(here, 'shop.example')).toBe(true);
    expect(usedOn(older, 'shop.example')).toBe(false);
    expect(usedOn(here, null)).toBe(false);
  });

  it('trims labels to the API limit', () => {
    expect(cleanLabel('   ')).toBeNull();
    expect(cleanLabel('  Work ')).toBe('Work');
    expect(cleanLabel('x'.repeat(200))).toHaveLength(80);
  });

  it('explains each refusal without signing out for the wrong reasons', () => {
    expect(needsReconnect(403, 'insufficient_scope')).toBe(true);
    expect(needsReconnect(403, 'EMAIL_UNVERIFIED')).toBe(false);
    expect(aliasErrorMessage(403, 'insufficient_scope', null)).toMatch(/Sign in again/);
    expect(aliasErrorMessage(403, 'EMAIL_UNVERIFIED', null)).toMatch(/Verify/);
    expect(aliasErrorMessage(403, 'ACCOUNT_READ_ONLY', null)).toMatch(/deletion/);
    expect(aliasErrorMessage(409, 'ALIAS_LIMIT', null)).toMatch(/100/);
    expect(aliasErrorMessage(429, 'RATE_LIMITED', '7200')).toMatch(/30 new aliases a day.*about 2 hours/);
    expect(aliasErrorMessage(429, 'temporarily_unavailable', '20')).toMatch(/20 seconds/);
    expect(aliasErrorMessage(503, 'ALIAS_RETRY', null)).toMatch(/minute/);
    expect(aliasErrorMessage(503, 'ALIASES_UNAVAILABLE', null)).toMatch(/aren’t available/);
    expect(aliasErrorMessage(404, 'NOT_FOUND', null)).toMatch(/no longer exists/);
    expect(aliasErrorMessage(400, 'INVALID', null)).toMatch(/80 characters/);
    expect(aliasErrorMessage(null, null, null)).toMatch(/Couldn’t reach/);
  });

  it('spots email fields and leaves other inputs alone', () => {
    expect(looksLikeEmailField(hints({ type: 'email' }))).toBe(true);
    expect(looksLikeEmailField(hints({ autocomplete: 'section-signup email' }))).toBe(true);
    expect(looksLikeEmailField(hints({ name: 'user_email' }))).toBe(true);
    expect(looksLikeEmailField(hints({ id: 'signupEmail' }))).toBe(true);
    expect(looksLikeEmailField(hints({ type: '', placeholder: 'E-mail address' }))).toBe(true);
    expect(looksLikeEmailField(hints({ ariaLabel: 'Adresse courriel' }))).toBe(true);
    expect(looksLikeEmailField(hints({ type: 'password', name: 'email' }))).toBe(false);
    expect(looksLikeEmailField(hints({ type: 'hidden', name: 'email' }))).toBe(false);
    expect(looksLikeEmailField(hints({ type: 'checkbox', name: 'email_opt_in' }))).toBe(false);
    expect(looksLikeEmailField(hints({ name: 'q', placeholder: 'Search' }))).toBe(false);
    expect(looksLikeEmailField(hints({ name: 'email_code', placeholder: 'Code from the email' }))).toBe(false);
    expect(looksLikeEmailField(hints({ name: 'username' }))).toBe(false);
  });
});
