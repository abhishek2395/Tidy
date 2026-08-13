// BYOK Anthropic provider — extension-side direct fetch to api.anthropic.com.
//
// Notes:
// - The `anthropic-dangerous-direct-browser-access` header is required for
//   browser-origin requests. Extension SW fetches count for CORS purposes;
//   Anthropic's docs recommend the header even so.
// - Model default is Claude 3.5 Haiku — cheapest current-gen tier with
//   good quality for transform-shaped tasks. Users can override in v1.1.

import { type Provider, type ProviderRequest, type ProviderResponse, ProviderError } from './types';

const URL_MESSAGES = 'https://api.anthropic.com/v1/messages';
// Alias — resolves to claude-haiku-4-5-20251001 today. Auto-follows future
// Haiku releases without a code change. See platform.claude.com/docs
// /en/about-claude/models for current alias table.
const DEFAULT_MODEL = 'claude-haiku-4-5';
const API_VERSION = '2023-06-01';

export function createAnthropicProvider(apiKey: string, model = DEFAULT_MODEL): Provider {
  return {
    id: 'anthropic',
    name: 'Anthropic Claude',
    modelId: model,
    async call(req: ProviderRequest): Promise<ProviderResponse> {
      const body = {
        model,
        max_tokens: req.maxOutputTokens ?? 1024,
        temperature: req.temperature ?? 0.4,
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
      };

      const res = await fetch(URL_MESSAGES, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await safeErrorSnippet(res);
        throw new ProviderError(res.status, `Anthropic ${res.status}${detail ? ': ' + detail : ''}`);
      }

      const json = (await res.json()) as AnthropicResponse;
      const output = json.content?.[0]?.text ?? '';
      if (!output) throw new ProviderError(502, 'Anthropic returned empty output');
      return { modelId: model, output: output.trim() };
    },
  };
}

async function safeErrorSnippet(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.slice(0, 160).replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
}
