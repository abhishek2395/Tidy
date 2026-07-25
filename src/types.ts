// Shared types across background, content, and popup contexts.

export type TransformKey =
  | 'clean'
  | 'extract'
  | 'polish'
  | 'concise'
  | 'professional'
  | 'friendly'
  | 'summarize';

/** Just the AI-backed subset — used for Worker routing. */
export type AiTransformKey = 'polish' | 'concise' | 'professional' | 'friendly' | 'summarize';

export interface Transform {
  key: TransformKey;
  label: string;
  shortcut: string; // single uppercase letter
  icon: string;
  ai: boolean;
}

export interface CursorAnchor {
  x: number;
  y: number;
}

// -----------------------------------------------------------------------------
// Messages: content-script → service-worker (AI transform request/response)
// -----------------------------------------------------------------------------

export interface TransformAiRequest {
  type: 'transform-ai';
  transform: AiTransformKey;
  text: string;
}

/** Reason codes must stay in sync with worker/src/transform.ts errorResponse calls. */
export type TransformAiErrorReason =
  | 'quota_exceeded'
  | 'invalid_transform'
  | 'missing_text'
  | 'too_large'
  | 'invalid_client_id'
  | 'invalid_json'
  | 'upstream_error'
  | 'internal_error'
  | 'network_error'
  | 'unknown_route';

export interface TransformAiSuccess {
  ok: true;
  output: string;
  transform: AiTransformKey;
  model: string;
  quota_remaining: number;
  quota_limit: number;
  latency_ms: number;
}

export interface TransformAiFailure {
  ok: false;
  reason: TransformAiErrorReason;
  message: string;
  status?: number;   // HTTP status returned by Worker (or 0 on network failure)
  hint?: string;     // Optional user-facing hint (e.g. "Add your own API key…")
}

export type TransformAiResponse = TransformAiSuccess | TransformAiFailure;

// -----------------------------------------------------------------------------
// Messages: content-script ↔ service-worker (quota fetch, general)
// -----------------------------------------------------------------------------

export interface QuotaFetchRequest {
  type: 'quota-fetch';
}

export interface QuotaFetchResponse {
  ok: boolean;
  remaining: number;
  limit: number;
  fromCache?: boolean; // true if we returned last-known before hitting Worker
}

// -----------------------------------------------------------------------------
// Messages: service-worker → content-script (open the chip)
// -----------------------------------------------------------------------------

export type ExtensionMessage =
  | { type: 'open-chip'; clientX?: number; clientY?: number }
  | { type: 'close-chip' }
  | { type: 'ping' }
  | TransformAiRequest
  | QuotaFetchRequest;
