// Bring-Your-Own-Key config. Stored in chrome.storage.sync so it follows
// the user across their signed-in Chrome installs.
//
// Privacy contract: when a valid BYOK config is present, the extension calls
// the provider directly and NEVER touches our Worker. Enforced by the SW
// router in src/background/service-worker.ts.

export type ProviderId = 'gemini' | 'anthropic' | 'openai';

export const PROVIDERS: ReadonlyArray<{ id: ProviderId; label: string; keyHint: string }> = [
  { id: 'gemini',    label: 'Google Gemini',    keyHint: 'AIza…' },
  { id: 'anthropic', label: 'Anthropic Claude', keyHint: 'sk-ant-…' },
  { id: 'openai',    label: 'OpenAI',           keyHint: 'sk-…' },
];

export interface ByokConfig {
  provider: ProviderId;
  apiKey: string;
}

const STORAGE_KEY = 'tidy:byok';

/** Return the persisted BYOK config, or null if none set / invalid. */
export function getByok(): Promise<ByokConfig | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const v = result?.[STORAGE_KEY];
      if (isValidConfig(v)) {
        resolve({ provider: v.provider, apiKey: v.apiKey.trim() });
      } else {
        resolve(null);
      }
    });
  });
}

/** Persist a BYOK config. Trims whitespace. Rejects visibly invalid keys. */
export async function setByok(config: ByokConfig): Promise<void> {
  const trimmed = { provider: config.provider, apiKey: config.apiKey.trim() };
  if (!isValidConfig(trimmed)) {
    throw new Error('Invalid BYOK config');
  }
  return new Promise((resolve) =>
    chrome.storage.sync.set({ [STORAGE_KEY]: trimmed }, () => resolve())
  );
}

/** Remove the persisted BYOK config. */
export function clearByok(): Promise<void> {
  return new Promise((resolve) =>
    chrome.storage.sync.remove(STORAGE_KEY, () => resolve())
  );
}

/**
 * Hard save-gate: the minimum a string must look like to plausibly be an
 * API key at all. Catches accidental empty/short/whitespace-only pastes.
 * The provider is the real authenticator — a wrong key returns 401 which
 * we surface as an upstream_error.
 */
export function keyLooksSensible(key: string): boolean {
  const k = key.trim();
  return k.length >= 20 && !/\s/.test(k);
}

/**
 * Informational: does the key match the canonical prefix for this provider?
 * Used for a soft warning in the popup — NOT a save gate. Users with older
 * key formats or Vertex-issued keys should still be able to save.
 */
export function keyMatchesExpectedFormat(provider: ProviderId, key: string): boolean {
  const k = key.trim();
  switch (provider) {
    case 'gemini':    return k.startsWith('AIza');
    case 'anthropic': return k.startsWith('sk-ant-');
    case 'openai':    return k.startsWith('sk-');
  }
}

function isValidConfig(v: unknown): v is ByokConfig {
  if (!v || typeof v !== 'object') return false;
  const cfg = v as Partial<ByokConfig>;
  return (
    (cfg.provider === 'gemini' || cfg.provider === 'anthropic' || cfg.provider === 'openai') &&
    typeof cfg.apiKey === 'string' &&
    keyLooksSensible(cfg.apiKey)
  );
}
