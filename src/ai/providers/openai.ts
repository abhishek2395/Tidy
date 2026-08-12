// BYOK OpenAI provider — extension-side direct fetch to api.openai.com.
//
// Uses the chat completions endpoint (widely supported, works with any
// OpenAI-compatible key). Default model is gpt-4o-mini — cheap, fast, and
// good enough for transform tasks.

import { type Provider, type ProviderRequest, type ProviderResponse, ProviderError } from './types';

const URL_CHAT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

export function createOpenAIProvider(apiKey: string, model = DEFAULT_MODEL): Provider {
  return {
    id: 'openai',
    name: 'OpenAI',
    modelId: model,
    async call(req: ProviderRequest): Promise<ProviderResponse> {
      const body = {
        model,
        max_tokens: req.maxOutputTokens ?? 1024,
        temperature: req.temperature ?? 0.4,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
      };

      const res = await fetch(URL_CHAT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await safeErrorSnippet(res);
        throw new ProviderError(res.status, `OpenAI ${res.status}${detail ? ': ' + detail : ''}`);
      }

      const json = (await res.json()) as OpenAIResponse;
      const output = json.choices?.[0]?.message?.content ?? '';
      if (!output) throw new ProviderError(502, 'OpenAI returned empty output');
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

interface OpenAIResponse {
  choices?: Array<{
    message?: { role: string; content: string };
  }>;
}
