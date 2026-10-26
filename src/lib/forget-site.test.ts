import { describe, expect, it } from 'vitest';
import { cookieClearMessage, cookieUrl, cookiesToForget, forgetTarget, pageTarget, type CookieRef } from './forget-site';

describe('forget this site', () => {
  it('uses the open origin and both schemes for that host', () => {
    const page = pageTarget('https://www.example.com/path?utm_source=ad#top');
    expect(page).toMatchObject({ host: 'www.example.com', origin: 'https://www.example.com' });
    const target = forgetTarget(page!, []);
    expect(target.hostnames).toEqual(['www.example.com']);
    expect(target.origins).toEqual(
      expect.arrayContaining(['https://www.example.com', 'http://www.example.com']),
    );
    expect(target.truncated).toBe(false);
  });

  it('adds subdomain cookie domains and skips parents and other sites', () => {
    const page = pageTarget('https://example.com/');
    const target = forgetTarget(page!, ['.example.com', 'www.example.com', 'cdn.example.com', 'other.test', 'not example.com']);
    expect(target.hostnames).toEqual(['example.com', 'cdn.example.com', 'www.example.com']);
    expect(target.origins).toContain('https://cdn.example.com');
    expect(target.origins).not.toContain('https://other.test');
  });

  it('keeps a non-default port on the open origin', () => {
    const page = pageTarget('https://localhost:8443/app');
    const target = forgetTarget(page!, []);
    expect(target.origins).toContain('https://localhost:8443');
    expect(target.hostnames).toEqual(['localhost']);
  });

  it('refuses pages that are not websites', () => {
    expect(pageTarget('chrome://settings')).toBeNull();
    expect(pageTarget(undefined)).toBeNull();
    expect(pageTarget('https://[::1]/')).toMatchObject({ host: '::1', origin: 'https://[::1]' });
  });
});

describe('forget a site without browsingData (Safari)', () => {
  const cookie = (domain: string, extra: Partial<CookieRef> = {}): CookieRef => ({
    name: 'sid',
    domain,
    path: '/',
    secure: true,
    ...extra,
  });

  it('picks the site’s cookies, its subdomains, and parent-domain cookies it can read', () => {
    const cookies = [
      cookie('www.example.com'),
      cookie('.example.com'),
      cookie('a.www.example.com'),
      cookie('mail.example.com'),
      cookie('example.org'),
      cookie('.com'),
      cookie('notexample.com'),
    ];
    const kept = cookiesToForget(cookies, 'www.example.com', ['www.example.com', 'a.www.example.com']);
    expect(kept.map((item) => item.domain)).toEqual(['www.example.com', '.example.com', 'a.www.example.com']);
  });

  it('builds the URL cookies.remove needs', () => {
    expect(cookieUrl(cookie('.example.com', { path: '/app' }))).toBe('https://example.com/app');
    expect(cookieUrl(cookie('example.com', { secure: false, path: '' }))).toBe('http://example.com/');
    expect(cookieUrl(cookie('::1'))).toBe('https://[::1]/');
  });

  it('says plainly what Safari could not clear', () => {
    expect(cookieClearMessage('example.com', 1, 0)).toBe(
      'Cleared cookies for example.com and its storage in open tabs. Safari doesn’t let extensions clear the cache, or storage for tabs that aren’t open.',
    );
    expect(cookieClearMessage('example.com', 0, 2)).toBe(
      'Cleared cookies for example.com. 2 cookies couldn’t be removed. Safari doesn’t let extensions clear the cache, or storage unless the site is open in a tab.',
    );
  });
});
