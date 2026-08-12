// Build-time runtime config. Vite replaces `import.meta.env.DEV` at build time,
// so this file compiles to a static constant with no runtime overhead.

/**
 * Base URL for the Tidy AI proxy Worker.
 *
 * Sourced from the VITE_WORKER_URL env var, which lets us switch between
 * local wrangler and the deployed Worker WITHOUT a code change.
 *
 * - Local dev: create a `.env.local` at the repo root with
 *     VITE_WORKER_URL=http://127.0.0.1:8787
 *   (that file is gitignored; safe to commit machine-specific overrides)
 * - Production build: leave VITE_WORKER_URL unset — falls through to the
 *   deployed Cloudflare URL below.
 *
 * IMPORTANT: whatever URL is used here MUST also appear in
 * `manifest.config.ts`'s `host_permissions` array — Chrome MV3 requires
 * explicit host permission for extension network requests. localhost and
 * the workers.dev subdomain are both listed there today.
 *
 * Why not `import.meta.env.DEV`? DEV is `true` only during `vite dev`
 * (HMR server) — it is `false` during `vite build`, even when we're
 * building for local unpacked loading. Using DEV here bakes the prod
 * URL into every unpacked build → all fetches 404 in local testing.
 */
export const WORKER_BASE_URL: string =
  (import.meta.env.VITE_WORKER_URL as string | undefined) ??
  'https://tidy-api.wobble.workers.dev';

/**
 * The X-Tidy-Version header value. Bumped on protocol changes so the Worker
 * can deprecate old clients.
 */
export const CLIENT_VERSION = '0.3.0';

/**
 * chrome.storage.local key used to cache the last known quota state
 * so the chip footer has something to show instantly on open.
 */
export const QUOTA_CACHE_KEY = 'tidy:quota_cache';

export interface QuotaCache {
  remaining: number;
  limit: number;
  ts: number; // epoch ms
}
