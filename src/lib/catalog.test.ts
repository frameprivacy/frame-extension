import { describe, expect, it } from 'vitest';
import { PERMISSIONS, permissionsFor } from './catalog';
import { buildManifest } from './manifest';

describe('permission list per browser', () => {
  it('shows every permission on Chrome and Firefox', () => {
    expect(permissionsFor('chrome', true)).toBe(PERMISSIONS);
    expect(permissionsFor('firefox', true)).toBe(PERMISSIONS);
  });

  it('lists only what the Safari manifest asks for', () => {
    const names = permissionsFor('safari', false).map((item) => item.name);
    expect(names).not.toContain('privacy');
    expect(names).not.toContain('identity');
    expect(names).not.toContain('browsingData');
    expect(names).not.toContain('frameprivacy.com');
    for (const permission of buildManifest('safari').permissions ?? []) expect(names).toContain(permission);
    expect(permissionsFor('safari', true).map((item) => item.name)).toContain('frameprivacy.com');
  });

  it('explains Safari’s different reasons honestly', () => {
    const why = Object.fromEntries(permissionsFor('safari', false).map((item) => [item.name, item.why]));
    expect(why.declarativeNetRequest).toMatch(/doesn’t let extensions change response headers/);
    expect(why.cookies).toMatch(/no browsingData API/);
  });
});
