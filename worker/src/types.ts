// Runtime types for the Tidy AI proxy.

export interface Env {
  TIDY_QUOTA: KVNamespace;
  GEMINI_API_KEY?: string;       // set via `wrangler secret put` in prod; absent in local dev → mock provider
  GEMINI_MODEL?: string;          // wrangler.toml var
  DAILY_FREE_LIMIT?: string;      // wrangler.toml var; parsed as int, default 5
}

export type AiTransformKey =
  | 'polish'
  | 'concise'
  | 'professional'
  | 'friendly'
  | 'summarize';

export interface TransformRequest {
  transform: AiTransformKey;
  text: string;
  client_id: string;
}

export interface TransformResponse {
  output: string;
  transform: AiTransformKey;
  model: string;
  quota_remaining: number;
  quota_limit: number;
  latency_ms: number;
}

export interface ErrorResponse {
  error: string;
  reason: string;
  hint?: string;
}

// What we log per request. Never includes input or output content.
export interface LogRecord {
  ts: string;
  client_hash: string;
  transform: AiTransformKey | 'unknown';
  input_len: number;
  output_len: number;
  latency_ms: number;
  status: number;
  error?: string;
  model: string;
}
