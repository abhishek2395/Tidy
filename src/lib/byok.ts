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
 * Sanity check on an API key's shape. NOT authentication — just catches
 * obvious paste errors before a request is made. The provider is the real
 * validator; a call with a wrong key returns 401 which we surface as an
 * upstream_error.
 */
export function looksValidKey(provider: ProviderId, key: string): boolean {
  const k = key.trim();
  if (k.length < 20) return false;
  switch (provider) {
    case 'gemini':    return k.startsWith('AIza')    && k.length >= 35;
    case 'anthropic': return k.startsWith('sk-ant-') && k.length >= 40;
    case 'openai':    return k.startsWith('sk-')     && k.length >= 30;
  }
}

function isValidConfig(v: unknown): v is ByokConfig {
  if (!v || typeof v !== 'object') return false;
  const cfg = v as Partial<ByokConfig>;
  return (
    (cfg.provider === 'gemini' || cfg.provider === 'anthropic' || cfg.provider === 'openai') &&
    typeof cfg.apiKey === 'string' &&
    cfg.apiKey.trim().length >= 20
  );
}
