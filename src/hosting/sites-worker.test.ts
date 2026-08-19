// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import worker from './sites-worker.mjs';

describe('Sites asset worker', () => {
  it('fails closed when the deployment asset binding is missing', async () => {
    const response = await worker.fetch(new Request('https://example.test/'), {});

    expect(response.status).toBe(503);
  });

  it('uses index.html as the fallback for unknown browser routes', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response('app shell', { status: 200 }));
    const request = new Request('https://example.test/workbench', {
      headers: { accept: 'text/html' },
    });

    const response = await worker.fetch(request, { ASSETS: { fetch } });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('app shell');
    expect(fetch).toHaveBeenNthCalledWith(1, request);
    expect(new URL(fetch.mock.calls[1][0].url).pathname).toBe('/');
  });
});
