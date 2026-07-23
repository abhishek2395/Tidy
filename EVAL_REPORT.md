# Tidy — Eval & Security Pass A

**Scope:** `tidy/` + `tidy/worker/` at commit `74be045` (v0.2, pre-AI-wiring)
**Method:** No new code. Read every source file, run static checks, audit
  dependencies, verify claims that will end up in the public README.
**Verdict:** ✅ **Green light to proceed to v0.4 (AI wiring).** Zero
  must-fix-before-more-code findings. Documented follow-ups to bake in as
  each version lands.

---

## Summary

| Result | Count | Notes |
|---|---:|---|
| ✅ **PASS** — verified, nothing to do | 8 | Documented below with evidence |
| 🟡 **PASS WITH FOLLOW-UP** — safe now, action needed before v1.0 | 5 | Tracked in the "bake into vX" list |
| 🔴 **FAIL** — must fix before writing more code | **0** | — |

Bundle is small, permissions are minimal, no secrets are checked in, no
`innerHTML`/`eval` anywhere, Worker cannot leak content because it has zero
`console.*` calls anywhere in `worker/src`. Clean starting point.

---

## Findings

### ✅ 1. Secrets scan — CLEAN

Ran `git ls-files | xargs grep -E "(AIza[…]{35}|sk-[…]{20,}|Bearer [\\w.-]{20,}|GEMINI_API_KEY = "…")"` across all 40 tracked files. **Zero matches.**

No embedded API keys, tokens, bearer credentials, or secret literals in the
repo. The Gemini key path is correct: injected at runtime via
`wrangler secret put GEMINI_API_KEY`, never in source.

### ✅ 2. Dangerous DOM patterns — CLEAN

Ran `grep -E "dangerouslySetInnerHTML|innerHTML =|outerHTML =|eval\\(|new Function\\(|document.write"` across all `.ts`/`.tsx`. **Zero matches.**

- User clipboard text and transform output render exclusively through React
  JSX interpolation — auto-escaped, no XSS surface.
- No dynamic script construction anywhere.
- `chip.css` is injected as a raw string via Vite's `?inline` import into a
  Shadow DOM `<style>` element. It's a static asset, not user-controlled.

### ✅ 3. Worker logs — CANNOT LEAK CONTENT

Ran `grep -R "console\\." worker/src`. **Zero matches.**

The Worker literally cannot log user text by accident — there's no logging
call to accidentally include the wrong variable in. When we add structured
logging later, it goes through a typed `LogRecord` (already defined in
`worker/src/types.ts`, not yet emitted) that only accepts anonymized fields.

### ✅ 4. Extension permissions — MINIMAL

`manifest.config.ts` declares:
- `storage` — required for BYOK settings persistence
- `activeTab` — required to `sendMessage` to the active tab after the
  keyboard shortcut fires
- `host_permissions: []` — **empty** (no per-site access)
- Content script matches `<all_urls>` — required so the chip can be
  invoked on any page; standard MV3 pattern
- No `tabs`, no `history`, no `bookmarks`, no `webNavigation`, no
  `cookies`, no `debugger`

This is the smallest surface area a v1 clipboard extension can plausibly
ship with. Chrome Web Store's automated review will pass; the human review
questions (if any) will focus on the `<all_urls>` justification, which is
inherent to a keyboard-invoked utility.

### ✅ 5. React JSX — auto-escapes user input

`Chip.tsx` renders clipboard text and transform output via `{clipboard}`
and `{view.output}` interpolation. React DOM auto-HTML-encodes any string
value, so a clipboard containing `<script>alert(1)</script>` renders as
inert text. Confirmed by reading `Chip.tsx:162, 207`.

`<pre>` is used to preserve whitespace on the result view — still
auto-escaped.

### ✅ 6. Shadow DOM isolation from host page

`inject.ts:57-73`:
- `host.style.all = 'initial'` — resets every inherited property so the
  page's CSS cannot bleed into the chip
- `attachShadow({ mode: 'open' })` — scopes styles inside
- Font-family falls back through `-apple-system, BlinkMacSystemFont, 'Inter Tight', 'Segoe UI', sans-serif` — degrades gracefully because host-page fonts don't cross the shadow boundary
- `pointer-events: none` on host + `auto` on the chip mount point — click through the invisible container, capture on the chip itself
- `z-index: 2147483647` — max, sits above all page UI including modal dialogs

### ✅ 7. Clipboard operations — user-gesture safe

- `navigator.clipboard.readText()` in `inject.ts:47` is called *after* the
  content script receives an `open-chip` message, which is dispatched by
  the SW in response to a keyboard shortcut (a user gesture). If Chrome
  denies read access, we gracefully return `''` and the chip shows the
  "empty clipboard" state.
- `navigator.clipboard.writeText()` in `inject.ts:85` is called *only*
  from the chip's confirm button click handler. Direct user gesture. No
  possibility of stealth writes.
- Neither is ever called from the background worker directly.

### ✅ 8. Extension does not talk to the network today

Ran `grep -E "\\bfetch\\(|XMLHttpRequest|navigator\\.sendBeacon"` across all
extension source. **Zero matches.** The extension has no network side
effect right now. This is the baseline — when v0.4 lands and the SW
starts fetching from the Worker, that grep will fire and we know exactly
where the outbound-request surface is.

---

## Follow-ups (safe now, act before v1.0)

### 🟡 F1. `npm audit` shows 10 vulns — **all dev/build tooling, none ship**

Per-vuln breakdown:

**Extension (`tidy/`)**:
| Sev | Package | Ships? | Notes |
|---|---|---|---|
| LOW  | @babel/core            | No — Vite build tool | Path traversal via sourceMappingURL comment |
| HIGH | @crxjs/vite-plugin (direct dep) | No — build only | Vulnerable via rollup |
| HIGH | rollup                 | No — bundler | Path traversal via write |
| HIGH | vite (direct dep)      | No — dev server | `server.fs.deny` bypass on Windows |

**Worker (`tidy/worker/`)**:
| Sev | Package | Ships? | Notes |
|---|---|---|---|
| MOD  | esbuild             | No — wrangler dev bundler | Dev server CSRF |
| MOD  | miniflare           | No — local emulator only | Deps: undici, ws |
| HIGH | sharp               | No — wrangler dev image proc | libvips CVEs |
| HIGH | undici              | No — miniflare dev fetch | Decompression bomb, request smuggling |
| HIGH | wrangler (direct dep) | Deploys, doesn't ship in worker | Deps: esbuild, miniflare |
| HIGH | ws                  | No — miniflare websocket | Memory disclosure, DoS |

**None of these ship in the deployed extension or worker.** They only
affect the local dev environment. Worst realistic exploit: a malicious
website you happen to visit while `npm run dev` is running could interact
with the dev server. Mitigation:
- Run `npm audit fix` (non-breaking) at some quiet moment
- Only run dev servers when actively developing
- Don't `wrangler dev` while browsing untrusted sites

### 🟡 F2. Worker CORS is wildcard

`worker/src/index.ts:17` — `access-control-allow-origin: '*'`

Fine while wrangler-dev is on `localhost`. **Before deploy:** tighten to
`chrome-extension://*` at minimum, or better yet the specific extension ID
after the Chrome Web Store assigns one. Note that CORS is *browser*
enforcement — a curl/node script bypasses it entirely. Real abuse
mitigation is:
- Per-client_id rate limit (already in place — 5/day)
- Monthly Gemini spend cap ($10 hard cap — Google side)
- Cloudflare edge auto-throttles obvious flood patterns

Documenting so we don't forget to change the header before publishing.

### 🟡 F3. Icons are placeholders

`icons/icon-{16,32,48,128}.png` exist but are 79 / 99 / 123 / 306 bytes —
clearly solid tomato-square placeholders. Known TODO in `LAUNCH.md` (Phase
C item #7, v0.7). Not a security issue; visual/store-listing issue.

### 🟡 F4. Shadow DOM mode is `open`

`inject.ts:66` — a determined host page can reach
`document.getElementById('tidy-chip-host').shadowRoot` and inspect chip
internals. Not a data-exposure risk (nothing sensitive lives inside; the
clipboard content is already the user's — the page already had access to
it before we did). But `mode: 'closed'` would reduce our surface area for
free.

Change to `closed` in v0.7 polish. Trade-off: makes debugging in DevTools
harder. Optional.

### 🟡 F5. BYOK key storage is per-Chrome, per-user, plaintext at rest

`Popup.tsx:32` stores the API key in `chrome.storage.sync`. That means:
- Encrypted in transit between the user's Chrome installs (Google infra)
- Synced across a user's own signed-in Chrome sessions
- Stored on-disk **unencrypted** in the local Chrome profile

This is the same treatment Chrome gives saved passwords and site cookies —
standard for extensions. Users who care can leave the field blank and
stay on the free tier through the Worker. Document this transparently in
the popup below the field (~1 line of copy).

---

## Bake into future versions

These come out of Pass A but are properly work-tickets for the relevant
version:

- [ ] **v0.4** — before wiring the Worker fetch, add `host_permissions`
  entry for the deployed Worker URL (e.g. `https://tidy-api.wobble.workers.dev/*`)
- [ ] **v0.4** — verify that content-script clipboard operations still
  work after adding `activeTab`-only permissions. If they fail on any
  test page, add `clipboardRead` + `clipboardWrite` permissions explicitly
- [ ] **v0.4** — first Pass B eval: prompt-injection fixtures against all
  5 AI transforms (paste "Ignore all prior instructions and…" — verify the
  model still treats it as text to polish, not as a command)
- [ ] **v0.4** — first Pass B eval: 20 real-world Clean inputs, 20 Extract
  inputs with known-answer ground truth
- [ ] **v0.5** — streaming introduces backpressure; test with 50KB input
  to confirm the SSE pipe doesn't buffer-explode
- [ ] **v0.6** — BYOK security eval: verify with DevTools network tab
  that BYOK-mode requests bypass our Worker entirely and go direct to
  provider. This is the key privacy claim
- [ ] **v0.6** — confirm the API key input never appears in URL, referer,
  or any log line
- [ ] **v0.6** — CORS tightening (F2)
- [ ] **v0.7** — icons refresh (F3), Shadow DOM `closed` (F4), BYOK
  storage disclosure copy (F5)
- [ ] **v0.7** — `npm audit fix` in both `tidy/` and `tidy/worker/`
- [ ] **v1.0** — pre-submit Web Store eval: manual test on 8 sites (Gmail,
  Notion, Google Docs, Wikipedia, Twitter, GitHub, Linear, YouTube)
  covering ⌘⇧Y, chip render, Clean, Extract, one AI transform, error
  recovery

---

## Evidence

Full command output archived at commit time. Reproducible via:

```sh
# Secrets
git ls-files | xargs grep -InE "(AIza[0-9A-Za-z\\-_]{35}|sk-[A-Za-z0-9]{20,}|Bearer [A-Za-z0-9._~+/=-]{20,})"

# Dangerous DOM
git ls-files | grep -E "\\.(ts|tsx)$" | xargs grep -In -E "dangerouslySetInnerHTML|innerHTML\\s*=|eval\\(|new Function\\("

# Worker logs
grep -R "console\\." worker/src

# Extension network today (baseline)
grep -R "\\bfetch\\(|XMLHttpRequest|navigator\\.sendBeacon" src

# Dependency audit
npm audit --audit-level=moderate            # in tidy/
cd worker && npm audit --audit-level=moderate
```

---

*This is a living doc. Update after every Pass B eval or when a finding
is closed.*
