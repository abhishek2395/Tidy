// Clean — strip formatting, normalize whitespace and quotes. Instant, no AI.
//
// Conservative: never changes meaning. Never re-flows paragraphs.
// Used when the user pasted something messy (rich HTML, smart quotes, ragged
// newlines from a PDF) and wants the plain text version.

const SMART_QUOTES_DOUBLE = /[“”„‟″‶]/g; // “ ” „ ‟ ″ ‶
const SMART_QUOTES_SINGLE = /[‘’‚‛′‵]/g; //  ‘ ’ ‚ ‛ ′ ‵
const ZERO_WIDTH = /[​-‍﻿⁠]/g;
const NBSP = / /g;
const ELLIPSIS = /…/g;
const TAGS = /<\/?[a-z][^>]*>/gi;
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&hellip;': '...',
  '&mdash;': '—',
  '&ndash;': '–',
};

export interface CleanResult {
  output: string;
  before: number;
  after: number;
  changes: string[]; // small list of what happened, for UI hint
}

export function clean(input: string): CleanResult {
  const before = input.length;
  let s = input;
  const changes: string[] = [];

  // 1. Strip HTML tags + decode common entities (handles rich-text pastes)
  if (TAGS.test(s)) {
    s = s.replace(TAGS, '');
    changes.push('stripped HTML');
  }
  TAGS.lastIndex = 0;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    s = s.replaceAll(entity, char);
  }

  // 2. Strip zero-width chars (invisible junk from copy-paste)
  if (ZERO_WIDTH.test(s)) {
    s = s.replace(ZERO_WIDTH, '');
    changes.push('removed invisible characters');
  }
  ZERO_WIDTH.lastIndex = 0;

  // 3. Normalize unicode whitespace + common typography
  s = s.replace(NBSP, ' ');
  let hadSmartQuotes = false;
  s = s.replace(SMART_QUOTES_DOUBLE, () => {
    hadSmartQuotes = true;
    return '"';
  });
  s = s.replace(SMART_QUOTES_SINGLE, () => {
    hadSmartQuotes = true;
    return "'";
  });
  if (hadSmartQuotes) changes.push('straightened quotes');
  s = s.replace(ELLIPSIS, '...');

  // 4. Normalize line endings
  s = s.replace(/\r\n?/g, '\n');

  // 5. Trim trailing whitespace from each line
  s = s
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/g, ''))
    .join('\n');

  // 6. Collapse runs of spaces/tabs to a single space
  const before6 = s;
  s = s.replace(/[\t ]{2,}/g, ' ');
  if (s !== before6) changes.push('collapsed double spaces');

  // 7. Collapse 3+ consecutive newlines to a paragraph break (2 newlines)
  const before7 = s;
  s = s.replace(/\n{3,}/g, '\n\n');
  if (s !== before7) changes.push('tightened blank lines');

  // 8. Final trim of leading/trailing whitespace
  s = s.trim();

  return {
    output: s,
    before,
    after: s.length,
    changes,
  };
}
