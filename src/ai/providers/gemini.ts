// BYOK Gemini provider — extension-side direct fetch.
// Same shape as worker/src/providers/gemini.ts, but the key comes from
// chrome.storage.sync and the request originates in the SW.

import { type Provider, type ProviderRequest, type ProviderResponse, ProviderError } from './types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Alias — auto-tracks Google's current flash model so a deprecation of
// any specific version (gemini-2.5-flash / -lite / -3.5-flash-lite / etc.)
// doesn't break Tidy. Trade-off: model behavior can shift when Google
// moves the alias. Acceptable for transform tasks; v1.1 will expose an
// override in settings for users who want to pin.
const DEFAULT_MODEL = 'gemini-flash-latest';

export function createGeminiProvider(apiKey: string, model = DEFAULT_MODEL): Provider {
  return {
    id: 'gemini',
    name: 'Google Gemini',
    modelId: model,
    async call(req: ProviderRequest): Promise<ProviderResponse> {
      const url = `${BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const body = {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.user }] }],
        generationConfig: {
          maxOutputTokens: req.maxOutputTokens ?? 1024,
          temperature: req.temperature ?? 0.4,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await safeErrorSnippet(res);
        throw new ProviderError(res.status, `Gemini ${res.status}${detail ? ': ' + detail : ''}`);
      }

      const json = (await res.json()) as GeminiResponse;
      const output = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!output) throw new ProviderError(502, 'Gemini returned empty output');
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

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}
