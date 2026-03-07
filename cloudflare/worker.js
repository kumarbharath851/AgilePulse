/**
 * AgilePulse – Cloudflare Worker reverse proxy
 *
 * Routes:
 *   • HTTP requests  → CloudFront (Next.js on Lambda)
 *   • WebSocket upgrades → AWS API Gateway WebSocket endpoint
 *
 * Environment variables (wrangler.toml or CF dashboard):
 *   TARGET_ORIGIN  – CloudFront HTTPS origin, e.g. https://d1234.cloudfront.net
 *   WS_ORIGIN      – AWS WebSocket API Gateway, e.g. wss://abc.execute-api.us-east-1.amazonaws.com/prod
 */

// ── HTTP proxy with cold-start retry ──────────────────────────────────────

/**
 * GET/HEAD are safe to retry (idempotent). POST/PUT/PATCH/DELETE are NOT
 * retried to avoid duplicate side-effects.
 */
async function proxyHTTP(request, targetOrigin) {
  const url = new URL(request.url);
  const targetUrl = `${targetOrigin}${url.pathname}${url.search}`;
  const isIdempotent = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);

  // Buffer the body once so retries can reuse it
  let bodyBuffer = null;
  if (!isIdempotent && request.body) {
    bodyBuffer = await request.arrayBuffer();
  }

  const buildRequest = () => {
    const headers = new Headers(request.headers);
    headers.delete('host'); // CloudFront rejects mismatched Host headers
    return new Request(targetUrl, {
      method: request.method,
      headers,
      body: isIdempotent ? undefined : bodyBuffer,
      redirect: 'follow',
    });
  };

  const MAX_ATTEMPTS = isIdempotent ? 3 : 1;
  let lastError;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      // Back off before retrying: 500 ms, then 1000 ms
      await new Promise((r) => setTimeout(r, attempt * 500));
    }
    try {
      const response = await fetch(buildRequest());
      const headers = new Headers(response.headers);
      headers.set('x-proxied-by', 'agilepulse-worker');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (err) {
      lastError = err;
      console.error(
        `[worker] attempt ${attempt + 1}/${MAX_ATTEMPTS} failed for ${request.method} ${url.pathname}: ${err.message}`
      );
    }
  }

  // All attempts exhausted – return a user-friendly 502
  return new Response(
    'AgilePulse is temporarily unavailable. Please refresh in a moment.',
    {
      status: 502,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Retry-After': '5',
        'x-proxied-by': 'agilepulse-worker',
      },
    }
  );
}

// ── WebSocket proxy ────────────────────────────────────────────────────────

function proxyWebSocket(request, wsOrigin) {
  const url = new URL(request.url);
  const upstreamUrl = `${wsOrigin}${url.pathname}${url.search}`;

  const { 0: clientSocket, 1: serverSocket } = new WebSocketPair();
  serverSocket.accept();

  let upstream;
  try {
    upstream = new WebSocket(upstreamUrl);
  } catch (err) {
    console.error(`[worker] WebSocket upstream connect failed: ${err.message}`);
    serverSocket.close(1011, 'Failed to connect to upstream');
    return new Response(null, { status: 101, webSocket: clientSocket });
  }

  // client → upstream
  serverSocket.addEventListener('message', ({ data }) => {
    if (upstream.readyState === WebSocket.READY_STATE_OPEN) {
      try { upstream.send(data); } catch {}
    }
  });
  serverSocket.addEventListener('close', ({ code, reason }) => {
    try { upstream.close(code, reason); } catch {}
  });

  // upstream → client
  upstream.addEventListener('message', ({ data }) => {
    try { serverSocket.send(data); } catch {}
  });
  upstream.addEventListener('close', ({ code, reason }) => {
    try { serverSocket.close(code, reason); } catch {}
  });
  upstream.addEventListener('error', () => {
    try { serverSocket.close(1011, 'Upstream WebSocket error'); } catch {}
  });

  return new Response(null, { status: 101, webSocket: clientSocket });
}

// ── Entry point ────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const targetOrigin = (env.TARGET_ORIGIN || '').replace(/\/$/, '');

    if (!targetOrigin) {
      return new Response('TARGET_ORIGIN is not configured.', { status: 503 });
    }

    // Route WebSocket upgrades to the AWS API Gateway WebSocket endpoint
    if (request.headers.get('Upgrade') === 'websocket') {
      const wsOrigin = (env.WS_ORIGIN || '').replace(/\/$/, '');
      if (!wsOrigin) {
        return new Response('WS_ORIGIN is not configured.', { status: 503 });
      }
      return proxyWebSocket(request, wsOrigin);
    }

    return proxyHTTP(request, targetOrigin);
  },
};
