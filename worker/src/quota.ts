// KV-backed daily quota counter.
//
// Storage shape:
//   key:    q:<client_id>:<YYYY-MM-DD>
//   value:  "<integer>"   (call count for this user, this UTC day)
//   ttl:    36 hours (enough to cover late-night requests crossing midnight)
//
// Consistency note: KV is eventually consistent across edges. Two simultaneous
// requests from the same user might both read N and both write N+1, allowing
// N+1 total (instead of N+1=stop). For a 5/day free tier this drift is fine.
// If we ever need strict accuracy, swap to Durable Objects.

import type { Env } from './types';

const TTL_SECONDS = 60 * 60 * 36;

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function key(clientId: string): string {
  return `q:${clientId}:${today()}`;
}

export function limitFromEnv(env: Env): number {
  const raw = env.DAILY_FREE_LIMIT ?? '5';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export async function getUsed(env: Env, clientId: string): Promise<number> {
  const raw = await env.TIDY_QUOTA.get(key(clientId));
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function getRemaining(env: Env, clientId: string): Promise<number> {
  const used = await getUsed(env, clientId);
  return Math.max(0, limitFromEnv(env) - used);
}

export async function consumeOne(env: Env, clientId: string): Promise<{ ok: true; remaining: number } | { ok: false; remaining: 0 }> {
  const used = await getUsed(env, clientId);
  const limit = limitFromEnv(env);
  if (used >= limit) return { ok: false, remaining: 0 };
  const next = used + 1;
  await env.TIDY_QUOTA.put(key(clientId), String(next), { expirationTtl: TTL_SECONDS });
  return { ok: true, remaining: Math.max(0, limit - next) };
}
