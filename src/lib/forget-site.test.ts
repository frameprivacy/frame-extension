import { describe, expect, it } from 'vitest';
import { forgetTarget, pageTarget } from './forget-site';

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
