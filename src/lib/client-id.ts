// Anonymous client identifier used by the Worker for rate-limit accounting.
//
// - Generated lazily on first read using crypto.randomUUID() (available in
//   MV3 service workers and content scripts).
// - Persisted in chrome.storage.sync so it survives reinstalls of the same
//   Chrome profile and syncs across the user's own signed-in browsers.
// - Not tied to identity: worst case if a user clears it, they get a fresh
//   quota. That's an accepted trade-off (per AI_PROXY_PLAN.md).
//
// Callers should await getClientId() rather than reading storage directly.

const STORAGE_KEY = 'tidy:client_id';

let cached: string | null = null;
let inflight: Promise<string> | null = null;

/**
 * Return the persisted anonymous client id, generating one on first call.
 * Safe to call concurrently — a single generation is de-duped via `inflight`.
 */
export async function getClientId(): Promise<string> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = load().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function load(): Promise<string> {
  const existing = await readStorage();
  if (existing) {
    cached = existing;
    return existing;
  }
  const fresh = crypto.randomUUID();
  await writeStorage(fresh);
  cached = fresh;
  return fresh;
}

function readStorage(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const raw = result?.[STORAGE_KEY];
      resolve(typeof raw === 'string' && raw.length >= 8 && raw.length <= 64 ? raw : null);
    });
  });
}

function writeStorage(value: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: value }, () => resolve());
  });
}

/**
 * Test/debug helper. Not used in production paths. Exposed so we can wipe
 * the id during eval runs.
 */
export async function _resetClientIdForTest(): Promise<void> {
  cached = null;
  await new Promise<void>((resolve) => chrome.storage.sync.remove(STORAGE_KEY, () => resolve()));
}
