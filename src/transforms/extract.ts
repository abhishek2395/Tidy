// Extract — pull structured bits (emails, URLs, phones, dates) out of free text.
// Instant, no AI. Regexes are intentionally simple and conservative; we'd
// rather miss an exotic match than produce false positives.

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const URL = /\bhttps?:\/\/[^\s<>"'()]+/g;
// Phone: US-style (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, +<country>... <10 digits>
const PHONE = /(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/g;
// Dates: YYYY-MM-DD, M/D/YY(YY), Month D, YYYY
const DATE =
  /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:,\s*\d{4})?)\b/g;

export interface ExtractResult {
  emails: string[];
  urls: string[];
  phones: string[];
  dates: string[];
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()))].filter(Boolean);
}

export function extract(input: string): ExtractResult {
  return {
    emails: uniq(input.match(EMAIL) ?? []),
    urls: uniq(input.match(URL) ?? []),
    phones: uniq(input.match(PHONE) ?? []),
    dates: uniq(input.match(DATE) ?? []),
  };
}

export function totalMatches(r: ExtractResult): number {
  return r.emails.length + r.urls.length + r.phones.length + r.dates.length;
}

// Formatted plain text for clipboard + display. Empty categories are omitted.
export function formatExtractResult(r: ExtractResult): string {
  const sections: string[] = [];
  if (r.emails.length) sections.push(`Emails (${r.emails.length}):\n${r.emails.map((e) => `- ${e}`).join('\n')}`);
  if (r.urls.length)   sections.push(`URLs (${r.urls.length}):\n${r.urls.map((u) => `- ${u}`).join('\n')}`);
  if (r.phones.length) sections.push(`Phones (${r.phones.length}):\n${r.phones.map((p) => `- ${p}`).join('\n')}`);
  if (r.dates.length)  sections.push(`Dates (${r.dates.length}):\n${r.dates.map((d) => `- ${d}`).join('\n')}`);
  return sections.join('\n\n');
}

export function summarizeExtractResult(r: ExtractResult): string {
  const bits: string[] = [];
  if (r.emails.length) bits.push(`${r.emails.length} email${r.emails.length === 1 ? '' : 's'}`);
  if (r.urls.length)   bits.push(`${r.urls.length} URL${r.urls.length === 1 ? '' : 's'}`);
  if (r.phones.length) bits.push(`${r.phones.length} phone${r.phones.length === 1 ? '' : 's'}`);
  if (r.dates.length)  bits.push(`${r.dates.length} date${r.dates.length === 1 ? '' : 's'}`);
  return bits.length ? `Found ${bits.join(', ')}` : 'No matches found';
}
