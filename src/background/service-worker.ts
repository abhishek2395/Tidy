// Service worker — runs in the extension's background context.
//
// Responsibilities:
//   1. Listen for the keyboard command "open-tidy" → tell active tab to show chip.
//   2. Handle transform-ai messages from the content script:
//      - Look up client_id
//      - POST to Worker /v1/transform
//      - Cache the returned quota_remaining for the next chip open
//      - Return a typed TransformAiResponse
//   3. Handle quota-fetch messages: return cached-then-refresh via /v1/quota
//
// Privacy: this worker is the ONE fetch call surface for the free tier.
// Clipboard text goes: content-script → SW (in-process message) → Worker.
// The SW never persists text; never writes it to storage; never logs it.

import { getClientId } from '../lib/client-id';
import { WORKER_BASE_URL, CLIENT_VERSION, QUOTA_CACHE_KEY, type QuotaCache } from '../lib/config';
import type {
  ExtensionMessage,
  TransformAiRequest,
  TransformAiResponse,
  QuotaFetchResponse,
  TransformAiErrorReason,
} from '../types';

// -----------------------------------------------------------------------------
// Keyboard shortcut → open chip
// -----------------------------------------------------------------------------

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-tidy') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'open-chip' } satisfies ExtensionMessage);
  } catch (err) {
    // Content script not present (chrome:// pages, Web Store, file pages, etc.).
    console.debug('[tidy] no content script on this tab', err);
  }
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.info('[tidy] installed');
  }
});

// -----------------------------------------------------------------------------
// Message router — content-script → SW
// -----------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message?.type === 'transform-ai') {
    void handleTransformAi(message).then(sendResponse);
    return true; // async response
  }
  if (message?.type === 'quota-fetch') {
    void handleQuotaFetch().then(sendResponse);
    return true;
  }
  return false;
});

// -----------------------------------------------------------------------------
// Worker calls
// -----------------------------------------------------------------------------

async function handleTransformAi(req: TransformAiRequest): Promise<TransformAiResponse> {
  const clientId = await getClientId();
  const url = `${WORKER_BASE_URL}/v1/transform`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-tidy-version': CLIENT_VERSION,
      },
      body: JSON.stringify({
        transform: req.transform,
        text: req.text,
        client_id: clientId,
      }),
    });
  } catch (err) {
    console.debug('[tidy] transform network err', err);
    return {
      ok: false,
      reason: 'network_error',
      message: "Can't reach the Tidy proxy. Check your connection or try again.",
      status: 0,
    };
  }

  const body = await parseJsonSafe(res);

  if (res.ok && body && typeof body === 'object' && 'output' in body) {
    const success = body as {
      output: string;
      transform: TransformAiRequest['transform'];
      model: string;
      quota_remaining: number;
      quota_limit: number;
      latency_ms: number;
    };
    // Cache quota so the next chip open shows accurate footer instantly.
    await cacheQuota({
      remaining: success.quota_remaining,
      limit: success.quota_limit,
      ts: Date.now(),
    });
    return {
      ok: true,
      output: success.output,
      transform: success.transform,
      model: success.model,
      quota_remaining: success.quota_remaining,
      quota_limit: success.quota_limit,
      latency_ms: success.latency_ms,
    };
  }

  // Error path — normalize the Worker's { error, reason, hint } shape.
  const reason = pickReason(body, res.status);
  const errMsg = pickMessage(body, res.status);
  const hint = pickHint(body);

  // Special case: when the Worker returns 429, quota_remaining is implicitly 0.
  if (reason === 'quota_exceeded') {
    await cacheQuota({ remaining: 0, limit: (await readCachedQuota())?.limit ?? 5, ts: Date.now() });
  }

  return { ok: false, reason, message: errMsg, status: res.status, hint };
}

async function handleQuotaFetch(): Promise<QuotaFetchResponse> {
  const cached = await readCachedQuota();
  // Kick off a refresh in the background; return cached immediately.
  void refreshQuotaInBackground();

  if (cached) {
    return { ok: true, remaining: cached.remaining, limit: cached.limit, fromCache: true };
  }
  // No cache — do a synchronous fetch instead of returning zeros.
  const fresh = await fetchQuota();
  return fresh ?? { ok: false, remaining: 0, limit: 5, fromCache: false };
}

async function refreshQuotaInBackground() {
  const fresh = await fetchQuota();
  if (fresh) await cacheQuota({ remaining: fresh.remaining, limit: fresh.limit, ts: Date.now() });
}

async function fetchQuota(): Promise<QuotaFetchResponse | null> {
  const clientId = await getClientId();
  try {
    const res = await fetch(`${WORKER_BASE_URL}/v1/quota?client_id=${encodeURIComponent(clientId)}`, {
      headers: { 'x-tidy-version': CLIENT_VERSION },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { remaining: number; limit: number };
    if (typeof body?.remaining !== 'number' || typeof body?.limit !== 'number') return null;
    return { ok: true, remaining: body.remaining, limit: body.limit, fromCache: false };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Quota cache — chrome.storage.local (per-device, no cross-device sync needed)
// -----------------------------------------------------------------------------

function cacheQuota(q: QuotaCache): Promise<void> {
  return new Promise((resolve) =>
    chrome.storage.local.set({ [QUOTA_CACHE_KEY]: q }, () => resolve())
  );
}

function readCachedQuota(): Promise<QuotaCache | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(QUOTA_CACHE_KEY, (result) => {
      const q = result?.[QUOTA_CACHE_KEY];
      if (q && typeof q.remaining === 'number' && typeof q.limit === 'number') {
        resolve(q as QuotaCache);
      } else {
        resolve(null);
      }
    });
  });
}

// -----------------------------------------------------------------------------
// Response-body helpers
// -----------------------------------------------------------------------------

async function parseJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function pickReason(body: unknown, status: number): TransformAiErrorReason {
  if (body && typeof body === 'object' && 'reason' in body) {
    const r = (body as { reason?: unknown }).reason;
    if (typeof r === 'string' && KNOWN_REASONS.has(r as TransformAiErrorReason)) {
      return r as TransformAiErrorReason;
    }
  }
  // Fall back based on status
  if (status === 429) return 'quota_exceeded';
  if (status === 413) return 'too_large';
  if (status >= 500) return 'upstream_error';
  return 'internal_error';
}

function pickMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const m = (body as { error?: unknown }).error;
    if (typeof m === 'string') return m;
  }
  return `Transform failed (HTTP ${status}).`;
}

function pickHint(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'hint' in body) {
    const h = (body as { hint?: unknown }).hint;
    if (typeof h === 'string') return h;
  }
  return undefined;
}

const KNOWN_REASONS = new Set<TransformAiErrorReason>([
  'quota_exceeded',
  'invalid_transform',
  'missing_text',
  'too_large',
  'invalid_client_id',
  'invalid_json',
  'upstream_error',
  'internal_error',
  'network_error',
  'unknown_route',
]);
