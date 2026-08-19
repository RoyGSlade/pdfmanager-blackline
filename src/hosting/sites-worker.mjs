/**
 * Cloudflare-compatible static asset worker used by OpenAI Sites.
 * The deployment runtime supplies the ASSETS binding; document processing
 * remains entirely inside the browser bundle.
 */
export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response('Static asset binding unavailable.', { status: 503 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') return response;

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (!acceptsHtml) return response;

    const fallbackUrl = new URL('/', request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  },
};
