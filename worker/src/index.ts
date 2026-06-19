// Tidy AI proxy — Cloudflare Worker entry.
//
// Endpoints:
//   GET  /v1/health                    quick liveness
//   GET  /v1/quota?client_id=<uuid>    remaining free transforms today
//   POST /v1/transform                 run an AI transform (mock or Gemini)
//
// Privacy: we never log the input or output text. See log.ts conventions.
// CORS: allow the extension origin and our own marketing site. Wildcard for now
// while in development; tightened before launch.

import type { Env } from './types';
import { handleTransform } from './transform';
import { getRemaining, limitFromEnv } from './quota';

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-tidy-version',
  'access-control-max-age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight — answer fast, no auth, no quota.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    let response: Response;
    try {
      response = await route(request, env, pathname, url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      response = json(500, { error: 'internal_error', reason: 'unexpected', detail: message.slice(0, 200) });
    }

    // Tack CORS headers onto every response.
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      response.headers.set(k, v);
    }
    return response;
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env, pathname: string, url: URL): Promise<Response> {
  if (pathname === '/v1/health' && request.method === 'GET') {
    return json(200, { ok: true, version: '0.1.0', has_real_provider: Boolean(env.GEMINI_API_KEY) });
  }

  if (pathname === '/v1/quota' && request.method === 'GET') {
    const clientId = url.searchParams.get('client_id');
    if (!clientId || clientId.length < 8 || clientId.length > 64) {
      return json(400, { error: 'Field "client_id" is required (8–64 chars).', reason: 'invalid_client_id' });
    }
    const remaining = await getRemaining(env, clientId);
    return json(200, { remaining, limit: limitFromEnv(env) });
  }

  if (pathname === '/v1/transform' && request.method === 'POST') {
    return handleTransform(request, env);
  }

  return json(404, { error: 'Not found.', reason: 'unknown_route' });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
