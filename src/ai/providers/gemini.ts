// BYOK Gemini provider — extension-side direct fetch.
// Same shape as worker/src/providers/gemini.ts, but the key comes from
// chrome.storage.sync and the request originates in the SW.

import { type Provider, type ProviderRequest, type ProviderResponse, ProviderError } from './types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
// gemini-2.5-flash: current-gen production, GA, broadly available.
// Previously used -flash-lite which Google is EOLing for new users.
const DEFAULT_MODEL = 'gemini-2.5-flash';

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
