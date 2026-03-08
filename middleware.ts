/**
 * Next.js Edge Middleware — API Rate Limiting
 *
 * Sliding window rate limiter using a module-level Map.
 * Runs on the Edge Runtime (no setInterval required).
 *
 * Tiered limits (per IP, per minute):
 *   POST /api/agilepulse/ai/insights      — 10/min  (expensive Bedrock AI call)
 *   POST /api/agilepulse/sessions         — 10/min  (create session)
 *   POST /api/agilepulse/feedback         — 5/min   (feedback submission)
 *   POST /api/agilepulse/integrations/*   — 10/min  (external integrations)
 *   All other /api/agilepulse/* routes    — 60/min  (default)
 */

import { NextRequest, NextResponse } from 'next/server';

interface WindowEntry {
  count: number;
  resetAt: number;
}

// Module-level store — survives across requests within the same Edge isolate
const store = new Map<string, WindowEntry>();

const WINDOW_MS = 60_000; // 1 minute

function getLimit(method: string, pathname: string): number {
  if (method === 'POST' && pathname === '/api/agilepulse/ai/insights') return 10;
  if (method === 'POST' && pathname === '/api/agilepulse/sessions') return 10;
  if (method === 'POST' && pathname === '/api/agilepulse/feedback') return 5;
  if (method === 'POST' && pathname.startsWith('/api/agilepulse/integrations/')) return 10;
  return 60;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = getClientIp(request);
  const limit = getLimit(method, pathname);
  const now = Date.now();
  const key = `${ip}:${method}:${pathname}`;

  // Purge expired entries periodically (every ~100 requests)
  if (Math.random() < 0.01) {
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k);
    }
  }

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Start a new window
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return addRateLimitHeaders(NextResponse.next(), limit, limit - 1, now + WINDOW_MS);
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} second${retryAfter !== 1 ? 's' : ''}.`,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  entry.count += 1;
  return addRateLimitHeaders(NextResponse.next(), limit, limit - entry.count, entry.resetAt);
}

function addRateLimitHeaders(
  res: NextResponse,
  limit: number,
  remaining: number,
  resetAt: number
): NextResponse {
  res.headers.set('X-RateLimit-Limit', String(limit));
  res.headers.set('X-RateLimit-Remaining', String(remaining));
  res.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  return res;
}

export const config = {
  matcher: ['/api/agilepulse/:path*'],
};
