// Mock provider — used when GEMINI_API_KEY is not set (local dev, CI).
// Returns a recognizably canned response so end-to-end wiring is testable
// without spending real API quota.

import type { Provider, ProviderRequest, ProviderResponse } from './types';

export const mockProvider: Provider = {
  id: 'mock',
  async call(req: ProviderRequest): Promise<ProviderResponse> {
    // Tiny artificial delay so callers can observe loading states.
    await new Promise((r) => setTimeout(r, 120));

    // Peek the first line of the user prompt to figure out what transform it is.
    // The prompts in src/prompts.ts always end with `:\n\n<text>`.
    const split = req.user.indexOf('\n\n');
    const body = split >= 0 ? req.user.slice(split + 2) : req.user;

    const lead = (req.system.match(/^You\s+([^.]+?)\./)?.[1] ?? 'transform').slice(0, 80);
    return {
      modelId: 'mock',
      output: `[mock · ${lead}]\n${body}`,
    };
  },
};
