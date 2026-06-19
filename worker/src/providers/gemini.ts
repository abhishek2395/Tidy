// Real Gemini provider. Used when GEMINI_API_KEY is set.
// Calls Generative Language API directly — no SDK to keep the bundle small.
//
// Streaming intentionally not implemented in v0.1 — we add `?alt=sse` and
// stream piping in the next iteration. For now: full JSON response.

import type { Provider, ProviderRequest, ProviderResponse } from './types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function createGeminiProvider(apiKey: string, model: string): Provider {
  return {
    id: model,
    async call(req: ProviderRequest): Promise<ProviderResponse> {
      const url = `${BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const body = {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.user }] }],
        generationConfig: {
          maxOutputTokens: req.maxOutputTokens ?? 1024,
          temperature: req.temperature ?? 0.5,
        },
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`gemini ${res.status}: ${errText.slice(0, 200)}`);
      }
      const json = (await res.json()) as GeminiResponse;
      const output = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!output) throw new Error('gemini returned empty output');
      return { modelId: model, output: output.trim() };
    },
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}
