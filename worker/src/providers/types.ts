// Provider adapter contract. Each AI provider implements this minimum surface.

export interface ProviderRequest {
  system: string;
  user: string;
  // Provider-agnostic knobs. Subset of typical params; map to provider specifics inside.
  maxOutputTokens?: number;
  temperature?: number;
}

export interface ProviderResponse {
  output: string;
  modelId: string; // what we actually called (e.g. "gemini-2.5-flash-lite" or "mock")
}

export interface Provider {
  readonly id: string;
  call(req: ProviderRequest): Promise<ProviderResponse>;
}
