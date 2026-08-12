// Factory: given a BYOK config, return a Provider instance.

import type { ByokConfig } from '../../lib/byok';
import { createGeminiProvider } from './gemini';
import { createAnthropicProvider } from './anthropic';
import { createOpenAIProvider } from './openai';
import type { Provider } from './types';

export function providerFromByok(cfg: ByokConfig): Provider {
  switch (cfg.provider) {
    case 'gemini':    return createGeminiProvider(cfg.apiKey);
    case 'anthropic': return createAnthropicProvider(cfg.apiKey);
    case 'openai':    return createOpenAIProvider(cfg.apiKey);
  }
}
