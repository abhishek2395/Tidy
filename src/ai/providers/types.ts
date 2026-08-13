// Extension-side provider adapter contract. Each BYOK provider implements
// this minimum surface. Mirrors worker/src/providers/types.ts so future
// consolidation is easy.

export interface ProviderRequest {
  system: string;
  user: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface ProviderResponse {
  output: string;
  modelId: string;
}

export interface Provider {
  readonly id: string;   // provider id used in logs/UI (e.g. "gemini")
  readonly name: string; // human-friendly (e.g. "Google Gemini")
  readonly modelId: string; // specific model used (e.g. "gemini-2.5-flash")
  call(req: ProviderRequest): Promise<ProviderResponse>;
}

/**
 * Wraps provider errors with a normalized shape the SW can map to a
 * TransformAiErrorReason. Message is safe to surface — no key material,
 * no user text.
 *
 * Written without parameter-property shorthand so it compiles under
 * `erasableSyntaxOnly`.
 */
export class ProviderError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.code = code;
  }
}
