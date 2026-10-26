import { afterEach, describe, expect, it, vi } from 'vitest';
import { FrameApiError } from './errors';
import { LiveFrameClient } from './live';

const ALIAS = {
  id: '6f1c2c55-6a39-4a34-9d4f-3f6b7b0b3f10',
  address: 'quiet.otter.42@framealias.com',
  domain: 'framealias.com',
  destination: 'ada@example.com',
  label: null,
  enabled: true,
  createdOrigin: 'shop.example',
  usages: [],
  forwardedCount: 0,
  lastForwardedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('live alias calls', () => {
  it('uses the bearer token, the Frame origin, and no cookies', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', (url: URL | string, init: RequestInit) => {
      calls.push({ url: String(url), init });
      const method = init.method ?? 'GET';
      if (method === 'GET' && String(url).endsWith('/api/aliases')) {
        return Promise.resolve(json({ aliases: [ALIAS], destination: 'ada@example.com', domain: 'framealias.com', available: true, max: 100 }));
      }
      if (method === 'DELETE') return Promise.resolve(json({ deleted: true, id: ALIAS.id }));
      return Promise.resolve(json({ alias: ALIAS }, method === 'POST' && String(url).endsWith('/api/aliases') ? 201 : 200));
    });

    const client = new LiveFrameClient('firefox');
    const list = await client.listAliases('frx_access');
    await client.createAlias('frx_access', { label: null, site: 'shop.example' });
    await client.updateAlias('frx_access', ALIAS.id, { enabled: false });
    await client.recordAliasUsage('frx_access', ALIAS.id, 'news.example');
    await client.deleteAlias('frx_access', ALIAS.id);

    expect(list.aliases[0]?.address).toBe(ALIAS.address);
    expect(calls.map((call) => `${call.init.method} ${new URL(call.url).pathname}`)).toEqual([
      'GET /api/aliases',
      'POST /api/aliases',
      `PATCH /api/aliases/${ALIAS.id}`,
      `POST /api/aliases/${ALIAS.id}/usages`,
      `DELETE /api/aliases/${ALIAS.id}`,
    ]);
    for (const call of calls) {
      expect(new URL(call.url).origin).toBe('https://frameprivacy.com');
      expect(call.init.credentials).toBe('omit');
      expect((call.init.headers as Record<string, string>).authorization).toBe('Bearer frx_access');
    }
    expect(JSON.parse(String(calls[1]?.init.body))).toEqual({ label: null, site: 'shop.example' });
    expect(JSON.parse(String(calls[2]?.init.body))).toEqual({ enabled: false });
    expect(JSON.parse(String(calls[3]?.init.body))).toEqual({ site: 'news.example' });
    expect(calls[4]?.init.body).toBeUndefined();
    // Alias bodies never carry the Firefox sign-in hint.
    expect(String(calls[1]?.init.body)).not.toContain('firefox');
  });

  it('keeps the API error code for the alias message', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(json({ error: 'ALIAS_LIMIT', error_description: 'You have 100 aliases.' }, 409)),
    );
    const error = await new LiveFrameClient('chrome').createAlias('frx_access', {}).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(FrameApiError);
    expect((error as FrameApiError).status).toBe(409);
    expect((error as FrameApiError).code).toBe('ALIAS_LIMIT');
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
