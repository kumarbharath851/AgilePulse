/**
 * AgilePulse – Cloudflare Worker reverse proxy
 *
 * Forwards all traffic from your *.workers.dev URL (or a custom domain)
 * to the CloudFront distribution that serves the Next.js app.
 *
 * Environment variables (set in wrangler.toml or the CF dashboard):
 *   TARGET_ORIGIN  – full CloudFront HTTPS origin, e.g. https://d1234.cloudfront.net
 */

export default {
  async fetch(request, env) {
    const targetOrigin = (env.TARGET_ORIGIN || '').replace(/\/$/, '');

    if (!targetOrigin) {
      return new Response('TARGET_ORIGIN is not configured.', { status: 503 });
    }

    const url = new URL(request.url);
    const targetUrl = `${targetOrigin}${url.pathname}${url.search}`;

    // Clone the incoming request, replacing only the URL
    const proxied = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
    });

    // Remove the Host header so CloudFront doesn't reject the request
    proxied.headers.delete('host');

    const response = await fetch(proxied);

    // Pass the response back as-is, adding CORS headers for convenience
    const newHeaders = new Headers(response.headers);
    newHeaders.set('x-proxied-by', 'agilepulse-worker');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
