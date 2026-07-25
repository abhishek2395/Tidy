// Build-time runtime config. Vite replaces `import.meta.env.DEV` at build time,
// so this file compiles to a static constant with no runtime overhead.

/**
 * Base URL for the Tidy AI proxy Worker.
 *
 * - Dev: local wrangler at http://127.0.0.1:8787 (see tidy/worker/README.md)
 * - Prod: TODO — will be filled in when the Worker is deployed to Cloudflare
 *   (Phase D). Placeholder assumes tidy-api.<subdomain>.workers.dev.
 *
 * IMPORTANT: whatever URL is set here MUST also appear in
 * `manifest.config.ts`'s `host_permissions` array — Chrome MV3 requires
 * explicit host permission for extension network requests.
 */
export const WORKER_BASE_URL = import.meta.env.DEV
  ? 'http://127.0.0.1:8787'
  : 'https://tidy-api.wobble.workers.dev';

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
