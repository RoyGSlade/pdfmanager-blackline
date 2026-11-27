const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function secured(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function fetchAsset(request, env) {
  if (!env?.ASSETS?.fetch) {
    return new Response('Static asset binding unavailable.', { status: 503 });
  }

  const mountPath = env.PDFMANAGER_MOUNT_PATH;
  if (mountPath) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    if (url.protocol === 'http:' || url.pathname === mountPath) {
      url.protocol = 'https:';
      if (url.pathname === mountPath) url.pathname += '/';
      return Response.redirect(url, 308);
    }

    url.pathname = url.pathname === mountPath + '/' ? '/index.html' : url.pathname.slice(mountPath.length);
    return env.ASSETS.fetch(new Request(url, request));
  }

  // OpenAI Sites still serves its root build and supports browser navigation fallback.
  const response = await env.ASSETS.fetch(request);
  const acceptsHtml = request.headers.get('accept')?.includes('text/html');
  if (response.status !== 404 || request.method !== 'GET' || !acceptsHtml) return response;

  return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
}

export default {
  async fetch(request, env) {
    const mountPath = env?.PDFMANAGER_MOUNT_PATH;
    if (mountPath) {
      const pathname = new URL(request.url).pathname;
      if (pathname !== mountPath && !pathname.startsWith(mountPath + '/')) return fetch(request);
    }

    return secured(await fetchAsset(request, env));
  },
};
