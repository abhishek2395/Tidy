// System + user prompts per AI transform.
// Version-stamped so we can A/B improve them without shipping a new extension.
// Tone notes match the Wobble voice: warm, never corporate.

import type { AiTransformKey } from './types';

export const PROMPT_VERSION = '2026-05-19.v1';

interface Prompt {
  system: string;
  build: (text: string) => string;
}

const SHARED_RULES = `Rules:
- Output ONLY the transformed text. No preamble, no commentary, no quotes around your answer.
- Preserve the original language. Don't translate.
- Preserve any code blocks or technical jargon verbatim unless explicitly asked to change them.
- Never add fictional information.`;

export const PROMPTS: Record<AiTransformKey, Prompt> = {
  polish: {
    system: `You fix grammar, spelling, and clarity while preserving the writer's tone and intent. ${SHARED_RULES}`,
    build: (text) => `Polish this text:\n\n${text}`,
  },
  concise: {
    system: `You shorten text to its essential meaning while keeping the original tone. Aim for ~50% of the original length. ${SHARED_RULES}`,
    build: (text) => `Make this more concise:\n\n${text}`,
  },
  professional: {
    system: `You rewrite text in a formal, professional tone suitable for business communication. Remove slang and casual phrasing. ${SHARED_RULES}`,
    build: (text) => `Rewrite this in a professional tone:\n\n${text}`,
  },
  friendly: {
    system: `You rewrite text in a warm, conversational tone. Use contractions, casual phrasing, and a friendly voice. ${SHARED_RULES}`,
    build: (text) => `Rewrite this in a friendly, casual tone:\n\n${text}`,
  },
  summarize: {
    system: `You produce a TL;DR summary of the text — 1 to 3 sentences capturing the main points. ${SHARED_RULES}`,
    build: (text) => `Summarize this:\n\n${text}`,
  },
};

export function isValidTransform(key: string): key is AiTransformKey {
  return Object.prototype.hasOwnProperty.call(PROMPTS, key);
}
