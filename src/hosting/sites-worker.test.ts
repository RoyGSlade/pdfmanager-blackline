// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import worker from './sites-worker.mjs';

const domain = 'https://donavencrenshaw.com';
const mountPath = '/pdfmanager';

describe('Sites asset worker', () => {
  it('fails closed when the deployment asset binding is missing', async () => {
    const response = await worker.fetch(new Request('https://example.test/'), {});
    expect(response.status).toBe(503);
  });

  it('uses index.html as the fallback for unknown Sites browser routes', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response('app shell'));
    const request = new Request('https://example.test/workbench', {
      headers: { accept: 'text/html' },
    });

    const response = await worker.fetch(request, { ASSETS: { fetch } });
    expect(await response.text()).toBe('app shell');
    expect(fetch).toHaveBeenNthCalledWith(1, request);
    expect(new URL(fetch.mock.calls[1][0].url).pathname).toBe('/');
  });
});

describe('Custom-domain workbench', () => {
  const environment = (assetFetch: typeof fetch) => ({
    ASSETS: { fetch: assetFetch },
    PDFMANAGER_MOUNT_PATH: mountPath,
  });

  it.each([
    ['/pdfmanager/', '/index.html'],
    ['/pdfmanager/og.png', '/og.png'],
    ['/pdfmanager/assets/worker.mjs', '/assets/worker.mjs'],
  ])('serves %s with the launcher security headers', async (path, assetPath) => {
    const assetFetch = vi.fn().mockResolvedValue(
      new Response('asset', { headers: { 'Content-Type': 'application/octet-stream' } }),
    );
    const response = await worker.fetch(new Request(domain + path), environment(assetFetch));

    expect(new URL(assetFetch.mock.calls[0][0].url).pathname).toBe(assetPath);
    expect(await response.text()).toBe('asset');
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(response.headers.get('Content-Security-Policy')).toBe(
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it.each([
    ['http://donavencrenshaw.com/pdfmanager/?check=1', domain + '/pdfmanager/?check=1'],
    [domain + '/pdfmanager?check=1', domain + '/pdfmanager/?check=1'],
  ])('redirects %s to the canonical HTTPS path', async (requestUrl, target) => {
    const assetFetch = vi.fn();
    const response = await worker.fetch(new Request(requestUrl), environment(assetFetch));
    expect(response.status).toBe(308);
    expect(response.headers.get('Location')).toBe(target);
    expect(assetFetch).not.toHaveBeenCalled();
  });

  it('keeps HEAD requests and 404 asset responses intact', async () => {
    const assetFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const request = new Request(domain + '/pdfmanager/missing.css', { method: 'HEAD' });
    const response = await worker.fetch(request, environment(assetFetch));
    expect(assetFetch.mock.calls[0][0].method).toBe('HEAD');
    expect(response.status).toBe(404);
  });

  it('rejects a POST without passing it to the asset binding', async () => {
    const assetFetch = vi.fn();
    const request = new Request(domain + '/pdfmanager/', { method: 'POST', body: 'input' });
    const response = await worker.fetch(request, environment(assetFetch));
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD');
    expect(assetFetch).not.toHaveBeenCalled();
  });

  it('passes other prefix matches through to the existing origin', async () => {
    const request = new Request(domain + '/pdfmanager-info/');
    const originResponse = new Response('main website');
    const originFetch = vi.fn().mockResolvedValue(originResponse);
    const assetFetch = vi.fn();
    vi.stubGlobal('fetch', originFetch);

    try {
      expect(await worker.fetch(request, environment(assetFetch))).toBe(originResponse);
      expect(originFetch).toHaveBeenCalledWith(request);
      expect(assetFetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
