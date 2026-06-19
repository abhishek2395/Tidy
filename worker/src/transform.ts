// POST /v1/transform — the workhorse endpoint.

import type { Env, TransformRequest, TransformResponse } from './types';
import { isValidTransform, PROMPTS } from './prompts';
import { consumeOne, getRemaining, limitFromEnv } from './quota';
import { mockProvider } from './providers/mock';
import { createGeminiProvider } from './providers/gemini';
import type { Provider } from './providers/types';

const MAX_INPUT_BYTES = 50_000;

export async function handleTransform(request: Request, env: Env): Promise<Response> {
  const started = Date.now();

  let body: TransformRequest;
  try {
    body = (await request.json()) as TransformRequest;
  } catch {
    return errorResponse(400, 'invalid_json', 'Body must be JSON.');
  }

  // Validate shape
  const transform = body?.transform;
  const text = body?.text;
  const clientId = body?.client_id;
  if (typeof transform !== 'string' || !isValidTransform(transform)) {
    return errorResponse(400, 'invalid_transform', `Unknown transform "${String(transform)}".`);
  }
  if (typeof text !== 'string' || text.length === 0) {
    return errorResponse(400, 'missing_text', 'Field "text" is required.');
  }
  if (new TextEncoder().encode(text).byteLength > MAX_INPUT_BYTES) {
    return errorResponse(413, 'too_large', `Input exceeds ${MAX_INPUT_BYTES} bytes.`);
  }
  if (typeof clientId !== 'string' || clientId.length < 8 || clientId.length > 64) {
    return errorResponse(400, 'invalid_client_id', 'Field "client_id" must be 8–64 chars.');
  }

  // Quota: read + consume in one place. KV is eventually consistent so this
  // is a best-effort cap; race-condition drift is acceptable.
  const consumed = await consumeOne(env, clientId);
  if (!consumed.ok) {
    return errorResponse(429, 'quota_exceeded', 'Daily free limit reached.', {
      hint: 'Add your own API key in Tidy settings for unlimited transforms.',
    });
  }

  // Pick the provider. Mock when no key is configured (local dev).
  const provider: Provider =
    env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 0
      ? createGeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite')
      : mockProvider;

  const prompt = PROMPTS[transform];
  try {
    const result = await provider.call({
      system: prompt.system,
      user: prompt.build(text),
      maxOutputTokens: 1024,
      temperature: 0.4,
    });
    const elapsed = Date.now() - started;
    const remaining = await getRemaining(env, clientId);
    const responseBody: TransformResponse = {
      output: result.output,
      transform,
      model: result.modelId,
      quota_remaining: remaining,
      quota_limit: limitFromEnv(env),
      latency_ms: elapsed,
    };
    return jsonResponse(200, responseBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(502, 'upstream_error', 'AI provider rejected the request.', {
      detail: message.slice(0, 200),
    });
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function errorResponse(
  status: number,
  reason: string,
  message: string,
  extra?: Record<string, string>
): Response {
  return jsonResponse(status, { error: message, reason, ...extra });
}
